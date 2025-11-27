"use client"

import { useState } from "react"
import { motion, Reorder } from "framer-motion"
import { GripVertical, User2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  assignee: string
  status: "todo" | "in-progress" | "done"
  start: number // 1-7 (day index)
  duration: number // days
  color: string
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "要件定義・設計",
    assignee: "田中",
    status: "done",
    start: 0,
    duration: 3,
    color: "bg-blue-500"
  },
  {
    id: "2",
    title: "UIデザイン作成",
    assignee: "佐藤",
    status: "in-progress",
    start: 2,
    duration: 4,
    color: "bg-purple-500"
  },
  {
    id: "3",
    title: "フロントエンド実装",
    assignee: "鈴木",
    status: "todo",
    start: 5,
    duration: 5,
    color: "bg-green-500"
  },
  {
    id: "4",
    title: "API連携・テスト",
    assignee: "高橋",
    status: "todo",
    start: 8,
    duration: 3,
    color: "bg-orange-500"
  }
]

export function HeroPreview() {
  const [tasks, setTasks] = useState(initialTasks)
  const [viewMode, setViewMode] = useState<"day" | "week">("day")

  return (
    <div className="relative w-full max-w-5xl mx-auto perspective-1000">
      {/* ブラウザ枠のようなコンテナ */}
      <motion.div
        initial={{ rotateX: 20, opacity: 0, y: 100 }}
        animate={{ rotateX: 0, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative bg-white/90 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl overflow-hidden dark:bg-slate-900/90 dark:border-slate-800"
      >
        {/* ヘッダーバー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="ml-4 px-3 py-1 bg-white dark:bg-slate-800 rounded-md text-xs font-medium text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              プロジェクト管理ボード
            </div>
          </div>
          
          {/* ビュー切り替えトグル */}
          <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setViewMode("day")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                viewMode === "day" 
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
              )}
            >
              日単位
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                viewMode === "week" 
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm" 
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700"
              )}
            >
              週単位
            </button>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex h-[400px] overflow-hidden">
          {/* 左側：タスクリスト（Reorder可能） */}
          <div className="w-64 flex-shrink-0 border-r border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
            <div className="h-10 border-b border-gray-100 dark:border-slate-800 px-4 flex items-center text-xs font-semibold text-gray-500 dark:text-slate-400">
              タスク名
            </div>
            <Reorder.Group axis="y" values={tasks} onReorder={setTasks} className="p-2 space-y-1">
              {tasks.map((task) => (
                <Reorder.Item key={task.id} value={task}>
                  <div className="group flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-grab active:cursor-grabbing bg-white dark:bg-slate-900 border border-transparent hover:border-gray-100 dark:hover:border-slate-700 shadow-sm hover:shadow-md">
                    <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-200 truncate">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          <User2 className="w-3 h-3" />
                          {task.assignee}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>

          {/* 右側：ガントチャートエリア */}
          <div className="flex-1 overflow-x-auto bg-gray-50/30 dark:bg-slate-900/30 relative">
            {/* グリッド背景 */}
            <div 
              className="absolute inset-0" 
              style={{ 
                backgroundImage: `linear-gradient(to right, ${viewMode === 'day' ? '#e5e7eb' : '#d1d5db'} 1px, transparent 1px)`,
                backgroundSize: `${viewMode === 'day' ? '40px' : '120px'} 100%`
              }} 
            />
            
            {/* ヘッダー（日付） */}
            <div className="h-10 border-b border-gray-200 dark:border-slate-700 flex relative">
              {Array.from({ length: 14 }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-shrink-0 border-r border-gray-200 dark:border-slate-700 flex items-center justify-center text-xs text-gray-500 font-medium transition-all duration-500",
                    viewMode === "day" ? "w-[40px]" : "w-[120px]"
                  )}
                >
                  {viewMode === "day" ? i + 1 : `Week ${i + 1}`}
                </div>
              ))}
            </div>

            {/* タスクバー描画エリア */}
            <div className="p-2 space-y-1 pt-2 relative">
              {tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layoutId={`task-bar-${task.id}`}
                  className="h-[52px] flex items-center relative" // タスクリストの高さと合わせるための調整
                >
                  <motion.div
                    initial={false}
                    animate={{
                      x: task.start * (viewMode === "day" ? 40 : 20), // シンプルな計算
                      width: task.duration * (viewMode === "day" ? 40 : 20),
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                      "h-8 rounded-full shadow-sm border border-white/20 relative group cursor-pointer",
                      task.color
                    )}
                  >
                    {/* ホバー時のツールチップ風表示 */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                      {task.duration}日間
                    </div>
                    
                    {/* 進捗バー風の装飾 */}
                    <div className="absolute left-0 top-0 bottom-0 bg-white/20 w-[40%] rounded-l-full" />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 装飾的な背景要素 */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl -z-10 animate-pulse delay-700" />
    </div>
  )
}

