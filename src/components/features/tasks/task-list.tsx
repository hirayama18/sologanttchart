'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { TaskForm } from './task-form'
import { TaskResponse } from '@/lib/types/api'
import { MoreHorizontal, Edit, Copy, Trash2, Plus, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface TaskListProps {
  projectId: string
  tasks: TaskResponse[]
  onTasksChange: () => void
}

export function TaskList({ projectId, tasks, onTasksChange }: TaskListProps) {
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskResponse | undefined>()

  // Enterキーイベントは親コンポーネント（ガントチャートページ）で処理

  const handleTaskCreated = () => {
    onTasksChange()
    setEditingTask(undefined)
  }

  const handleEditTask = (task: TaskResponse) => {
    setEditingTask(task)
    setTaskFormOpen(true)
  }

  const handleDuplicateTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/duplicate`, {
        method: 'POST'
      })
      
      if (response.ok) {
        onTasksChange()
      } else {
        console.error('Failed to duplicate task')
        alert('タスクの複製に失敗しました。')
      }
    } catch (error) {
      console.error('Error duplicating task:', error)
      alert('タスクの複製中にエラーが発生しました。')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('このタスクを削除しますか？')) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          onTasksChange()
        } else {
          console.error('Failed to delete task')
          alert('タスクの削除に失敗しました。')
        }
      } catch (error) {
        console.error('Error deleting task:', error)
        alert('タスクの削除中にエラーが発生しました。')
      }
    }
  }

  const handleFormClose = () => {
    setTaskFormOpen(false)
    setEditingTask(undefined)
  }

  const getAssigneeColor = (assignee: string) => {
    switch (assignee) {
      case '弊社': return 'bg-blue-100 text-blue-800'
      case 'お客様': return 'bg-green-100 text-green-800'
      case '弊社/お客様': return 'bg-purple-100 text-purple-800'
      case 'その他': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return `${diffDays}日間`
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">タスク一覧</h3>
          <p className="text-xs text-gray-500 mt-1">Enterキーでタスクを追加</p>
        </div>
        <Button onClick={() => setTaskFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新しいタスク
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">タスクがありません</h3>
          <p className="text-gray-500 mb-2">新しいタスクを作成して始めましょう。</p>
          <p className="text-sm text-gray-400 mb-4">Enterキーまたはボタンでタスクを追加できます</p>
          <Button onClick={() => setTaskFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            最初のタスクを作成
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTask(task)}>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTask(task.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        複製
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAssigneeColor(task.assignee)}`}>
                      {task.assignee}
                    </span>
                    <span className="text-sm text-gray-500">
                      {getDaysDuration(task.plannedStart, task.plannedEnd)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(task.plannedStart), 'yyyy/MM/dd', { locale: ja })} 〜 {format(new Date(task.plannedEnd), 'yyyy/MM/dd', { locale: ja })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TaskForm
        open={taskFormOpen}
        onOpenChange={handleFormClose}
        onTaskCreated={handleTaskCreated}
        projectId={projectId}
        task={editingTask}
      />
    </div>
  )
}