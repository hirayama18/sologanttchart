'use client'

import { useState, useEffect, useMemo } from 'react'
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
  tasks?: TaskResponse[] // 親タスク選択用
  // ローカルステート更新用（手動保存方式）
  onLocalTaskAdd?: (taskData: CreateTaskRequest) => TaskResponse
  onLocalTaskUpdate?: (taskId: string, updates: Partial<TaskResponse>) => void
}

export function TaskForm({ 
  open, 
  onOpenChange, 
  onTaskCreated, 
  projectId, 
  task, 
  tasks, 
  onLocalTaskAdd,
  onLocalTaskUpdate
}: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([])
  const [formData, setFormData] = useState({
    title: '',
    assignee: '',
    plannedStart: new Date().toISOString().split('T')[0],
    plannedEnd: new Date().toISOString().split('T')[0],
    completedAt: '',  // 空文字列は未完了を表す
    parentId: 'none'  // 'none'は親なし（中項目）
  })

  const isEditMode = !!task
  const isParentTask = formData.parentId === 'none'

  // 親タスク候補の計算
  const parentOptions = useMemo(() => {
    if (!tasks) return []
    // 編集時は自分自身を親にできない。
    // また、簡易的に「現在親を持っていないタスク（ルートタスク）」のみを親候補とする（2階層制限）。
    return tasks.filter(t => !t.parentId && t.id !== task?.id)
  }, [tasks, task])

  // 担当者選択肢を読み込み
  useEffect(() => {
    const loadAssigneeOptions = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/assignees`)
        if (response.ok) {
          const options = await response.json()
          setAssigneeOptions(options.sort((a: AssigneeOption, b: AssigneeOption) => a.order - b.order))
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
        plannedStart: task.plannedStart ? task.plannedStart.slice(0, 10) : new Date().toISOString().split('T')[0],
        plannedEnd: task.plannedEnd ? task.plannedEnd.slice(0, 10) : new Date().toISOString().split('T')[0],
        completedAt: task.completedAt ? task.completedAt.slice(0, 10) : '',
        parentId: task.parentId || 'none'
      })
    } else {
      // 新規作成モード: 初期値を設定
      const defaultAssignee = assigneeOptions.length > 0 ? assigneeOptions[0].name : ''
      setFormData({
        title: '',
        assignee: defaultAssignee,
        plannedStart: new Date().toISOString().split('T')[0],
        plannedEnd: new Date().toISOString().split('T')[0],
        completedAt: '',
        parentId: 'none'
      })
    }
  }, [task, assigneeOptions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditMode && task && onLocalTaskUpdate) {
        // 編集モード：ローカルステートを更新
        const updates: Partial<TaskResponse> = {
          title: formData.title,
          assignee: formData.assignee,
          plannedStart: isParentTask ? null : formData.plannedStart,
          plannedEnd: isParentTask ? null : formData.plannedEnd,
          completedAt: formData.completedAt || null,
          parentId: isParentTask ? null : formData.parentId
        }
        
        onLocalTaskUpdate(task.id, updates)
        onTaskCreated(task) // モーダルを閉じるためのコールバック
        onOpenChange(false)
        
      } else if (!isEditMode && onLocalTaskAdd) {
        // 新規作成モード：ローカルステートに追加
        const taskData: CreateTaskRequest = {
          title: formData.title,
          assignee: formData.assignee,
          plannedStart: isParentTask ? null : formData.plannedStart,
          plannedEnd: isParentTask ? null : formData.plannedEnd,
          projectId,
          completedAt: formData.completedAt || null,
          parentId: isParentTask ? null : formData.parentId
        }

        const newTask = onLocalTaskAdd(taskData)
        onTaskCreated(newTask)
        onOpenChange(false)
        
        // フォームをリセット
        const defaultAssignee = assigneeOptions.length > 0 ? assigneeOptions[0].name : ''
        setFormData({
          title: '',
          assignee: defaultAssignee,
          plannedStart: new Date().toISOString().split('T')[0],
          plannedEnd: new Date().toISOString().split('T')[0],
          completedAt: '',
          parentId: 'none'
        })
        
      } else {
        // フォールバック（onLocalTaskAdd/onLocalTaskUpdateが提供されていない場合）
        // 従来のAPI呼び出し（互換性のため残す）
        const url = isEditMode && task ? `/api/tasks/${task.id}` : '/api/tasks'
        const method = isEditMode ? 'PATCH' : 'POST'
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestData: any = {
          title: formData.title,
          assignee: formData.assignee,
          plannedStart: isParentTask ? null : formData.plannedStart,
          plannedEnd: isParentTask ? null : formData.plannedEnd,
          projectId,
          completedAt: formData.completedAt || null,
          parentId: isParentTask ? null : formData.parentId
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
              completedAt: '',
              parentId: 'none'
            })
          }
        } else {
          const errorData = await response.json().catch(() => null)
          const errorMessage = errorData?.message || errorData?.error || response.statusText || 'API request failed'
          throw new Error(errorMessage)
        }
      }
    } catch (error) {
      console.error('Error saving task:', error)
      alert(`タスクの保存中にエラーが発生しました。\n詳細: ${(error as Error).message}`)
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
                     (isParentTask || (
                       formData.plannedStart !== '' && 
                       formData.plannedEnd !== '' &&
                       new Date(formData.plannedStart) <= new Date(formData.plannedEnd)
                     ))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'タスクを編集' : '新しいタスクを作成'}</DialogTitle>
          <DialogDescription>
            タスクの詳細情報を入力してください。
            {onLocalTaskAdd && <span className="text-amber-600 ml-1">※変更は保存ボタンを押すまで反映されません</span>}
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
              <Label htmlFor="parentId" className="text-right">
                親タスク
              </Label>
              <Select value={formData.parentId} onValueChange={(value) => handleInputChange('parentId', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="親タスクを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし（中項目として作成）</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {!isParentTask && (
              <>
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
                    required={!isParentTask}
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
                    required={!isParentTask}
                  />
                </div>
              </>
            )}
            
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
              {loading ? '処理中...' : isEditMode ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
