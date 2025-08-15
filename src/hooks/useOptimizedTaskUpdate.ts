import { useCallback, useRef } from 'react'
import { TaskResponse } from '@/lib/types/api'
import { useDebounce, useBatch } from './useDebounce'

interface TaskUpdateData {
  taskId: string
  updates: Partial<TaskResponse>
  originalData: Partial<TaskResponse>
}

interface UseOptimizedTaskUpdateProps {
  onLocalUpdate: (taskId: string, updates: Partial<TaskResponse>) => void
  onBatchRefresh?: () => void
  debounceDelay?: number
  batchDelay?: number
}

/**
 * 楽観的UI更新とデバウンシング/バッチ処理を組み合わせた
 * 高度なタスク更新最適化フック
 */
export function useOptimizedTaskUpdate({
  onLocalUpdate,
  onBatchRefresh,
  debounceDelay = 500,
  batchDelay = 300
}: UseOptimizedTaskUpdateProps) {
  const pendingUpdatesRef = useRef<Map<string, TaskUpdateData>>(new Map())
  const rollbackDataRef = useRef<Map<string, Partial<TaskResponse>>>(new Map())

  // バッチ処理でAPI更新を実行
  const processBatch = useCallback(async (updates: TaskUpdateData[]) => {
    const successfulUpdates: string[] = []
    const failedUpdates: TaskUpdateData[] = []

    // 並列でAPI更新を実行
    await Promise.allSettled(
      updates.map(async ({ taskId, updates }) => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })

          if (!response.ok) {
            throw new Error(`API update failed: ${response.status}`)
          }

          successfulUpdates.push(taskId)
        } catch (error) {
          console.error(`Failed to update task ${taskId}:`, error)
          failedUpdates.push({ taskId, updates, originalData: {} })
        }
      })
    )

    // 失敗したタスクをロールバック
    failedUpdates.forEach(({ taskId }) => {
      const originalData = rollbackDataRef.current.get(taskId)
      if (originalData) {
        onLocalUpdate(taskId, originalData)
      }
    })

    // 失敗した更新があれば通知
    if (failedUpdates.length > 0) {
      alert(`${failedUpdates.length}個のタスクの更新に失敗しました。元の状態に戻します。`)
      
      // フォールバック：全データ再取得
      onBatchRefresh?.()
    }

    // 処理完了後にクリーンアップ
    successfulUpdates.forEach(taskId => {
      pendingUpdatesRef.current.delete(taskId)
      rollbackDataRef.current.delete(taskId)
    })
  }, [onLocalUpdate, onBatchRefresh])

  // デバウンシング + バッチ処理
  const batchUpdate = useBatch(processBatch, batchDelay)

  // デバウンスされたAPI更新関数
  const debouncedApiUpdate = useDebounce((taskId: string) => {
    const updateData = pendingUpdatesRef.current.get(taskId)
    if (updateData) {
      batchUpdate(updateData)
    }
  }, debounceDelay)

  // メインの更新関数
  const updateTask = useCallback((
    taskId: string,
    updates: Partial<TaskResponse>,
    originalData?: Partial<TaskResponse>
  ) => {
    // 1. 即座にローカル状態を更新（楽観的UI更新）
    onLocalUpdate(taskId, updates)

    // 2. ロールバック用データを保存
    if (originalData) {
      rollbackDataRef.current.set(taskId, originalData)
    }

    // 3. API更新をスケジューリング
    pendingUpdatesRef.current.set(taskId, {
      taskId,
      updates,
      originalData: originalData || {}
    })

    // 4. デバウンスされたAPI更新をトリガー
    debouncedApiUpdate(taskId)
  }, [onLocalUpdate, debouncedApiUpdate])

  // 即座に全ての保留中の更新を実行する関数
  const flushPendingUpdates = useCallback(() => {
    const pendingUpdates = Array.from(pendingUpdatesRef.current.values())
    if (pendingUpdates.length > 0) {
      processBatch(pendingUpdates)
      pendingUpdatesRef.current.clear()
      rollbackDataRef.current.clear()
    }
  }, [processBatch])

  // 保留中の更新をキャンセルする関数
  const cancelPendingUpdates = useCallback(() => {
    pendingUpdatesRef.current.clear()
    rollbackDataRef.current.clear()
  }, [])

  return {
    updateTask,
    flushPendingUpdates,
    cancelPendingUpdates,
    hasPendingUpdates: () => pendingUpdatesRef.current.size > 0
  }
}
