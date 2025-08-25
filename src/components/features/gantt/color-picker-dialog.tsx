"use client"

import { useState } from 'react'
import { Check, Palette, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { COLOR_PALETTE, getColorByIndex } from '@/lib/colors'

interface ColorPickerDialogProps {
  assignee: string
  currentColorIndex?: number
  onColorSelect: (assignee: string, colorIndex: number) => void
  onColorReset: (assignee: string) => void
  disabled?: boolean
}

export function ColorPickerDialog({
  assignee,
  currentColorIndex,
  onColorSelect,
  onColorReset,
  disabled = false
}: ColorPickerDialogProps) {
  const [open, setOpen] = useState(false)

  const handleColorSelect = (colorIndex: number) => {
    onColorSelect(assignee, colorIndex)
    setOpen(false)
  }

  const handleReset = () => {
    onColorReset(assignee)
    setOpen(false)
  }

  // 現在の色を取得（カスタム設定がない場合はデフォルト色）
  const getCurrentColor = () => {
    if (currentColorIndex !== undefined) {
      return getColorByIndex(currentColorIndex)
    }
    // デフォルト色（ハッシュベース）を表示用に取得
    let hash = 0
    for (let i = 0; i < assignee.length; i++) {
      const char = assignee.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    const defaultIndex = Math.abs(hash) % COLOR_PALETTE.length
    return COLOR_PALETTE[defaultIndex]
  }

  const currentColor = getCurrentColor()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full border-2 border-gray-300 hover:border-gray-400"
          style={{ backgroundColor: `#${currentColor.hex}` }}
          disabled={disabled}
          title={`${assignee}の色を変更`}
        >
          <Palette className="h-3 w-3 text-gray-600" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {assignee}の色を選択
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            このプロジェクト内での「{assignee}」の表示色を選択できます。
          </div>
          
          {/* 色選択グリッド */}
          <div className="grid grid-cols-5 gap-3">
            {COLOR_PALETTE.map((color, index) => {
              const isSelected = currentColorIndex === index
              const isCurrentDefault = currentColorIndex === undefined && 
                COLOR_PALETTE[Math.abs(assignee.split('').reduce((hash, char) => {
                  hash = ((hash << 5) - hash) + char.charCodeAt(0)
                  return hash & hash
                }, 0)) % COLOR_PALETTE.length] === color

              return (
                <button
                  key={index}
                  onClick={() => handleColorSelect(index)}
                  className={`
                    relative w-12 h-12 rounded-lg border-2 transition-all
                    ${isSelected ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-400'}
                    ${isCurrentDefault ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                  `}
                  style={{ backgroundColor: `#${color.hex}` }}
                  title={color.name}
                >
                  {isSelected && (
                    <Check className="h-4 w-4 text-gray-800 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  )}
                  {isCurrentDefault && !isSelected && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white" />
                  )}
                </button>
              )
            })}
          </div>
          
          {/* 色の説明 */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-800 rounded" />
              <span>選択中の色</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>デフォルト色（自動設定）</span>
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex items-center gap-2"
              disabled={currentColorIndex === undefined}
            >
              <RotateCcw className="h-4 w-4" />
              デフォルトに戻す
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
