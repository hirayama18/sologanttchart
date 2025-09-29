'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateTaskRequest, TaskResponse } from '@/lib/types/api'

interface AssigneeOption {
  name: string
  order: number
}

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated: (task: TaskResponse) => void
  projectId: string
  task?: TaskResponse // 編集モード用
  // 最適化された操作関数（楽観的UI更新対応）
  optimizedCreateTask?: (taskData: CreateTaskRequest) => Promise<TaskResponse | null>
  optimizedEditTask?: (taskId: string, uiUpdates: Partial<TaskResponse>, originalData?: Partial<TaskResponse>, apiUpdates?: Partial<CreateTaskRequest>) => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TaskForm({ open, onOpenChange, onTaskCreated, projectId, task, optimizedCreateTask, optimizedEditTask: _ }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([])
  const [formData, setFormData] = useState({
    title: '',
    assignee: '',
    plannedStart: new Date().toISOString().split('T')[0],
    plannedEnd: new Date().toISOString().split('T')[0],
    completedAt: ''  // 空文字列は未完了を表す
  })

  const isEditMode = !!task

  // 担当者選択肢を読み込み
  useEffect(() => {
    const loadAssigneeOptions = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/assignees`)
        if (response.ok) {
          const options = await response.json()
          setAssigneeOptions(options.sort((a: AssigneeOption, b: AssigneeOption) => a.order - b.order))
          
          // フォームの初期値を設定（担当者選択肢の最初の項目）
          if (options.length > 0 && !formData.assignee && !task) {
            setFormData(prev => ({ ...prev, assignee: options[0].name }))
          }
        }
      } catch (error) {
        console.error('Error loading assignee options:', error)
      }
    }
    
    if (projectId) {
      loadAssigneeOptions()
    }
  }, [projectId])

  // taskが変更されたときにフォームデータを更新
  useEffect(() => {
    if (task) {
      // 編集モード: タスクの現在値を設定（ローカル日付として扱う）
      setFormData({
        title: task.title,
        assignee: task.assignee,
        plannedStart: task.plannedStart.slice(0, 10),
        plannedEnd: task.plannedEnd.slice(0, 10),
        completedAt: task.completedAt ? task.completedAt.slice(0, 10) : ''
      })
    } else {
      // 新規作成モード: 初期値を設定
      const defaultAssignee = assigneeOptions.length > 0 ? assigneeOptions[0].name : ''
      setFormData({
        title: '',
        assignee: defaultAssignee,
        plannedStart: new Date().toISOString().split('T')[0],
        plannedEnd: new Date().toISOString().split('T')[0],
        completedAt: ''
      })
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (false) { // 一時的に楽観的UI更新を無効化
        // 楽観的UI更新処理（現在無効化中）
        console.log('楽観的UI更新は一時的に無効化されています')
        
      } else if (!isEditMode && optimizedCreateTask) {
        // 新規作成モード：楽観的UI更新を使用
        const requestData: CreateTaskRequest = {
          title: formData.title,
          assignee: formData.assignee,
          plannedStart: formData.plannedStart,  // YYYY-MM-DD形式で送信
          plannedEnd: formData.plannedEnd,      // YYYY-MM-DD形式で送信
          projectId,
          // orderは送信しない（DALで自動計算される）
          completedAt: formData.completedAt || null
        }

        // 楽観的UI更新（即座に仮タスクが返される）
        const taskResponse = await optimizedCreateTask(requestData)
        
        if (taskResponse) {
          // 即座にコールバック実行とモーダル非表示
          onTaskCreated(taskResponse)
          onOpenChange(false)
          
          // フォームをリセット
          const defaultAssignee = assigneeOptions.length > 0 ? assigneeOptions[0].name : ''
          setFormData({
            title: '',
            assignee: defaultAssignee,
            plannedStart: new Date().toISOString().split('T')[0],
            plannedEnd: new Date().toISOString().split('T')[0],
            completedAt: ''
          })
        }
        
      } else {
        // フォールバック：従来の同期的処理
        const url = isEditMode && task ? `/api/tasks/${task.id}` : '/api/tasks'
        const method = isEditMode ? 'PATCH' : 'POST'
        
        const requestData: CreateTaskRequest = {
          title: formData.title,
          assignee: formData.assignee,
          plannedStart: formData.plannedStart,
          plannedEnd: formData.plannedEnd,
          projectId,
          // orderは送信しない（DALで自動計算される）
          completedAt: formData.completedAt || null
        }

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        })

        if (response.ok) {
          const taskResponse: TaskResponse = await response.json()
          onTaskCreated(taskResponse)
          onOpenChange(false)
          
          if (!isEditMode) {
            const defaultAssignee = assigneeOptions.length > 0 ? assigneeOptions[0].name : ''
            setFormData({
              title: '',
              assignee: defaultAssignee,
              plannedStart: new Date().toISOString().split('T')[0],
              plannedEnd: new Date().toISOString().split('T')[0],
              completedAt: ''
            })
          }
        } else {
          throw new Error('API request failed')
        }
      }
    } catch (error) {
      console.error('Error saving task:', error)
      alert('タスクの保存中にエラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const isFormValid = formData.title.trim() !== '' && 
                     formData.plannedStart !== '' && 
                     formData.plannedEnd !== '' &&
                     new Date(formData.plannedStart) <= new Date(formData.plannedEnd)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'タスクを編集' : '新しいタスクを作成'}</DialogTitle>
          <DialogDescription>
            タスクの詳細情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                タスク名
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="col-span-3"
                placeholder="例: 要件定義"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignee" className="text-right">
                担当者
              </Label>
              <Select value={formData.assignee} onValueChange={(value) => handleInputChange('assignee', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="担当者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {assigneeOptions.map((option) => (
                    <SelectItem key={option.name} value={option.name}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plannedStart" className="text-right">
                開始日
              </Label>
              <Input
                id="plannedStart"
                type="date"
                value={formData.plannedStart}
                onChange={(e) => handleInputChange('plannedStart', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plannedEnd" className="text-right">
                終了日
              </Label>
              <Input
                id="plannedEnd"
                type="date"
                value={formData.plannedEnd}
                onChange={(e) => handleInputChange('plannedEnd', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="completedAt" className="text-right">
                完了日
              </Label>
              <Input
                id="completedAt"
                type="date"
                value={formData.completedAt}
                onChange={(e) => handleInputChange('completedAt', e.target.value)}
                className="col-span-3"
                placeholder="未完了の場合は空欄"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid || loading}
            >
              {loading ? '保存中...' : isEditMode ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}