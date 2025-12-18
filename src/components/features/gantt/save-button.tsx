'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Loader2, Check, AlertCircle } from 'lucide-react'

interface SaveButtonProps {
  hasChanges: boolean
  changeCount: number
  onSave: () => Promise<boolean>
  disabled?: boolean
}

type SaveState = 'idle' | 'saving' | 'success' | 'error'

/**
 * 保存ボタン + 未保存インジケーターコンポーネント
 * - 未保存の変更がある場合は強調表示
 * - 変更件数を表示
 * - 保存中/成功/エラーの状態を表示
 */
export function SaveButton({ hasChanges, changeCount, onSave, disabled }: SaveButtonProps) {
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const handleSave = async () => {
    if (!hasChanges || saveState === 'saving') return
    
    setSaveState('saving')
    
    try {
      const success = await onSave()
      
      if (success) {
        setSaveState('success')
        // 2秒後にidleに戻す
        setTimeout(() => setSaveState('idle'), 2000)
      } else {
        setSaveState('error')
        // 3秒後にidleに戻す
        setTimeout(() => setSaveState('idle'), 3000)
      }
    } catch (error) {
      console.error('Save error:', error)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  // ボタンのスタイルを状態に応じて変更
  const getButtonVariant = () => {
    if (saveState === 'success') return 'default'
    if (saveState === 'error') return 'destructive'
    if (hasChanges) return 'default'
    return 'outline'
  }

  // ボタンのクラスを状態に応じて変更
  const getButtonClass = () => {
    if (saveState === 'success') return 'bg-green-600 hover:bg-green-700'
    if (saveState === 'error') return ''
    if (hasChanges) return 'bg-blue-600 hover:bg-blue-700 animate-pulse'
    return ''
  }

  // アイコンを状態に応じて変更
  const getIcon = () => {
    if (saveState === 'saving') return <Loader2 className="h-4 w-4 mr-2 animate-spin" />
    if (saveState === 'success') return <Check className="h-4 w-4 mr-2" />
    if (saveState === 'error') return <AlertCircle className="h-4 w-4 mr-2" />
    return <Save className="h-4 w-4 mr-2" />
  }

  // ラベルを状態に応じて変更
  const getLabel = () => {
    if (saveState === 'saving') return '保存中...'
    if (saveState === 'success') return '保存完了'
    if (saveState === 'error') return '保存失敗'
    if (hasChanges) return `保存 (${changeCount}件の変更)`
    return '保存済み'
  }

  return (
    <div className="flex items-center gap-2">
      {/* 未保存インジケーター */}
      {hasChanges && saveState === 'idle' && (
        <div className="flex items-center gap-1 text-sm text-amber-600">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>未保存</span>
        </div>
      )}
      
      {/* 保存ボタン */}
      <Button
        size="sm"
        variant={getButtonVariant()}
        className={getButtonClass()}
        onClick={handleSave}
        disabled={disabled || !hasChanges || saveState === 'saving'}
      >
        {getIcon()}
        {getLabel()}
      </Button>
    </div>
  )
}


