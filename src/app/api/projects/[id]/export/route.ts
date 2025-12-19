import { NextRequest } from 'next/server'
import { addDays, format, startOfDay, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import ExcelJS from 'exceljs'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'
import { getAssigneeColorWithSettings } from '@/lib/colors'
import { AssigneeColorDAL } from '@/dal/assignee-colors'
import { isJapaneseHoliday } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = false

// ローカルのカレンダー日（YYYY-MM-DD）として扱うユーティリティ
function parseDateOnlyToLocal(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }
  const maybe = new Date(input)
  if (!isNaN(maybe.getTime())) {
    return new Date(maybe.getFullYear(), maybe.getMonth(), maybe.getDate())
  }
  const s = (input as string).slice(0, 10)
  const y = Number(s.slice(0, 4))
  const m = Number(s.slice(5, 7)) - 1
  const d = Number(s.slice(8, 10))
  return new Date(y, m, d)
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

const toMonthKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}`

type TimelineUnit = {
  start: Date
  end: Date
  label: string
  weekdayLabel?: string
  monthKey: string
}

function buildTimelineUnits(startDate: Date, endDate: Date, isWeekly: boolean): TimelineUnit[] {
  const units: TimelineUnit[] = []

  if (isWeekly) {
    let weekCursor = startOfWeek(startDate, { weekStartsOn: 1 })
    const lastWeekStart = startOfWeek(endDate, { weekStartsOn: 1 })

    while (weekCursor <= lastWeekStart) {
      const unitStart = startOfDay(weekCursor)
      units.push({
        start: unitStart,
        end: addDays(unitStart, 6),
        label: `${format(unitStart, 'd', { locale: ja })}〜`,
        monthKey: toMonthKey(unitStart),
      })
      weekCursor = addDays(weekCursor, 7)
    }
  } else {
    let dayCursor = startOfDay(startDate)
    while (dayCursor <= endDate) {
      const unitStart = startOfDay(dayCursor)
      units.push({
        start: unitStart,
        end: unitStart,
        label: `${unitStart.getDate()}`,
        weekdayLabel: format(unitStart, 'EEE', { locale: ja }),
        monthKey: toMonthKey(unitStart),
      })
      dayCursor = addDays(dayCursor, 1)
    }
  }

  return units
}

type ExportRequestBody = {
  timeScale?: 'DAY' | 'WEEK'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Clerk認証からユーザーIDを取得
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const { userId } = authResult

    const contentType = request.headers.get('content-type') ?? ''
    let body: ExportRequestBody | null = null
    if (contentType.includes('application/json')) {
      try {
        body = await request.json()
      } catch {
        body = null
      }
    }

    const { id } = await params
    const { ProjectDAL } = await import('@/dal/projects')
    
    // プロジェクトの所有者チェック
    const isOwner = await ProjectDAL.isOwner(id, userId)
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have access to this project' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const project = await ProjectDAL.getById(id)
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // プロジェクトの色設定を取得
    const colorSettings = await AssigneeColorDAL.getProjectColorSettings(id)

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Gantt')

  // 設定（ローカル日付で統一）
  const startDate = startOfDay(parseDateOnlyToLocal(project.startDate))
  const endDate = project.endDate ? startOfDay(parseDateOnlyToLocal(project.endDate)) : addDays(startDate, 6 * 30 - 1)
  const requestedScale = body?.timeScale
  const exportScale = requestedScale === 'WEEK' || requestedScale === 'DAY'
    ? requestedScale
    : project.timeScale
  const isWeekly = exportScale === 'WEEK'
  const timelineUnits = buildTimelineUnits(startDate, endDate, isWeekly)
  const timelineColumnCount = timelineUnits.length
  const timelineStart = timelineUnits[0]?.start ?? startDate
  const timelineEnd = timelineUnits[timelineColumnCount - 1]?.end ?? endDate
  const unitDurationMs = isWeekly ? 7 * MS_PER_DAY : MS_PER_DAY
  const firstTimelineColumn = 4

  // タイトル・情報
  sheet.mergeCells('A1', 'E1')
  sheet.getCell('A1').value = `${project.title}`
  sheet.getCell('A1').font = { size: 16, bold: true }
  sheet.mergeCells('A2', 'E2')
  sheet.getCell('A2').value = `期間: ${format(startDate, 'yyyy/MM/dd')} 〜 ${format(endDate, 'yyyy/MM/dd')}`
  sheet.getCell('A2').font = { size: 12 }

  // 列のセットアップ
  // A列: タスク名, B列: 完了(チェック), C列: 担当, D列以降: 日付
  const headerOffset = 3 // 1-based row index where headers start
  sheet.getColumn(1).width = 28
  sheet.getColumn(2).width = 6  // 完了列
  sheet.getColumn(3).width = 10  // 担当者列
  for (let i = 0; i < timelineColumnCount; i += 1) {
    const colIndex = firstTimelineColumn + i
    sheet.getColumn(colIndex).width = isWeekly ? 6 : 3
  }

  const headerRowCount = isWeekly ? 3 : 4
  const yearRow = headerOffset
  const monthRow = headerOffset + 1
  const dayRow = headerOffset + 2
  const weekdayRow = headerOffset + 3

  // 年ヘッダー
  let yearCursor = 0
  while (yearCursor < timelineColumnCount) {
    const unit = timelineUnits[yearCursor]
    const targetYear = unit.start.getFullYear()
    let span = 0
    while (
      yearCursor + span < timelineColumnCount &&
      timelineUnits[yearCursor + span].start.getFullYear() === targetYear
    ) {
      span += 1
    }
    const from = firstTimelineColumn + yearCursor
    const to = from + span - 1
    sheet.mergeCells(yearRow, from, yearRow, to)
    sheet.getCell(yearRow, from).value = `${targetYear}年`
    sheet.getCell(yearRow, from).alignment = { horizontal: 'center' }
    yearCursor += span
  }

  // 月ヘッダー
  let cursor = 0
  while (cursor < timelineColumnCount) {
    const unit = timelineUnits[cursor]
    const targetMonthKey = unit.monthKey
    let span = 0
    while (
      cursor + span < timelineColumnCount &&
      timelineUnits[cursor + span].monthKey === targetMonthKey
    ) {
      span += 1
    }
    const from = firstTimelineColumn + cursor
    const to = from + span - 1
    const label = `${unit.start.getMonth() + 1}月`
    sheet.mergeCells(monthRow, from, monthRow, to)
    sheet.getCell(monthRow, from).value = label
    sheet.getCell(monthRow, from).alignment = { horizontal: 'center' }
    cursor += span
  }

  if (isWeekly) {
    for (let i = 0; i < timelineColumnCount; i += 1) {
      const col = firstTimelineColumn + i
      sheet.getCell(dayRow, col).value = timelineUnits[i].label
      sheet.getCell(dayRow, col).alignment = { horizontal: 'center', vertical: 'middle' }
    }
  } else {
    // 日行
    for (let i = 0; i < timelineColumnCount; i += 1) {
      const col = firstTimelineColumn + i
      sheet.getCell(dayRow, col).value = timelineUnits[i].label
      sheet.getCell(dayRow, col).alignment = { horizontal: 'center' }
    }

    // 曜日行
    for (let i = 0; i < timelineColumnCount; i += 1) {
      const col = firstTimelineColumn + i
      const date = timelineUnits[i].start
      const dayOfWeekShort = timelineUnits[i].weekdayLabel ?? ''
      sheet.getCell(weekdayRow, col).value = dayOfWeekShort
      sheet.getCell(weekdayRow, col).alignment = { horizontal: 'center' }
      
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const isHoliday = !!isJapaneseHoliday(date)
      if (isHoliday) {
        sheet.getCell(weekdayRow, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FCE7F3' },
        }
      } else if (isWeekend) {
        sheet.getCell(weekdayRow, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'EDEFF9' },
        }
      }
    }
  }

  // 左側ヘッダー（タスク名、完了、担当者）
  sheet.getCell(headerOffset, 1).value = 'タスク名'
  sheet.getCell(headerOffset, 1).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 1).font = { bold: true }
  sheet.mergeCells(headerOffset, 1, headerOffset + headerRowCount - 1, 1)

  sheet.getCell(headerOffset, 2).value = '完了'
  sheet.getCell(headerOffset, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 2).font = { bold: true }
  sheet.mergeCells(headerOffset, 2, headerOffset + headerRowCount - 1, 2)

  sheet.getCell(headerOffset, 3).value = '担当者'
  sheet.getCell(headerOffset, 3).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 3).font = { bold: true }
  sheet.mergeCells(headerOffset, 3, headerOffset + headerRowCount - 1, 3)

  // ボーダー（ヘッダー部）- 曜日行を含むように修正
  for (let r = headerOffset; r < headerOffset + headerRowCount; r += 1) {
    for (let c = 1; c <= 3 + timelineColumnCount; c += 1) {
      const cell = sheet.getCell(r, c)
      // ヘッダー部分（月・日・曜日）は全て実線
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }
  }

  // タスク行
  // 動的な色システムを使用（固定色から変更）

  let rowIndex = headerOffset + headerRowCount
  for (const t of project.tasks) {
    const row = sheet.getRow(rowIndex)
    const isParentTask = !t.parentId
    row.getCell(1).value = t.title
    row.getCell(1).alignment = {
      vertical: 'middle',
      indent: isParentTask ? 0 : 2,
    }
    if (isParentTask) {
      row.getCell(1).font = { bold: true }
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9F3' },
      }
    }
    
    // 完了（チェック）
    row.getCell(2).value = t.isCompleted ? '✓' : ''
    
    row.getCell(3).value = t.assignee  // 担当者列を3列目に移動

    const startSource = !isParentTask ? t.plannedStart ?? null : null
    const endSource = !isParentTask ? t.plannedEnd ?? null : null

    // 日付が設定されている場合のみバーを描画
    if (!isParentTask && startSource && endSource && timelineColumnCount > 0) {
      const plannedStart = startOfDay(parseDateOnlyToLocal(startSource))
      const plannedEnd = startOfDay(parseDateOnlyToLocal(endSource))

      if (plannedEnd >= timelineStart && plannedStart <= timelineEnd) {
        const startOffset = Math.max(
          0,
          Math.floor((plannedStart.getTime() - timelineStart.getTime()) / unitDurationMs)
        )
        const endOffset = Math.min(
          timelineColumnCount - 1,
          Math.floor((plannedEnd.getTime() - timelineStart.getTime()) / unitDurationMs)
        )

        const color = getAssigneeColorWithSettings(t.assignee, t.isCompleted, colorSettings)
        const hex = color.hex

        for (let idx = startOffset; idx <= endOffset; idx += 1) {
          const unit = timelineUnits[idx]

          // 念のため実際の週/日の範囲と重なっているかを確認
          if (plannedStart > unit.end || plannedEnd < unit.start) {
            continue
          }

          const col = firstTimelineColumn + idx
          const cell = row.getCell(col)
          const dateForBackground = unit.start
          const isWeekend = dateForBackground.getDay() === 0 || dateForBackground.getDay() === 6
          const isHoliday = !!isJapaneseHoliday(dateForBackground)
          const canFill = isWeekly ? true : (!isWeekend && !isHoliday)

          if (canFill) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: hex },
            }
          }

          cell.border = {
            top: { style: 'dotted' },
            left: { style: 'dotted' },
            bottom: { style: 'dotted' },
            right: { style: 'dotted' },
          }
        }
      }
    }

    // ガントチャートエリア全体に点線罫線を追加
    for (let c = firstTimelineColumn; c < firstTimelineColumn + timelineColumnCount; c += 1) {
      const cell = row.getCell(c)
      if (!cell.border) {
        cell.border = {
          top: { style: 'dotted' },
          left: { style: 'dotted' },
          bottom: { style: 'dotted' },
          right: { style: 'dotted' },
        }
      }
    }

    if (!isWeekly) {
      // 週末と祝日の薄い背景（タスクの色が塗られていないセルに適用）
      for (let i = 0; i < timelineColumnCount; i += 1) {
        const date = timelineUnits[i].start
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const isHoliday = !!isJapaneseHoliday(date)
        const col = firstTimelineColumn + i
        const cell = row.getCell(col)
        
        if (!cell.fill) {
          if (isHoliday) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FCE7F3' },
            }
          } else if (isWeekend) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'EDEFF9' },
            }
          }
        }
      }
    }

    // 左側情報セルの枠
    for (let c = 1; c <= 3; c += 1) {  // 列数を3に変更（タスク名、完了日、担当者）
      row.getCell(c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }

    rowIndex += 1
  }

  // 印刷範囲の設定
  // A1からプロジェクト情報、ヘッダー、全タスク行までの範囲を印刷範囲に設定
  const lastRow = rowIndex - 1  // 最後のタスク行
  const lastCol = 3 + timelineColumnCount  // 最後の日付列（A=1, B=2, C=3, D=4...）
  
  // 列番号をExcelの列文字に変換する関数
  const getColumnLetter = (colNum: number): string => {
    let result = ''
    while (colNum > 0) {
      const remainder = (colNum - 1) % 26
      result = String.fromCharCode(65 + remainder) + result
      colNum = Math.floor((colNum - 1) / 26)
    }
    return result
  }
  
  const lastColLetter = getColumnLetter(lastCol)
  const printArea = `A1:${lastColLetter}${lastRow}`
  
  // ExcelJSでの印刷範囲設定
  sheet.pageSetup = {
    printArea: printArea,
    orientation: 'landscape',  // 横向き
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,  // 高さは自動調整
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    }
  }

    const buffer: ArrayBuffer = await workbook.xlsx.writeBuffer()
    const fileName = `gantt_${project.title}_${format(new Date(), 'yyyyMMdd')}.xlsx`
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting project:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}


