'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ShiftTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSuccess?: () => void
}

export function ShiftTasksDialog({ open, onOpenChange, projectId, onSuccess }: ShiftTasksDialogProps) {
  const [days, setDays] = useState<string>('0')
  const [loading, setLoading] = useState(false)
  const [includeCompleted, setIncludeCompleted] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const daysNum = parseInt(days, 10)
    if (isNaN(daysNum) || daysNum === 0) {
      alert('日数を入力してください（0以外の整数）')
      return
    }

    if (Math.abs(daysNum) > 3650) {
      alert('日数は±3650日以内で入力してください')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/shift-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          days: daysNum,
          includeCompleted 
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'シフトに失敗しました')
      }

      const result = await response.json()
      alert(`${result.updatedCount}件のタスクの日付を${daysNum > 0 ? '+' : ''}${daysNum}日シフトしました。`)
      
      onOpenChange(false)
      setDays('0')
      onSuccess?.()
    } catch (error) {
      console.error('Shift tasks error:', error)
      alert(`タスクの日付シフトに失敗しました。\n詳細: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>タスク日付をシフト</DialogTitle>
          <DialogDescription>
            プロジェクト内の全タスクの開始日・終了日を一括で指定した日数分シフトします。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="days" className="text-right">
                日数
              </Label>
              <div className="col-span-3">
                <Input
                  id="days"
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="例: 7（7日後へ）"
                  required
                  min="-3650"
                  max="3650"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  正の数で後ろへ、負の数で前へシフトします（例: +7で7日後、-3で3日前）
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="includeCompleted" className="text-right">
                対象
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <input
                  id="includeCompleted"
                  type="checkbox"
                  checked={includeCompleted}
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                  className="h-4 w-4 accent-black"
                />
                <span className="text-sm text-gray-600">完了済みタスクも含める</span>
              </div>
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
              disabled={loading || parseInt(days, 10) === 0}
            >
              {loading ? '処理中...' : 'シフト実行'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


