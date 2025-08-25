"use client"

import { useMemo, useState, useCallback } from 'react'
import { TaskResponse } from '@/lib/types/api'
import { COMPLETED_COLOR, getAssigneeColorWithSettings } from '@/lib/colors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ColorPickerDialog } from './color-picker-dialog'
import { Button } from '@/components/ui/button'
import { Palette, RotateCcw } from 'lucide-react'

interface ColorLegendProps {
  tasks: TaskResponse[]
  projectId: string
  colorSettings?: Record<string, number>
  onColorSettingsChange?: (settings: Record<string, number>) => void
}

export function ColorLegend({ tasks, projectId, colorSettings = {}, onColorSettingsChange }: ColorLegendProps) {
  // プロジェクト内で使用されている担当者を抽出
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set(tasks.map(task => task.assignee))
    return Array.from(uniqueAssignees).sort()
  }, [tasks])

  const [isUpdating, setIsUpdating] = useState(false)

  // 担当者ごとの色マッピングを取得（カスタム設定を考慮）
  const colorMapping = useMemo(() => {
    const mapping: Record<string, { name: string; tailwind: string; hex: string; rgb: { r: number; g: number; b: number } }> = {}
    for (const assignee of assignees) {
      mapping[assignee] = getAssigneeColorWithSettings(assignee, false, colorSettings)
    }
    return mapping
  }, [assignees, colorSettings])

  // 色設定を更新
  const handleColorSelect = useCallback(async (assignee: string, colorIndex: number) => {
    if (!onColorSettingsChange) return
    
    setIsUpdating(true)
    try {
      // APIを呼び出して色設定を保存
      const response = await fetch(`/api/projects/${projectId}/colors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignee, colorIndex }),
      })
      
      if (response.ok) {
        // ローカル状態を更新
        const newSettings = { ...colorSettings, [assignee]: colorIndex }
        onColorSettingsChange(newSettings)
      } else {
        console.error('Failed to update color settings')
      }
    } catch (error) {
      console.error('Error updating color settings:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [projectId, colorSettings, onColorSettingsChange])

  // 色設定をリセット
  const handleColorReset = useCallback(async (assignee: string) => {
    if (!onColorSettingsChange) return
    
    setIsUpdating(true)
    try {
      // APIを呼び出して色設定を削除
      const response = await fetch(`/api/projects/${projectId}/colors?assignee=${encodeURIComponent(assignee)}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        // ローカル状態から削除
        const newSettings = { ...colorSettings }
        delete newSettings[assignee]
        onColorSettingsChange(newSettings)
      } else {
        console.error('Failed to reset color settings')
      }
    } catch (error) {
      console.error('Error resetting color settings:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [projectId, colorSettings, onColorSettingsChange])

  // 全色設定をリセット
  const handleResetAll = useCallback(async () => {
    if (!onColorSettingsChange) return
    
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/colors`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        onColorSettingsChange({})
      } else {
        console.error('Failed to reset all color settings')
      }
    } catch (error) {
      console.error('Error resetting all color settings:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [projectId, onColorSettingsChange])

  if (assignees.length === 0) {
    return null
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            色分け凡例
          </CardTitle>
          {Object.keys(colorSettings).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              disabled={isUpdating}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              全リセット
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3">
          {/* 担当者ごとの色（編集可能） */}
          {assignees.map((assignee) => {
            const color = colorMapping[assignee]
            const currentColorIndex = colorSettings[assignee]
            
            return (
              <div key={assignee} className="flex items-center gap-2">
                <div className="relative">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: `#${color.hex}` }}
                    title={color.name}
                  />
                  <div className="absolute -top-1 -right-1">
                    <ColorPickerDialog
                      assignee={assignee}
                      currentColorIndex={currentColorIndex}
                      onColorSelect={handleColorSelect}
                      onColorReset={handleColorReset}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
                <span className="text-sm text-gray-700">{assignee}</span>
                {currentColorIndex !== undefined && (
                  <span className="text-xs text-blue-600">(カスタム)</span>
                )}
              </div>
            )
          })}
          
          {/* 完了済みタスクの色（編集不可） */}
          <div className="flex items-center gap-2">
            <div 
              className={`w-4 h-4 rounded ${COMPLETED_COLOR.tailwind} border border-gray-300`}
              title={COMPLETED_COLOR.name}
            />
            <span className="text-sm text-gray-700">完了済み</span>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          {onColorSettingsChange 
            ? '💡 色をクリックして担当者ごとの表示色をカスタマイズできます'
            : '※ 担当者ごとに自動的に色が割り当てられます'
          }
        </p>
      </CardContent>
    </Card>
  )
}
