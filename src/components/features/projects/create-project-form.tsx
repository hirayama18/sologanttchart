'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CreateProjectRequest, ProjectResponse } from '@/lib/types/api'
import { Plus } from 'lucide-react'

interface CreateProjectFormProps {
  onProjectCreated: (project: ProjectResponse) => void
}

export function CreateProjectForm({ onProjectCreated }: CreateProjectFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    startDate: new Date().toISOString().split('T')[0] // 今日の日付をデフォルトに
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const requestData: CreateProjectRequest = {
        title: formData.title,
        startDate: new Date(formData.startDate).toISOString()
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        const project: ProjectResponse = await response.json()
        onProjectCreated(project)
        setOpen(false)
        setFormData({
          title: '',
          startDate: new Date().toISOString().split('T')[0]
        })
      } else {
        console.error('Failed to create project')
        alert('プロジェクトの作成に失敗しました。')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      alert('プロジェクトの作成中にエラーが発生しました。')
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

  const isFormValid = formData.title.trim() !== '' && formData.startDate !== ''

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          新しいプロジェクト
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>新しいプロジェクトを作成</DialogTitle>
          <DialogDescription>
            プロジェクトの基本情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                プロジェクト名
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="col-span-3"
                placeholder="例: Webサイトリニューアル"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                開始日
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={!isFormValid || loading}
            >
              {loading ? '作成中...' : '作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}