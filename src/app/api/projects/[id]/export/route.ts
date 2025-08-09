import { NextRequest } from 'next/server'
import { ProjectDAL } from '@/dal/projects'
import { addDays, format, startOfDay } from 'date-fns'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const project = await ProjectDAL.getById(params.id)
  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 動的importでバンドル最適化
  const ExcelJS = (await import('exceljs')).default
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

  // 月・日ヘッダー
  // 月セルは結合、日セルは各日
  // 月行: headerOffset, 日行: headerOffset+1
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

  for (let i = 0; i < totalDays; i += 1) {
    const d = addDays(startOfDay(startDate), i)
    const col = 3 + i
    sheet.getCell(headerOffset + 1, col).value = d.getDate()
    sheet.getCell(headerOffset + 1, col).alignment = { horizontal: 'center' }
  }

  // ボーダー（ヘッダー部）
  for (let r = headerOffset; r <= headerOffset + 1; r += 1) {
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
  const colorByAssignee: Record<string, string> = {
    '弊社': '4472C4', // blue
    'お客様': '70AD47', // green
    '弊社/お客様': '8E7CC3', // purple
    'その他': 'A6A6A6', // gray
  }

  let rowIndex = headerOffset + 2
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

    const hex = t.completedAt ? 'B7B7B7' : colorByAssignee[t.assignee] || 'A6A6A6'
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
}


