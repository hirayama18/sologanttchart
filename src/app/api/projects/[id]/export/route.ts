import { NextRequest } from 'next/server'
import { addDays, format, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import ExcelJS from 'exceljs'
import { getAuthenticatedUserId, isAuthError } from '@/lib/auth'
import { getAssigneeColorHex } from '@/lib/colors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = false

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

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Gantt')

  // 設定
  const startDate = startOfDay(new Date(project.startDate))
  const endDate = project.endDate ? startOfDay(new Date(project.endDate)) : addDays(startDate, 6 * 30 - 1)
  const totalDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1)

  // タイトル・情報
  sheet.mergeCells('A1', 'E1')
  sheet.getCell('A1').value = `${project.title}`
  sheet.getCell('A1').font = { size: 16, bold: true }
  sheet.mergeCells('A2', 'E2')
  sheet.getCell('A2').value = `期間: ${format(startDate, 'yyyy/MM/dd')} 〜 ${format(endDate, 'yyyy/MM/dd')}`
  sheet.getCell('A2').font = { size: 12 }

  // 列のセットアップ
  // A列: タスク名, B列: 担当, C列以降: 日付（期間列は非表示）
  const headerOffset = 3 // 1-based row index where headers start
  sheet.getColumn(1).width = 28
  sheet.getColumn(2).width = 10
  for (let i = 0; i < totalDays; i += 1) {
    const colIndex = 3 + i
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
    const from = 3 + cursor
    const to = from + span - 1
    const label = `${date.getMonth() + 1}月`
    sheet.mergeCells(headerOffset, from, headerOffset, to)
    sheet.getCell(headerOffset, from).value = label
    sheet.getCell(headerOffset, from).alignment = { horizontal: 'center' }
    cursor += span
  }

  // 日行
  for (let i = 0; i < totalDays; i += 1) {
    const d = addDays(startOfDay(startDate), i)
    const col = 3 + i
    sheet.getCell(headerOffset + 1, col).value = d.getDate()
    sheet.getCell(headerOffset + 1, col).alignment = { horizontal: 'center' }
  }

  // 曜日行
  for (let i = 0; i < totalDays; i += 1) {
    const d = addDays(startOfDay(startDate), i)
    const col = 3 + i
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

  // 左側ヘッダー（タスク名、担当者）
  sheet.getCell(headerOffset, 1).value = 'タスク名'
  sheet.getCell(headerOffset, 1).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 1).font = { bold: true }
  sheet.mergeCells(headerOffset, 1, headerOffset + 2, 1)  // 3行分を結合

  sheet.getCell(headerOffset, 2).value = '担当者'
  sheet.getCell(headerOffset, 2).alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell(headerOffset, 2).font = { bold: true }
  sheet.mergeCells(headerOffset, 2, headerOffset + 2, 2)  // 3行分を結合

  // ボーダー（ヘッダー部）- 曜日行を含むように修正
  for (let r = headerOffset; r <= headerOffset + 2; r += 1) {
    for (let c = 1; c < 4 + totalDays; c += 1) {
      sheet.getCell(r, c).border = {
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
    row.getCell(2).value = t.assignee

    const startOffset = Math.max(
      0,
      Math.floor((startOfDay(new Date(t.plannedStart)).getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    )
    const endOffset = Math.min(
      totalDays - 1,
      Math.floor((startOfDay(new Date(t.plannedEnd)).getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
    )
    const fromCol = 3 + startOffset
    const toCol = 3 + endOffset

    const hex = getAssigneeColorHex(t.assignee, !!t.completedAt)
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

    // 週末の薄い背景
    for (let i = 0; i < totalDays; i += 1) {
      const date = addDays(startDate, i)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      if (isWeekend) {
        const cell = row.getCell(3 + i)
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
    for (let c = 1; c <= 2; c += 1) {
      row.getCell(c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      }
    }

    rowIndex += 1
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


