'use client'

import React, { useMemo } from 'react'
import { Pencil, Trash2, Copy } from 'lucide-react'
import { TaskResponse, ProjectWithTasksResponse } from '@/lib/types/api'
import { format, addDays, startOfDay, differenceInCalendarDays, isWeekend } from 'date-fns'
import { ja } from 'date-fns/locale'

interface GanttChartProps {
  project: ProjectWithTasksResponse
  tasks: TaskResponse[]
  onTasksChange?: () => void
  onEditTask?: (task: TaskResponse) => void
}

export function GanttChart({ project, tasks, onTasksChange, onEditTask }: GanttChartProps) {
  // プロジェクト開始日（ローカル日単位に正規化）
  const projectStartDay = useMemo(() => startOfDay(new Date(project.startDate)), [project.startDate])

  // 表示ウィンドウ（プロジェクト開始から6ヶ月 = 約180日）
  const visibleDates = useMemo(() => {
    const start = projectStartDay
    const end = project.endDate ? startOfDay(new Date(project.endDate)) : addDays(start, 6 * 30 - 1)
    const dates: Date[] = []
    let current = start
    while (current <= end) {
      dates.push(new Date(current))
      current = addDays(current, 1)
    }
    return dates
  }, [projectStartDay, project.endDate])

  // 1日あたりの描画幅（px）
  const DAY_WIDTH_PX = 32
  const timelineWidthPx = visibleDates.length * DAY_WIDTH_PX

  // ドラッグ状態
  type DragType = 'move' | 'resize-left' | 'resize-right'
  const [dragState, setDragState] = React.useState<
    | {
        taskId: string
        type: DragType
        startClientX: number
        originalStart: Date
        originalEnd: Date
        previewStart: Date
        previewEnd: Date
      }
    | null
  >(null)

  // 左側タスクリストの並び替え（ドラッグ&ドロップ）
  const [dragTaskId, setDragTaskId] = React.useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null)
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null)
  const handleReorder = async (newOrderIds: string[]) => {
    try {
      const res = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newOrderIds }),
      })
      if (!res.ok) throw new Error('reorder failed')
      onTasksChange?.()
    } catch (e) {
      console.error(e)
      alert('並び替えの保存に失敗しました')
    }
  }

  const clampToVisible = React.useCallback((date: Date) => {
    const min = visibleDates[0]
    const max = visibleDates[visibleDates.length - 1]
    if (date < min) return min
    if (date > max) return max
    return date
  }, [visibleDates])

  // ヘッダー表示用の期間終端（endDate があればそれを使用、なければ6ヶ月表示の最終日）
  const headerEndDate = useMemo(() => {
    return project.endDate
      ? startOfDay(new Date(project.endDate))
      : addDays(projectStartDay, 6 * 30 - 1)
  }, [project.endDate, projectStartDay])

  const pxToDays = (px: number) => Math.round(px / DAY_WIDTH_PX)
  const addDaysSafe = (date: Date, days: number) => startOfDay(addDays(date, days))

  React.useEffect(() => {
    if (!dragState) return

    const handleMove = (e: MouseEvent) => {
      const deltaPx = e.clientX - dragState.startClientX
      const deltaDays = pxToDays(deltaPx)
      if (dragState.type === 'move') {
        let newStart = clampToVisible(addDaysSafe(dragState.originalStart, deltaDays))
        let newEnd = clampToVisible(addDaysSafe(dragState.originalEnd, deltaDays))
        // 長さが保持されるように端のクランプによる縮みを防ぐ
        const duration = differenceInCalendarDays(dragState.originalEnd, dragState.originalStart)
        if (differenceInCalendarDays(newEnd, newStart) < duration) {
          // 右がはみ出した場合
          if (newEnd.getTime() === visibleDates[visibleDates.length - 1].getTime()) {
            newStart = startOfDay(addDays(newEnd, -duration))
          } else if (newStart.getTime() === visibleDates[0].getTime()) {
            newEnd = startOfDay(addDays(newStart, duration))
          }
        }
        setDragState({ ...dragState, previewStart: newStart, previewEnd: newEnd })
      } else if (dragState.type === 'resize-left') {
        let newStart = clampToVisible(addDaysSafe(dragState.originalStart, deltaDays))
        // 最小1日
        if (differenceInCalendarDays(dragState.originalEnd, newStart) < 0) {
          newStart = dragState.originalEnd
        }
        setDragState({ ...dragState, previewStart: newStart })
      } else if (dragState.type === 'resize-right') {
        let newEnd = clampToVisible(addDaysSafe(dragState.originalEnd, deltaDays))
        if (differenceInCalendarDays(newEnd, dragState.originalStart) < 0) {
          newEnd = dragState.originalStart
        }
        setDragState({ ...dragState, previewEnd: newEnd })
      }
    }

    const handleUp = async () => {
      if (!dragState) return
      try {
        const body = {
          plannedStart: dragState.previewStart.toISOString(),
          plannedEnd: dragState.previewEnd.toISOString(),
        }
        await fetch(`/api/tasks/${dragState.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        onTasksChange?.()
      } catch (e) {
        console.error('Failed to save task change', e)
        alert('タスクの更新に失敗しました')
      } finally {
        setDragState(null)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [dragState, onTasksChange, visibleDates, clampToVisible])

  // 月ごとのセグメントを作成（上段にまとめて表示）
  const monthSegments = useMemo(() => {
    type Segment = { startIndex: number; span: number; label: string }
    const segments: Segment[] = []
    if (visibleDates.length === 0) return segments
    let i = 0
    while (i < visibleDates.length) {
      const current = visibleDates[i]
      const currentMonth = current.getMonth()
      const currentYear = current.getFullYear()
      let span = 0
      while (
        i + span < visibleDates.length &&
        visibleDates[i + span].getMonth() === currentMonth &&
        visibleDates[i + span].getFullYear() === currentYear
      ) {
        span += 1
      }
      segments.push({
        startIndex: i,
        span,
        label: format(current, 'M月', { locale: ja }),
      })
      i += span
    }
    return segments
  }, [visibleDates])

  // タスクバーの位置とサイズを計算
  const getTaskBarStyle = (task: TaskResponse) => {
    const visibleStart = visibleDates[0]
    const visibleEnd = visibleDates[visibleDates.length - 1]

    // すべて日単位に正規化してタイムゾーン起因のズレを排除
    const baseStart = startOfDay(new Date(task.plannedStart))
    const baseEnd = startOfDay(new Date(task.plannedEnd))

    // ドラッグ中はプレビューの期間を採用
    const isDragging = dragState && dragState.taskId === task.id
    const taskStartDay = isDragging ? dragState!.previewStart : baseStart
    const taskEndDay = isDragging ? dragState!.previewEnd : baseEnd

    // 可視範囲内での左端・右端をクリップ
    const clampedStart = taskStartDay < visibleStart ? visibleStart : taskStartDay
    const clampedEnd = taskEndDay > visibleEnd ? visibleEnd : taskEndDay

    // 期間が可視範囲と交差しない場合は非表示
    if (clampedEnd < visibleStart || clampedStart > visibleEnd) return null

    const startOffsetDays = Math.max(0, differenceInCalendarDays(clampedStart, visibleStart))
    const durationDays = differenceInCalendarDays(clampedEnd, clampedStart) + 1

    return {
      left: `${startOffsetDays * DAY_WIDTH_PX}px`,
      width: `${durationDays * DAY_WIDTH_PX}px`,
    }
  }

  // 担当者別の色を取得
  const getAssigneeColor = (assignee: string) => {
    switch (assignee) {
      case '弊社': return 'bg-blue-500'
      case 'お客様': return 'bg-green-500'
      case '弊社/お客様': return 'bg-purple-500'
      case 'その他': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  // 今日の日付
  const today = startOfDay(new Date())
  const todayOffset = differenceInCalendarDays(today, visibleDates[0])

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* ヘッダー部分 */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gray-600">
              プロジェクト期間: {format(new Date(project.startDate), 'yyyy年MM月dd日', { locale: ja })} 〜 {format(headerEndDate, 'yyyy年MM月dd日', { locale: ja })}
            </p>
            <p className="text-xs text-gray-500 mt-1">💡 Enterキーでタスクを追加できます</p>
          </div>
          {/* 凡例（ヘッダー右側） */}
          <div className="flex items-center flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded" aria-hidden />
              <span>弊社</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" aria-hidden />
              <span>お客様</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded" aria-hidden />
              <span>弊社/お客様</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded" aria-hidden />
              <span>その他</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-red-500" aria-hidden />
              <span>今日</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* タスク一覧部分 */}
        <div className="w-80 border-r bg-gray-50">
          {/* タスクリストヘッダー（ガントヘッダーと同じ高さに統一） */}
          <div className="h-16 border-b bg-white font-semibold flex items-center px-4">
            タスク
          </div>
          
          {/* タスク項目（各行の高さをガント行と厳密に一致させる） */}
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`relative h-12 border-b bg-white flex items-center px-4 ${dragTaskId === task.id ? 'opacity-60' : ''} ${dropTargetId === task.id ? 'bg-blue-50/30' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragTaskId(task.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', task.id)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                const offset = e.clientY - rect.top
                const pos = offset < rect.height / 2 ? 'before' : 'after'
                setDropTargetId(task.id)
                setDropPosition(pos)
              }}
              onDrop={(e) => {
                e.preventDefault()
                const srcId = e.dataTransfer.getData('text/plain')
                const dstId = task.id
                if (!srcId || srcId === dstId) return
                const current = tasks.map((t) => t.id)
                const from = current.indexOf(srcId)
                const to = current.indexOf(dstId)
                if (from === -1 || to === -1) return
                // 作業用配列から移動元を除去
                const next = current.filter((id) => id !== srcId)
                let insertIndex = next.indexOf(dstId)
                if (dropPosition === 'after') insertIndex += 1
                next.splice(insertIndex, 0, srcId)
                handleReorder(next)
                setDragTaskId(null)
                setDropTargetId(null)
                setDropPosition(null)
              }}
              onDragLeave={(e) => {
                // 行の外へ出たら薄いハイライトのみリセット（他行で再設定される）
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
                  setDropTargetId(null)
                  setDropPosition(null)
                }
              }}
              onDragEnd={() => {
                setDragTaskId(null)
                setDropTargetId(null)
                setDropPosition(null)
              }}
            >
              {/* 挿入位置インジケータ */}
              {dropTargetId === task.id && dropPosition === 'before' && (
                <div className="absolute left-0 right-0 top-0 h-0.5 bg-blue-500" />
              )}
              {dropTargetId === task.id && dropPosition === 'after' && (
                <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-blue-500" />
              )}
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm leading-none truncate">{task.title}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${getAssigneeColor(task.assignee)}`}
                      aria-label={task.assignee}
                      title={task.assignee}
                    />
                  <button
                    type="button"
                    aria-label="タスクを編集"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-background text-gray-700 hover:bg-accent"
                    onClick={() => onEditTask?.(task)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                    <button
                      type="button"
                      aria-label="タスクをコピー"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-background text-gray-700 hover:bg-accent"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/tasks/${task.id}/duplicate`, { method: 'POST' })
                          if (!res.ok) throw new Error('failed')
                          onTasksChange?.()
                        } catch (e) {
                          alert('タスクのコピーに失敗しました。')
                          console.error(e)
                        }
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  <button
                    type="button"
                    aria-label="タスクを削除"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-input bg-background text-red-700 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm('このタスクを削除しますか？')) return
                      try {
                        const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
                        if (!res.ok) throw new Error('failed')
                        onTasksChange?.()
                      } catch (e) {
                        alert('タスクの削除に失敗しました。')
                        console.error(e)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {tasks.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              タスクがありません
            </div>
          )}
        </div>

        {/* ガントチャート部分 */}
        <div className="flex-1 overflow-x-auto">
          {/* 日付ヘッダー（上段: 月セグメント、下段: 日と曜日） */}
          <div className="border-b bg-white" style={{ width: `${timelineWidthPx}px` }}>
            {/* 月セグメント行 */}
            <div
              className="h-6 grid text-center text-xs"
              style={{ gridTemplateColumns: `repeat(${visibleDates.length}, ${DAY_WIDTH_PX}px)` }}
            >
              {monthSegments.map((seg, idx) => (
                <div
                  key={idx}
                  className="border-r flex items-center justify-center font-medium"
                  style={{ gridColumn: `${seg.startIndex + 1} / span ${seg.span}` }}
                >
                  {seg.label}
                </div>
              ))}
            </div>

            {/* 日+曜日行 */}
            <div
              className="h-10 grid"
              style={{ gridTemplateColumns: `repeat(${visibleDates.length}, ${DAY_WIDTH_PX}px)` }}
            >
              {visibleDates.map((date, index) => (
                <div
                  key={index}
                  className={`border-r text-center text-xs p-1 flex flex-col items-center justify-center leading-tight ${
                    isWeekend(date) ? 'bg-blue-50' : ''
                  } ${
                    format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd') ? 'bg-yellow-100' : ''
                  }`}
                >
                  <div className="text-sm font-semibold">{format(date, 'd', { locale: ja })}</div>
                  <div className="text-[10px] text-gray-500">{format(date, 'EEE', { locale: ja })}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ガントバー（タイムライン幅を固定pxで管理） */}
          <div className="relative" style={{ width: `${timelineWidthPx}px` }}>
            {/* 背景の日付グリッド（ヘッダーと同じピッチで縦ライン） */}
            <div
              aria-hidden
              className="absolute inset-0 grid pointer-events-none z-0"
              style={{ gridTemplateColumns: `repeat(${visibleDates.length}, ${DAY_WIDTH_PX}px)` }}
            >
              {visibleDates.map((date, index) => (
                <div
                  key={index}
                  className={`border-r ${isWeekend(date) ? 'bg-blue-50/50' : ''}`}
                />
              ))}
            </div>
            {/* 今日のライン */}
            {todayOffset >= 0 && todayOffset < visibleDates.length && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: `${todayOffset * DAY_WIDTH_PX}px` }}
              />
            )}
            
            {tasks.map((task) => {
              const style = getTaskBarStyle(task)
              if (!style) return null

              const isCompleted = !!task.completedAt
              return (
                <div key={task.id} className="h-12 border-b relative">
                  <div
                    className={`absolute top-1 bottom-1 rounded ${isCompleted ? 'bg-gray-400' : getAssigneeColor(task.assignee)} opacity-80 hover:opacity-100 transition-opacity`}
                    style={style}
                    title={`${task.title} (${task.assignee})`}
                    onMouseDown={(e) => {
                      // バー本体のドラッグ（移動）
                      if ((e.target as HTMLElement).dataset.handle) return
                      e.preventDefault()
                      document.body.style.cursor = 'grabbing'
                      document.body.style.userSelect = 'none'
                      setDragState({
                        taskId: task.id,
                        type: 'move',
                        startClientX: e.clientX,
                        originalStart: startOfDay(new Date(task.plannedStart)),
                        originalEnd: startOfDay(new Date(task.plannedEnd)),
                        previewStart: startOfDay(new Date(task.plannedStart)),
                        previewEnd: startOfDay(new Date(task.plannedEnd)),
                      })
                    }}
                  >
                    {/* 左右リサイズハンドル */}
                    <div
                      data-handle
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        document.body.style.cursor = 'ew-resize'
                        document.body.style.userSelect = 'none'
                        setDragState({
                          taskId: task.id,
                          type: 'resize-left',
                          startClientX: e.clientX,
                          originalStart: startOfDay(new Date(task.plannedStart)),
                          originalEnd: startOfDay(new Date(task.plannedEnd)),
                          previewStart: startOfDay(new Date(task.plannedStart)),
                          previewEnd: startOfDay(new Date(task.plannedEnd)),
                        })
                      }}
                    />
                    <div className="p-1 text-white text-xs truncate pointer-events-none">{task.title}</div>
                    <div
                      data-handle
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        document.body.style.cursor = 'ew-resize'
                        document.body.style.userSelect = 'none'
                        setDragState({
                          taskId: task.id,
                          type: 'resize-right',
                          startClientX: e.clientX,
                          originalStart: startOfDay(new Date(task.plannedStart)),
                          originalEnd: startOfDay(new Date(task.plannedEnd)),
                          previewStart: startOfDay(new Date(task.plannedStart)),
                          previewEnd: startOfDay(new Date(task.plannedEnd)),
                        })
                      }}
                    />
                  </div>
                </div>
              )
            })}
            
            {tasks.length === 0 && (
              <div className="h-32 flex items-center justify-center text-gray-500">
                タスクを追加してガントチャートを表示
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部凡例はヘッダーへ移設済み */}
    </div>
  )
}