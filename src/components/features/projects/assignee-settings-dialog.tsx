"use client"

import { useState, useEffect, useCallback } from 'react'
import { Settings, Plus, X, GripVertical } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AssigneeOption {
  name: string
  order: number
}

interface AssigneeSettingsDialogProps {
  projectId: string
  onOptionsUpdate?: (options: AssigneeOption[]) => void
  disabled?: boolean
}

export function AssigneeSettingsDialog({
  projectId,
  onOptionsUpdate,
  disabled = false
}: AssigneeSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<AssigneeOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadAssigneeOptions = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/assignees`)
      if (response.ok) {
        const data = await response.json()
        setOptions(data.sort((a: AssigneeOption, b: AssigneeOption) => a.order - b.order))
      } else {
        console.error('Failed to load assignee options')
      }
    } catch (error) {
      console.error('Error loading assignee options:', error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // ダイアログが開かれたときに現在の設定を読み込み
  useEffect(() => {
    if (open) {
      loadAssigneeOptions()
    }
  }, [open, loadAssigneeOptions])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // 順序を正規化（0から連番）
      const normalizedOptions = options
        .filter(option => option.name.trim() !== '')
        .map((option, index) => ({
          name: option.name.trim(),
          order: index
        }))

      const response = await fetch(`/api/projects/${projectId}/assignees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: normalizedOptions }),
      })

      if (response.ok) {
        if (onOptionsUpdate) {
          onOptionsUpdate(normalizedOptions)
        }
        setOpen(false)
      } else {
        const errorData = await response.json()
        alert(`保存に失敗しました: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error saving assignee options:', error)
      alert('保存中にエラーが発生しました')
    } finally {
      setIsSaving(false)
    }
  }

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, { name: '', order: options.length }])
    }
  }

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    // 順序を再調整
    setOptions(newOptions.map((option, i) => ({ ...option, order: i })))
  }

  const updateOptionName = (index: number, name: string) => {
    setOptions(options.map((option, i) => 
      i === index ? { ...option, name } : option
    ))
  }

  const moveOption = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= options.length) return
    
    const newOptions = [...options]
    const [moved] = newOptions.splice(fromIndex, 1)
    newOptions.splice(toIndex, 0, moved)
    
    // 順序を再調整
    setOptions(newOptions.map((option, i) => ({ ...option, order: i })))
  }

  const canSave = options.filter(o => o.name.trim() !== '').length > 0 &&
                  options.filter(o => o.name.trim() !== '').length <= 4

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          担当者設定
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            担当者選択肢の設定
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            このプロジェクトで使用する担当者の選択肢を設定できます（最大4つ）。
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-500">読み込み中...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="cursor-move">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </div>
                  
                  <div className="flex-1">
                    <Label htmlFor={`option-${index}`} className="sr-only">
                      担当者 {index + 1}
                    </Label>
                    <Input
                      id={`option-${index}`}
                      value={option.name}
                      onChange={(e) => updateOptionName(index, e.target.value)}
                      placeholder={`担当者 ${index + 1}`}
                      maxLength={20}
                    />
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(index, index - 1)}
                      disabled={index === 0}
                      className="h-8 w-8 p-0"
                      title="上に移動"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveOption(index, index + 1)}
                      disabled={index === options.length - 1}
                      className="h-8 w-8 p-0"
                      title="下に移動"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      disabled={options.length <= 1}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      title="削除"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {options.length < 4 && (
                <Button
                  variant="outline"
                  onClick={addOption}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  担当者を追加
                </Button>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            <div>• 最大4つまで設定可能</div>
            <div>• 上下ボタンで表示順序を変更できます</div>
            <div>• 既存のタスクの担当者は自動的に更新されません</div>
          </div>
          
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
