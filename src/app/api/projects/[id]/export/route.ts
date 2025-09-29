import { NextRequest } from 'next/server'
import { addDays, format, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import ExcelJS from 'exceljs'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'
import { getAssigneeColorWithSettings } from '@/lib/colors'
import { AssigneeColorDAL } from '@/dal/assignee-colors'

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

export async function POST(
  _request: NextRequest,
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
  const totalDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1)

  // タイトル・情報
  sheet.mergeCells('A1', 'E1')
  sheet.getCell('A1').value = `${project.title}`
  sheet.getCell('A1').font = { size: 16, bold: true }
  sheet.mergeCells('A2', 'E2')
  sheet.getCell('A2').value = `期間: ${format(startDate, 'yyyy/MM/dd')} 〜 ${format(endDate, 'yyyy/MM/dd')}`
  sheet.getCell('A2').font = { size: 12 }

  // 列のセットアップ
  // A列: タスク名, B列: 完了日, C列: 担当, D列以降: 日付（期間列は非表示）
  const headerOffset = 3 // 1-based row index where headers start
  sheet.getColumn(1).width = 28
  sheet.getColumn(2).width = 12  // 完了日列
  sheet.getColumn(3).width = 10  // 担当者列
  for (let i = 0; i < totalDays; i += 1) {
    const colIndex = 4 + i  // 日付列の開始位置を変更
    sheet.getColumn(colIndex).width = 3
  }

  // 月・日・曜日ヘッダー
  // 月セルは結合、日セルと曜日セルは各日
  // 月行: headerOffset, 日行: headerOffset+1, 曜日行: headerOffset+2
  let cursor = 0
  while (cursor < totalDays) {
    const date = addDays(startDate, cursor)
    const currentMonth = date.getMonth()
    let span = 0
    while (
      cursor + span < totalDays &&
      addDays(startDate, cursor + span).getMonth() === currentMonth
    ) {
      span += 1
    }
    const from = 4 + cursor  // 日付列の開始位置を変更
    const to = from + span - 1
    const label = `${date.getMonth() + 1}月`
    sheet.mergeCells(headerOffset, from, headerOffset, to)
    sheet.getCell(headerOffset, from).value = label
    sheet.getCell(headerOffset, from).alignment = { horizontal: 'center' }
    cursor += span
  }

  // 日行
  for (let i = 0; i < totalDays; i += 1) {
    const d = addDays(startDate, i)
    const col = 4 + i  // 日付列の開始位置を変更
    sheet.getCell(headerOffset + 1, col).value = d.getDate()
    sheet.getCell(headerOffset + 1, col).alignment = { horizontal: 'center' }
  }

  // 曜日行
  for (let i = 0; i < totalDays; i += 1) {
    const d = addDays(startDate, i)
    const col = 4 + i  // 日付列の開始位置を変更
    const dayOfWeekShort = format(d, 'EEE', { locale: ja })
    sheet.getCell(headerOffset + 2, col).value = dayOfWeekShort
    sheet.getCell(headerOffset + 2, col).alignment = { horizontal: 'center' }
    
    // 週末の背景色
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    if (isWeekend) {
      sheet.getCell(headerOffset + 2, col).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'EDEFF9' },
      }
    }
  }

  // 左側ヘッダー（タスク名、完了日、担当者）
  sheet.getCell(headerOffset, 1).value = 'タスク名'
  sheet.getCell(headerOffset, 1).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 1).font = { bold: true }
  sheet.mergeCells(headerOffset, 1, headerOffset + 2, 1)  // 3行分を結合

  sheet.getCell(headerOffset, 2).value = '完了日'
  sheet.getCell(headerOffset, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 2).font = { bold: true }
  sheet.mergeCells(headerOffset, 2, headerOffset + 2, 2)  // 3行分を結合

  sheet.getCell(headerOffset, 3).value = '担当者'
  sheet.getCell(headerOffset, 3).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 3).font = { bold: true }
  sheet.mergeCells(headerOffset, 3, headerOffset + 2, 3)  // 3行分を結合

  // ボーダー（ヘッダー部）- 曜日行を含むように修正
  for (let r = headerOffset; r <= headerOffset + 2; r += 1) {
    for (let c = 1; c < 5 + totalDays; c += 1) {  // 列数を1つ増加
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

  let rowIndex = headerOffset + 3  // 曜日行を追加したため+1
  for (const t of project.tasks) {
    const row = sheet.getRow(rowIndex)
    row.getCell(1).value = t.title
    
    // 完了日の表示（ローカル日付）
    if (t.completedAt) {
      row.getCell(2).value = format(parseDateOnlyToLocal(t.completedAt), 'yyyy/MM/dd')
    } else {
      row.getCell(2).value = ''
    }
    
    row.getCell(3).value = t.assignee  // 担当者列を3列目に移動

    const startOffset = Math.max(
      0,
      Math.floor((startOfDay(parseDateOnlyToLocal(t.plannedStart)).getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    )
    const endOffset = Math.min(
      totalDays - 1,
      Math.floor((startOfDay(parseDateOnlyToLocal(t.plannedEnd)).getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    )
    const fromCol = 4 + startOffset  // 日付列の開始位置を変更
    const toCol = 4 + endOffset

    const color = getAssigneeColorWithSettings(t.assignee, !!t.completedAt, colorSettings)
    const hex = color.hex
    for (let c = fromCol; c <= toCol; c += 1) {
      const cell = row.getCell(c)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hex },
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }

    // ガントチャートエリア全体に点線罫線を追加
    for (let c = 4; c < 4 + totalDays; c += 1) {
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

    // 週末の薄い背景
    for (let i = 0; i < totalDays; i += 1) {
      const date = addDays(startDate, i)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      if (isWeekend) {
        const cell = row.getCell(4 + i)  // 日付列の開始位置を変更
        if (!cell.fill) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'EDEFF9' },
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
  const lastCol = 3 + totalDays  // 最後の日付列（A=1, B=2, C=3, D=4...）
  
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


