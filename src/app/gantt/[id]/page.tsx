 'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProjectWithTasksResponse, TaskResponse } from '@/lib/types/api'
import { GanttChart } from '@/components/features/gantt/gantt-chart'
import { TaskForm } from '@/components/features/tasks/task-form'
import { AssigneeSettingsDialog } from '@/components/features/projects/assignee-settings-dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3, Plus, Download, Calendar as CalendarIcon, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useOptimizedTaskOperations } from '@/hooks/useOptimizedTaskOperations'
import { useDebounce } from '@/hooks/useDebounce'
import { usePersistentViewScale } from '@/hooks/usePersistentViewScale'

export default function GanttPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [project, setProject] = useState<ProjectWithTasksResponse | null>(null)
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskResponse | undefined>(undefined)
  const [editingProject, setEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState<{ title: string; startDate: string; endDate: string | '' }>({
    title: '',
    startDate: '',
    endDate: '',
  })
  const [viewScale, setViewScale] = usePersistentViewScale(projectId)
  const [exporting, setExporting] = useState(false)
  const viewScaleLabel = viewScale === 'DAY' ? '日' : '週'

  // onTasksChange用の再取得：デバウンス + 中断対応 + 差分マージ
  const refreshAbortRef = useRef<AbortController | null>(null)

  const mergeTasksById = useCallback((current: TaskResponse[], incoming: TaskResponse[]): TaskResponse[] => {
    const currentMap = new Map(current.map(t => [t.id, t]))
    // サーバー順（order）に従う
    return incoming.map(next => {
      const prev = currentMap.get(next.id)
      if (!prev) return next
      // 主要フィールドに変化がなければ参照を保つ（再レンダリング抑制）
      const same = (
        prev.title === next.title &&
        prev.assignee === next.assignee &&
        prev.plannedStart === next.plannedStart &&
        prev.plannedEnd === next.plannedEnd &&
        prev.order === next.order &&
        prev.completedAt === next.completedAt
      )
      return same ? prev : next
    })
  }, [])

  const refetchProjectNow = useCallback(async () => {
    try {
      // 直前のリクエストを中断
      if (refreshAbortRef.current) {
        refreshAbortRef.current.abort()
      }
      const controller = new AbortController()
      refreshAbortRef.current = controller

      const response = await fetch(`/api/projects/${projectId}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      })
      if (!response.ok) return
      const projectData: ProjectWithTasksResponse = await response.json()
      setProject(projectData)
      setTasks(prev => mergeTasksById(prev, projectData.tasks))
    } catch {
      // 中断は無視
    }
  }, [projectId, mergeTasksById])

  const refetchProjectDebounced = useDebounce(refetchProjectNow, 500)

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        cache: 'no-store', // キャッシュを無効化
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (response.ok) {
        const projectData: ProjectWithTasksResponse = await response.json()
        // デバッグ用ログ
        console.log('Frontend - Project data received:', projectData)
        console.log('Frontend - Tasks with completedAt:', projectData.tasks.filter(task => task.completedAt))
        setProject(projectData)
        setTasks(projectData.tasks)
      } else {
        console.error('Failed to fetch project')
        router.push('/projects')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      router.push('/projects')
    } finally {
      setLoading(false)
    }
  }, [projectId, router])

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId, fetchProject])

  useEffect(() => {
    if (project) {
      setProjectForm({
        title: project.title,
        // ローカル日付として扱う（YYYY-MM-DD）
        startDate: project.startDate.slice(0, 10),
        endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      })
    }
  }, [project])

  // Enterキーでタスク作成フォームを開く（ガントチャートに統一）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // フォームが開いている場合やinput/textareaにフォーカスがある場合は無視
      if (taskFormOpen || 
          event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLButtonElement) {
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        setTaskFormOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [taskFormOpen])

  const handleTasksChange = () => {
    // 連続更新をまとめて再取得
    refetchProjectDebounced()
  }

  // 楽観的UI更新：特定のタスクのみローカル状態で更新
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<TaskResponse>) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    )
  }, [])

  // 楽観的UI更新：新しいタスクをローカル状態に追加
  const handleTaskAdd = useCallback((task: TaskResponse) => {
    setTasks(prevTasks => [...prevTasks, task])
  }, [])

  // 楽観的UI更新：タスクをローカル状態から削除
  const handleTaskRemove = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
  }, [])

  // 楽観的UI更新：タスクの並び順を変更
  const handleTaskReorder = useCallback((newOrderIds: string[]) => {
    setTasks(prevTasks => {
      // 新しい順序に基づいてタスクを並び替え
      const taskMap = new Map(prevTasks.map(task => [task.id, task]))
      const reorderedTasks = newOrderIds
        .map(id => taskMap.get(id))
        .filter((task): task is TaskResponse => task !== undefined)
        .map((task, index) => ({
          ...task,
          order: index + 1 // orderフィールドも更新
        }))
      
      return reorderedTasks
    })
  }, [])

  // 最適化されたタスク操作フック（新規作成・編集・コピー・削除）
  const { createTask, editTask, duplicateTask, deleteTask } = useOptimizedTaskOperations({
    onLocalTaskAdd: handleTaskAdd,
    onLocalTaskUpdate: handleTaskUpdate,
    onLocalTaskRemove: handleTaskRemove,
    onBatchRefresh: handleTasksChange
  })

  const handleTaskCreated = () => {
    setTaskFormOpen(false)
    handleTasksChange()
  }

  // 新規作成ボタン
  const openCreateForm = () => {
    setEditingTask(undefined)
    setTaskFormOpen(true)
  }

  const handleExport = useCallback(async (scale?: 'DAY' | 'WEEK') => {
    const resolvedScale = scale ?? viewScale
    setExporting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeScale: resolvedScale })
      })
      if (!res.ok) throw new Error('export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'gantt.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('エクスポートに失敗しました。')
      console.error(e)
    } finally {
      setExporting(false)
    }
  }, [projectId, viewScale])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4 animate-spin" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">プロジェクトが見つかりません</h1>
          <p className="text-gray-600 mb-4">指定されたプロジェクトが存在しないか、アクセス権限がありません。</p>
          <Button onClick={() => router.push('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            プロジェクト一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/projects')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                プロジェクト一覧
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                <p className="text-gray-600">ガントチャート</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <div className="text-sm text-gray-500 mr-2">総タスク数: {tasks.length}件</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">ビュー</span>
                <Select value={viewScale} onValueChange={(value) => setViewScale(value as 'DAY' | 'WEEK')}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="表示単位を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAY">日表示</SelectItem>
                    <SelectItem value="WEEK">週表示</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AssigneeSettingsDialog 
                projectId={projectId}
                onOptionsUpdate={() => {
                  // 担当者設定が変更されたらタスクフォームを再読み込み
                  // 実際の実装では、タスクフォームの担当者選択肢を更新する必要がある
                }}
              />
              <Button
                size="sm"
                variant={editingProject ? 'default' : 'outline'}
                onClick={() => setEditingProject((v) => !v)}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {editingProject ? '編集中' : 'プロジェクト名・期間を編集'}
              </Button>
              <Button size="sm" onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                新しいタスク
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exporting ? 'エクスポート中...' : 'エクスポート'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>エクスポートの単位</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleExport(viewScale)}>
                    <div className="flex w-full items-center justify-between">
                      <span>現在のビュー（{viewScaleLabel}）</span>
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('DAY')}>
                    <div className="flex w-full items-center justify-between">
                      <span>日単位でエクスポート</span>
                      {viewScale === 'DAY' && <Check className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('WEEK')}>
                    <div className="flex w-full items-center justify-between">
                      <span>週単位でエクスポート</span>
                      {viewScale === 'WEEK' && <Check className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ（ガントチャートに統一） */}
      <main className="w-full px-4 py-6">
        <div className="space-y-6">
          {editingProject && (
            <div className="bg-white border rounded-lg p-4 flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-gray-600">プロジェクト名</span>
                <Input
                  type="text"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="プロジェクト名を入力"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">開始日</span>
                <Input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">終了日</span>
                <Input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const payload: { title?: string; startDate: string; endDate: string | null } = {
                      title: projectForm.title?.trim() ? projectForm.title : undefined,
                      // サーバー側はISOで受けるが、ローカル日をUTCずれなくISOにする
                      startDate: new Date(projectForm.startDate + 'T00:00:00').toISOString(),
                      endDate: projectForm.endDate ? new Date(projectForm.endDate + 'T00:00:00').toISOString() : null,
                    }
                    const res = await fetch(`/api/projects/${projectId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    })
                    if (!res.ok) throw new Error('update failed')
                    await fetchProject()
                    setEditingProject(false)
                  } catch (e) {
                    console.error(e)
                    alert('プロジェクト期間の更新に失敗しました')
                  }
                }}
              >
                保存
              </Button>
            </div>
          )}
          
          <GanttChart
            project={project}
            tasks={tasks}
            viewScale={viewScale}
            onTasksChange={handleTasksChange}
            onTaskUpdate={handleTaskUpdate}
            onTaskDuplicate={duplicateTask}
            onTaskDelete={deleteTask}
            onTaskReorder={handleTaskReorder}
            onEditTask={(task) => {
              setEditingTask(task)
              setTaskFormOpen(true)
            }}
          />
        </div>
      </main>

      {/* タスク作成フォーム */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open)
          if (!open) {
            // モーダルを閉じるときに編集状態をリセット
            setEditingTask(undefined)
          }
        }}
        onTaskCreated={() => {
          setEditingTask(undefined)
          handleTaskCreated()
        }}
        projectId={projectId}
        task={editingTask}
        tasks={tasks}
        optimizedCreateTask={createTask}
        optimizedEditTask={editTask}
      />
    </div>
  )
}