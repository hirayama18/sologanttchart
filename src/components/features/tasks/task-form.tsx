'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CreateTaskRequest, TaskResponse } from '@/lib/types/api'
import { TaskAssignee } from '@/lib/types/database'

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated: (task: TaskResponse) => void
  projectId: string
  task?: TaskResponse // 編集モード用
}

export function TaskForm({ open, onOpenChange, onTaskCreated, projectId, task }: TaskFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: task?.title || '',
    assignee: task?.assignee || TaskAssignee.COMPANY,
    plannedStart: task?.plannedStart ? new Date(task.plannedStart).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    plannedEnd: task?.plannedEnd ? new Date(task.plannedEnd).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  })

  const isEditMode = !!task

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEditMode ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = isEditMode ? 'PATCH' : 'POST'
      
      const requestData: CreateTaskRequest = {
        title: formData.title,
        assignee: formData.assignee,
        plannedStart: new Date(formData.plannedStart).toISOString(),
        plannedEnd: new Date(formData.plannedEnd).toISOString(),
        projectId
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const taskResponse: TaskResponse = await response.json()
        onTaskCreated(taskResponse)
        onOpenChange(false)
        if (!isEditMode) {
          setFormData({
            title: '',
            assignee: TaskAssignee.COMPANY,
            plannedStart: new Date().toISOString().split('T')[0],
            plannedEnd: new Date().toISOString().split('T')[0]
          })
        }
      } else {
        console.error('Failed to save task')
        alert('タスクの保存に失敗しました。')
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
                  <SelectItem value={TaskAssignee.COMPANY}>弊社</SelectItem>
                  <SelectItem value={TaskAssignee.CLIENT}>お客様</SelectItem>
                  <SelectItem value={TaskAssignee.BOTH}>弊社/お客様</SelectItem>
                  <SelectItem value={TaskAssignee.OTHER}>その他</SelectItem>
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