'use client'

import React, { useMemo, memo, useCallback } from 'react'
import { Pencil, Trash2, Copy } from 'lucide-react'
import { TaskResponse, ProjectWithTasksResponse } from '@/lib/types/api'
import { format, addDays, startOfDay, differenceInCalendarDays, isWeekend } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getAssigneeColorWithSettings } from '@/lib/colors'
import { isJapaneseHoliday } from '@/lib/utils'
import { ColorLegend } from './color-legend'

// ローカル日付(年-月-日)として扱うためのユーティリティ
function parseDateOnlyToLocal(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }
  // ISOやその他の文字列を一度Dateに通してローカル日に正規化
  const temp = new Date(input)
  if (!isNaN(temp.getTime())) {
    return new Date(temp.getFullYear(), temp.getMonth(), temp.getDate())
  }
  // フォールバック: 明示的にYYYY-MM-DDを分解
  const s = input.slice(0, 10)
  const year = Number(s.slice(0, 4))
  const month = Number(s.slice(5, 7)) - 1
  const day = Number(s.slice(8, 10))
  return new Date(year, month, day)
}

function formatAsYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ドラッグ状態の型定義
type DragState = {
  taskId: string
  type: 'move' | 'resize-left' | 'resize-right'
  startClientX: number
  originalStart: Date
  originalEnd: Date
  previewStart: Date
  previewEnd: Date
} | null

// タスクバーコンポーネントのProps
interface TaskBarProps {
  task: TaskResponse
  visibleDates: Date[]
  dragState: DragState
  DAY_WIDTH_PX: number
  onMouseDown: (event: React.MouseEvent, taskId: string, dragType: 'move' | 'resize-left' | 'resize-right') => void
  onEditTask?: (task: TaskResponse) => void
  getAssigneeColor: (assignee: string) => string
}

// メモ化されたタスクバーコンポーネント
const TaskBar = memo(({ task, visibleDates, dragState, DAY_WIDTH_PX, onMouseDown, onEditTask, getAssigneeColor }: TaskBarProps) => {
  // タスクバーのスタイル計算をメモ化
  const taskBarStyle = useMemo(() => {
    // 中項目（親タスク）または日付が設定されていない場合は表示しない
    if (!task.parentId || !task.plannedStart || !task.plannedEnd) return null

    const visibleStart = visibleDates[0]
    const visibleEnd = visibleDates[visibleDates.length - 1]

    // すべて日単位に正規化してタイムゾーン起因のズレを排除
    const baseStart = startOfDay(parseDateOnlyToLocal(task.plannedStart))
    const baseEnd = startOfDay(parseDateOnlyToLocal(task.plannedEnd))

    // ドラッグ中はプレビューの期間を採用
    const isDragging = dragState && dragState.taskId === task.id
    const taskStartDay = isDragging ? dragState.previewStart : baseStart
    const taskEndDay = isDragging ? dragState.previewEnd : baseEnd

    // 可視範囲内での左端・右端をクリップ
    const clampedStart = taskStartDay < visibleStart ? visibleStart : taskStartDay
    const clampedEnd = taskEndDay > visibleEnd ? visibleEnd : taskEndDay

    // 期間が可視範囲と交差しない場合は非表示
    if (clampedEnd < visibleStart || clampedStart > visibleEnd) return null

    const startOffsetDays = Math.max(0, differenceInCalendarDays(clampedStart, visibleStart))
    const durationDays = differenceInCalendarDays(clampedEnd, clampedStart) + 1

    const leftPx = startOffsetDays * DAY_WIDTH_PX
    const widthPx = durationDays * DAY_WIDTH_PX

    return {
      left: `${leftPx}px`,
      width: `${Math.max(widthPx, 20)}px`, // 最小幅20px
      opacity: isDragging ? 0.8 : 1,
    }
  }, [task, visibleDates, dragState, DAY_WIDTH_PX])

  if (!taskBarStyle) return null

  const isCompleted = task.isCompleted
  const colorClass = isCompleted ? 'bg-gray-400' : getAssigneeColor(task.assignee)

  return (
    <div
      className={`flex items-center ${colorClass} text-white text-xs rounded px-2 py-1 cursor-move select-none relative group opacity-80 hover:opacity-100 transition-opacity ${isCompleted ? 'line-through' : ''}`}
      style={{
        position: 'absolute',
        ...taskBarStyle,
        height: '28px',
        minWidth: '20px',
      }}
      title={`${task.title} (${task.assignee}) ${isCompleted ? '- 完了済み' : ''}`}
      onMouseDown={(e) => onMouseDown(e, task.id, 'move')}
    >
      {/* 左端リサイズハンドル */}
      <div
        className="absolute left-0 top-0 w-2 h-full cursor-w-resize bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => {
          e.stopPropagation()
          onMouseDown(e, task.id, 'resize-left')
        }}
      />
      
      {/* タスクタイトル */}
      <span className="flex-1 truncate">{task.title}</span>
      
      {/* 右端リサイズハンドル */}
      <div
        className="absolute right-0 top-0 w-2 h-full cursor-e-resize bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={(e) => {
          e.stopPropagation()
          onMouseDown(e, task.id, 'resize-right')
        }}
      />
      
      {/* 編集ボタン */}
      <button
        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation()
          onEditTask?.(task)
        }}
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )
})

TaskBar.displayName = 'TaskBar'

interface GanttChartProps {
  project: ProjectWithTasksResponse
  tasks: TaskResponse[]
  onEditTask?: (task: TaskResponse) => void
  onTaskUpdate?: (taskId: string, updates: Partial<TaskResponse>) => void
  onTaskDuplicate?: (task: TaskResponse) => Promise<TaskResponse | null>
  onTaskDelete?: (task: TaskResponse) => Promise<boolean>
  onTaskReorder?: (newOrderIds: string[]) => void
  viewScale?: 'DAY' | 'WEEK'
}

export function GanttChart({ project, tasks, onEditTask, onTaskUpdate, onTaskDuplicate, onTaskDelete, onTaskReorder, viewScale }: GanttChartProps) {
  // 色設定の状態管理
  const [colorSettings, setColorSettings] = React.useState<Record<string, number>>({})
  
  // 色設定を初期読み込み
  React.useEffect(() => {
    const loadColorSettings = async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/colors`)
        if (response.ok) {
          const settings = await response.json()
          setColorSettings(settings)
        }
      } catch (error) {
        console.error('Failed to load color settings:', error)
      }
    }
    
    loadColorSettings()
  }, [project.id])

  // プロジェクト開始日（ローカル日単位に正規化）
  const projectStartDay = useMemo(() => startOfDay(parseDateOnlyToLocal(project.startDate)), [project.startDate])

  // 表示ウィンドウ（プロジェクト開始から6ヶ月 = 約180日）
  const visibleDates = useMemo(() => {
    const start = projectStartDay
    const end = project.endDate ? startOfDay(parseDateOnlyToLocal(project.endDate)) : addDays(start, 6 * 30 - 1)
    const dates: Date[] = []
    let current = start
    while (current <= end) {
      dates.push(new Date(current))
      current = addDays(current, 1)
    }
    return dates
  }, [projectStartDay, project.endDate])

  // 1日あたりの描画幅（px）- メモ化
  const resolvedScale = viewScale ?? project.timeScale ?? 'DAY'
  const isWeekly = resolvedScale === 'WEEK'
  const DAY_WIDTH_PX = useMemo(() => isWeekly ? 7.2 : 32, [isWeekly]) // 週単位なら1週間で約50px (7.2 * 7 = 50.4)
  const timelineWidthPx = useMemo(() => visibleDates.length * DAY_WIDTH_PX, [visibleDates.length, DAY_WIDTH_PX])

  // ドラッグ状態
  const [dragState, setDragState] = React.useState<DragState>(null)

  // 左側タスクリストの並び替え（ドラッグ&ドロップ）
  const [dragTaskId, setDragTaskId] = React.useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null)
  const [dropPosition, setDropPosition] = React.useState<'before' | 'after' | null>(null)
  
  const handleReorder = (newOrderIds: string[]) => {
    // ローカルステートのみ更新（保存は手動）
    onTaskReorder?.(newOrderIds)
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

  const pxToDays = useCallback((px: number) => Math.round(px / DAY_WIDTH_PX), [DAY_WIDTH_PX])
  const addDaysSafe = useCallback((date: Date, days: number) => startOfDay(addDays(date, days)), [])

  // メモ化されたマウスダウンハンドラー
  const handleMouseDown = useCallback((event: React.MouseEvent, taskId: string, dragType: 'move' | 'resize-left' | 'resize-right') => {
    event.preventDefault()
    document.body.style.cursor = dragType === 'move' ? 'grabbing' : 'ew-resize'
    document.body.style.userSelect = 'none'
    
    const task = tasks.find(t => t.id === taskId)
    if (!task || !task.plannedStart || !task.plannedEnd) return
    
    setDragState({
      taskId,
      type: dragType,
      startClientX: event.clientX,
      originalStart: startOfDay(parseDateOnlyToLocal(task.plannedStart)),
      originalEnd: startOfDay(parseDateOnlyToLocal(task.plannedEnd)),
      previewStart: startOfDay(parseDateOnlyToLocal(task.plannedStart)),
      previewEnd: startOfDay(parseDateOnlyToLocal(task.plannedEnd)),
    })
  }, [tasks])

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

    const handleUp = () => {
      if (!dragState) return
      
      // ローカルステートのみ更新（保存は手動）
      const updateData = {
        plannedStart: formatAsYmd(dragState.previewStart),
        plannedEnd: formatAsYmd(dragState.previewEnd),
      }
      
      const taskId = dragState.taskId
      setDragState(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // ローカルステートを即座に更新
      if (onTaskUpdate) {
        onTaskUpdate(taskId, updateData)
      }
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [dragState, onTaskUpdate, visibleDates, clampToVisible, addDaysSafe, pxToDays])

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

  // 年ごとのセグメント（週表示用）
  const yearSegments = useMemo(() => {
    type Segment = { startIndex: number; span: number; label: string }
    const segments: Segment[] = []
    if (visibleDates.length === 0) return segments
    let i = 0
    while (i < visibleDates.length) {
      const current = visibleDates[i]
      const currentYear = current.getFullYear()
      let span = 0
      while (
        i + span < visibleDates.length &&
        visibleDates[i + span].getFullYear() === currentYear
      ) {
        span += 1
      }
      segments.push({
        startIndex: i,
        span,
        label: `${currentYear}年`,
      })
      i += span
    }
    return segments
  }, [visibleDates])

  // 週ごとのセグメント（週表示用）
  const weekSegments = useMemo(() => {
    type Segment = { startIndex: number; span: number; label: string }
    const segments: Segment[] = []
    if (visibleDates.length === 0) return segments
    
    let i = 0
    while (i < visibleDates.length) {
      const current = visibleDates[i]
      // 週の区切りを探す（次の月曜日まで）
      let span = 0
      // 最初の要素は無条件で開始。それ以降は月曜日で区切る
      while (i + span < visibleDates.length) {
        const date = visibleDates[i + span]
        // 最初の要素以外で月曜日ならブレイク
        if (span > 0 && date.getDay() === 1) break
        span++
      }

      // ラベル: その週の月曜日（または範囲開始日）の日付
      // 週またぎの月については月曜日時点の月で考える -> currentがその役割
      segments.push({
        startIndex: i,
        span,
        label: `${format(current, 'd', { locale: ja })}〜`,
      })
      i += span
    }
    return segments
  }, [visibleDates])

  // 担当者別の色を取得（TaskBarコンポーネント用）
  const getAssigneeColor = useCallback((assignee: string) => {
    const color = getAssigneeColorWithSettings(assignee, false, colorSettings)
    return color.tailwind
  }, [colorSettings])

  // 今日の日付
  const today = startOfDay(new Date())
  const todayOffset = differenceInCalendarDays(today, visibleDates[0])

  // タスクを階層構造（ツリー順）にソート
  const sortedTasks = useMemo(() => {
    if (!tasks) return []

    // 親タスクと子タスクに分類
    const rootTasks = tasks.filter(t => !t.parentId).sort((a, b) => a.order - b.order)
    const subTasksMap = new Map<string, TaskResponse[]>()
    
    tasks.forEach(t => {
      if (t.parentId) {
        const subs = subTasksMap.get(t.parentId) || []
        subs.push(t)
        subTasksMap.set(t.parentId, subs)
      }
    })

    // ツリー順にフラット化
    const result: TaskResponse[] = []
    rootTasks.forEach(root => {
      result.push(root)
      const subs = subTasksMap.get(root.id)
      if (subs) {
        // サブタスクもorder順にソート
        subs.sort((a, b) => a.order - b.order).forEach(sub => result.push(sub))
      }
    })
    
    // 念のため、孤児タスク（親が見つからない子タスク）があれば末尾に追加
    const processedIds = new Set(result.map(t => t.id))
    const orphans = tasks.filter(t => !processedIds.has(t.id)).sort((a, b) => a.order - b.order)
    result.push(...orphans)

    return result
  }, [tasks])

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* 色凡例 */}
      <div className="p-4 border-b">
        <ColorLegend 
          tasks={tasks} 
          projectId={project.id}
          colorSettings={colorSettings}
          onColorSettingsChange={setColorSettings}
        />
      </div>
      
      {/* ヘッダー部分 */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-gray-600">
              プロジェクト期間: {format(new Date(project.startDate), 'yyyy年MM月dd日', { locale: ja })} 〜 {format(headerEndDate, 'yyyy年MM月dd日', { locale: ja })}
            </p>
            <p className="text-xs text-gray-500 mt-1">💡 Enterキーでタスクを追加できます</p>
          </div>
          {/* 今日のマーカー説明 */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-0.5 h-4 bg-red-500" aria-hidden />
            <span>今日</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* タスク一覧部分 */}
        <div className="w-72 xl:w-80 border-r bg-gray-50">
          {/* タスクリストヘッダー（ガントヘッダーと同じ高さに統一） */}
          <div
            className={`${isWeekly ? 'h-[4.5rem]' : 'h-16'} border-b bg-white font-semibold flex items-center px-4`}
          >
            タスク
          </div>
          
          {/* タスク項目（各行の高さをガント行と厳密に一致させる） */}
          {sortedTasks.map((task) => (
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
                
                const srcId = dragTaskId
                const dstId = task.id
                if (!srcId || srcId === dstId) {
                  e.dataTransfer.dropEffect = 'none'
                  return
                }

                const srcTask = tasks.find(t => t.id === srcId)
                const dstTask = tasks.find(t => t.id === dstId)

                if (!srcTask || !dstTask) {
                  e.dataTransfer.dropEffect = 'none'
                  return
                }

                // 親またぎ禁止：parentIdが異なる場合はドロップ不可
                // 中項目同士(parentId=null)はOK
                // nullとundefinedを正規化して比較
                const srcParentId = srcTask.parentId || null
                const dstParentId = dstTask.parentId || null
                
                if (srcParentId !== dstParentId) {
                   e.dataTransfer.dropEffect = 'none'
                   setDropTargetId(null)
                   setDropPosition(null)
                   return
                }

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
                
                // tasks から再取得して検証
                const srcTask = tasks.find(t => t.id === srcId)
                const dstTask = tasks.find(t => t.id === dstId)
                
                const srcParentId = srcTask?.parentId || null
                const dstParentId = dstTask?.parentId || null

                if (!srcTask || !dstTask || srcParentId !== dstParentId) return
                
                // sortedTasks（表示順）をベースに並び替えを行う
                const currentIds = sortedTasks.map((t) => t.id)
                const fromIndex = currentIds.indexOf(srcId)
                const toIndex = currentIds.indexOf(dstId)
                
                if (fromIndex === -1 || toIndex === -1) return
                
                // 新しいIDリストを作成
                const newIds = [...currentIds]
                
                // 中項目（parentIdなし）の場合、子タスクも含めて移動させる
                if (!srcTask.parentId) {
                    // 子タスクのIDセットを取得
                    const childIds = tasks.filter(t => t.parentId === srcId).map(t => t.id)
                    
                    // 移動対象のインデックスを収集（srcTask + その子タスク）
                    const movingIndices = [fromIndex]
                    childIds.forEach(cid => {
                        const idx = currentIds.indexOf(cid)
                        if (idx !== -1) movingIndices.push(idx)
                    })
                    movingIndices.sort((a, b) => a - b) // 昇順ソート
                    
                    // 移動対象を抽出
                    const movingIds = movingIndices.map(idx => currentIds[idx])
                    
                    // 配列から削除（後ろから削除しないとインデックスがずれる）
                    for (let i = movingIndices.length - 1; i >= 0; i--) {
                        newIds.splice(movingIndices[i], 1)
                    }
                    
                    // 挿入位置の再計算
                    let insertBaseIndex = newIds.indexOf(dstId)
                    
                    if (dropPosition === 'after') {
                        // dstTaskの後ろに挿入するが、dstTaskの子タスクがあればその分スキップ
                        const dstChildrenIds = tasks.filter(t => t.parentId === dstId).map(t => t.id)
                        insertBaseIndex += 1 // dstIdの次
                        
                        // dstChildrenIds の分だけ進める
                        while (insertBaseIndex < newIds.length && dstChildrenIds.includes(newIds[insertBaseIndex])) {
                            insertBaseIndex++
                        }
                    }
                    
                    // 挿入
                    newIds.splice(insertBaseIndex, 0, ...movingIds)
                    
                } else {
                    // 小項目の場合：単体移動
                    newIds.splice(fromIndex, 1)
                    let insertIndex = newIds.indexOf(dstId)
                    if (dropPosition === 'after') insertIndex += 1
                    newIds.splice(insertIndex, 0, srcId)
                }

                handleReorder(newIds)
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
                <div className={`w-full flex items-center justify-between gap-2 ${task.parentId ? 'pl-6 border-l-2 border-gray-200 ml-2' : ''}`}>
                  <div className="min-w-0">
                    <div className={`font-medium text-sm leading-none truncate ${task.isCompleted ? 'line-through text-gray-500' : ''} ${!task.parentId ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                      {task.title}
                      {task.isCompleted && <span className="ml-2 text-xs text-green-600">✓ 完了</span>}
                    </div>
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
                        if (onTaskDuplicate) {
                          await onTaskDuplicate(task)
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
                      if (onTaskDelete) {
                        await onTaskDelete(task)
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
          {/* 日付ヘッダー */}
          <div className="border-b bg-white" style={{ width: `${timelineWidthPx}px` }}>
            {isWeekly ? (
              <>
                {/* 年行 */}
                <div
                  className="h-6 grid text-center text-xs border-b"
                  style={{ gridTemplateColumns: `repeat(${visibleDates.length}, ${DAY_WIDTH_PX}px)` }}
                >
                  {yearSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="border-r flex items-center justify-center font-medium bg-gray-50"
                      style={{ gridColumn: `${seg.startIndex + 1} / span ${seg.span}` }}
                    >
                      {seg.label}
                    </div>
                  ))}
                </div>
                {/* 月行 */}
                <div
                  className="h-6 grid text-center text-xs border-b"
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
                {/* 週行 */}
                <div
                  className="h-6 grid text-center text-xs"
                  style={{ gridTemplateColumns: `repeat(${visibleDates.length}, ${DAY_WIDTH_PX}px)` }}
                >
                  {weekSegments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="border-r flex items-center justify-center text-[10px] text-gray-600"
                      style={{ gridColumn: `${seg.startIndex + 1} / span ${seg.span}` }}
                    >
                      {seg.label}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
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
                  {visibleDates.map((date, index) => {
                    const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                    const holidayName = isJapaneseHoliday(date)
                    const isHoliday = !!holidayName
                    const isWeekendDay = isWeekend(date)
                    
                    // 背景色の優先順位: 今日 > 祝日 > 週末
                    let bgClass = ''
                    if (isToday) {
                      bgClass = 'bg-yellow-100'
                    } else if (isHoliday) {
                      bgClass = 'bg-pink-50'
                    } else if (isWeekendDay) {
                      bgClass = 'bg-blue-50'
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`border-r text-center text-xs p-1 flex flex-col items-center justify-center leading-tight ${bgClass}`}
                        title={holidayName ? holidayName : undefined}
                      >
                        <div className="text-sm font-semibold">{format(date, 'd', { locale: ja })}</div>
                        <div className="text-[10px] text-gray-500">{format(date, 'EEE', { locale: ja })}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* ガントバー（タイムライン幅を固定pxで管理） */}
          <div className="relative" style={{ width: `${timelineWidthPx}px` }}>
            {/* 背景の日付グリッド（ヘッダーと同じピッチで縦ライン） */}
            <div
              aria-hidden
              className="absolute inset-0 grid pointer-events-none z-0"
              style={{ gridTemplateColumns: `repeat(${visibleDates.length}, ${DAY_WIDTH_PX}px)` }}
            >
              {visibleDates.map((date, index) => {
                const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
                const holidayName = isJapaneseHoliday(date)
                const isHoliday = !!holidayName
                const isWeekendDay = isWeekend(date)
                
                // 背景色の優先順位: 今日 > 祝日 > 週末
                let bgClass = ''
                if (isToday) {
                  bgClass = 'bg-yellow-100/30'
                } else if (isHoliday) {
                  bgClass = 'bg-pink-50/50'
                } else if (isWeekendDay) {
                  bgClass = 'bg-blue-50/50'
                }

                // 週単位表示の場合、日曜日の右側のみボーダーを表示（ただし最終列は常にボーダー）
                const showBorder = isWeekly 
                  ? (date.getDay() === 0 || index === visibleDates.length - 1) 
                  : true
                
                return (
                  <div
                    key={index}
                    className={`${showBorder ? 'border-r' : ''} ${bgClass}`}
                  />
                )
              })}
            </div>
            {/* 今日のライン */}
            {todayOffset >= 0 && todayOffset < visibleDates.length && (
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: `${todayOffset * DAY_WIDTH_PX}px` }}
              />
            )}
            
            {sortedTasks.map((task) => (
              <div key={task.id} className="h-12 border-b relative">
                <TaskBar
                  task={task}
                  visibleDates={visibleDates}
                  dragState={dragState}
                  DAY_WIDTH_PX={DAY_WIDTH_PX}
                  onMouseDown={handleMouseDown}
                  onEditTask={onEditTask}
                  getAssigneeColor={getAssigneeColor}
                />
              </div>
            ))}
            
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
