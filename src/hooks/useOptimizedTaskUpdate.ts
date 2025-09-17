import { useCallback, useRef } from 'react'
import { TaskResponse } from '@/lib/types/api'
import { useDebounce, useBatch } from './useDebounce'
import { useTaskUpdateQueue } from './useTaskUpdateQueue'

interface TaskUpdateData {
  taskId: string
  updates: Partial<TaskResponse>
  originalData: Partial<TaskResponse>
  timestamp: number // 更新時刻を追加
}

interface UseOptimizedTaskUpdateProps {
  onLocalUpdate: (taskId: string, updates: Partial<TaskResponse>) => void
  onBatchRefresh?: () => void
  debounceDelay?: number
  batchDelay?: number
  useQueueSystem?: boolean // キューシステムを使用するかどうか
}

/**
 * 楽観的UI更新とデバウンシング/バッチ処理を組み合わせた
 * 高度なタスク更新最適化フック
 */
export function useOptimizedTaskUpdate({
  onLocalUpdate,
  onBatchRefresh,
  debounceDelay = 1000, // 500ms → 1000ms に変更（高速操作対応）
  batchDelay = 500,     // 200ms → 500ms に変更（バッチ処理強化）
  useQueueSystem = false // デフォルトは従来の実装を使用
}: UseOptimizedTaskUpdateProps) {
  const pendingUpdatesRef = useRef<Map<string, TaskUpdateData>>(new Map())
  const rollbackDataRef = useRef<Map<string, Partial<TaskResponse>>>(new Map())

  // キューシステムの使用
  const queueSystem = useTaskUpdateQueue({
    onLocalUpdate,
    onBatchRefresh,
    processingDelay: batchDelay,
    batchWindow: debounceDelay
  })

  // 更新マージ機能
  const mergeTaskUpdates = useCallback((existing: Partial<TaskResponse>, newUpdates: Partial<TaskResponse>): Partial<TaskResponse> => {
    return {
      ...existing,
      ...newUpdates,
      // 日付フィールドは最新の値のみを保持
      plannedStart: newUpdates.plannedStart ?? existing.plannedStart,
      plannedEnd: newUpdates.plannedEnd ?? existing.plannedEnd,
      completedAt: newUpdates.completedAt ?? existing.completedAt,
    }
  }, [])

  // タスク別更新マージ機能
  const mergeUpdatesForTask = useCallback((taskId: string, newUpdates: Partial<TaskResponse>, originalData?: Partial<TaskResponse>) => {
    const existing = pendingUpdatesRef.current.get(taskId)
    if (existing) {
      // 既存の更新と新しい更新をマージ
      const mergedUpdates = mergeTaskUpdates(existing.updates, newUpdates)
      pendingUpdatesRef.current.set(taskId, {
        ...existing,
        updates: mergedUpdates,
        timestamp: Date.now()
      })
    } else {
      // 新しい更新として追加
      pendingUpdatesRef.current.set(taskId, {
        taskId,
        updates: newUpdates,
        originalData: originalData || {},
        timestamp: Date.now()
      })
    }
  }, [mergeTaskUpdates])

  // バッチ処理でAPI更新を実行（改善版）
  const processBatch = useCallback(async (updates: TaskUpdateData[]) => {
    const successfulUpdates: string[] = []
    const failedUpdates: TaskUpdateData[] = []

    // 更新をタスクIDごとにグループ化
    const updatesByTask = updates.reduce((acc, update) => {
      if (!acc[update.taskId]) {
        acc[update.taskId] = []
      }
      acc[update.taskId].push(update)
      return acc
    }, {} as Record<string, TaskUpdateData[]>)

    // 各タスクの最新更新のみを処理
    const latestUpdates = Object.values(updatesByTask).map(taskUpdates => 
      taskUpdates.sort((a, b) => b.timestamp - a.timestamp)[0]
    )

    console.log('ProcessBatch - Processing updates:', {
      totalUpdates: updates.length,
      uniqueTasks: latestUpdates.length,
      taskIds: latestUpdates.map(u => u.taskId)
    })

    // 並列でAPI更新を実行
    await Promise.allSettled(
      latestUpdates.map(async ({ taskId, updates }) => {
        try {
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`API update failed: ${response.status} - ${errorData.message || 'Unknown error'}`)
          }

          successfulUpdates.push(taskId)
        } catch (error) {
          console.error(`Failed to update task ${taskId}:`, error)
          failedUpdates.push({ taskId, updates, originalData: {}, timestamp: Date.now() })
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

    // 失敗した更新があれば詳細な通知
    if (failedUpdates.length > 0) {
      const errorMessage = `以下のタスクの更新に失敗しました:\n${failedUpdates.map(f => `- タスクID: ${f.taskId}`).join('\n')}\n\n元の状態に戻します。`
      console.error('Batch update failed:', errorMessage)
      alert(errorMessage)
      
      // フォールバック：全データ再取得
      onBatchRefresh?.()
    } else {
      console.log('All updates successful:', successfulUpdates)
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

  // メインの更新関数（キューシステム対応）
  const updateTask = useCallback((
    taskId: string,
    updates: Partial<TaskResponse>,
    originalData?: Partial<TaskResponse>
  ) => {
    // デバッグ用ログ
    console.log('OptimizedTaskUpdate - updateTask called:', {
      taskId,
      updates,
      originalData,
      completedAtUpdate: updates.completedAt,
      useQueueSystem,
      hasPendingUpdate: pendingUpdatesRef.current.has(taskId)
    })
    
    if (useQueueSystem) {
      // キューシステムを使用
      // 注意: queueSystem.updateTask内でonLocalUpdateが呼ばれるため、ここでは呼ばない
      queueSystem.updateTask(taskId, updates, 'normal')
    } else {
      // 従来の実装を使用
      // 1. 即座にローカル状態を更新（楽観的UI更新）
      onLocalUpdate(taskId, updates)

      // 2. ロールバック用データを保存（初回のみ）
      if (originalData && !rollbackDataRef.current.has(taskId)) {
        rollbackDataRef.current.set(taskId, originalData)
      }

      // 3. API更新をマージしてスケジューリング
      mergeUpdatesForTask(taskId, updates, originalData)

      // 4. デバウンスされたAPI更新をトリガー
      debouncedApiUpdate(taskId)
    }
  }, [onLocalUpdate, debouncedApiUpdate, mergeUpdatesForTask, useQueueSystem, queueSystem])

  // 即座に全ての保留中の更新を実行する関数
  const flushPendingUpdates = useCallback(async () => {
    if (useQueueSystem) {
      await queueSystem.flushPendingUpdates()
    } else {
      const pendingUpdates = Array.from(pendingUpdatesRef.current.values())
      if (pendingUpdates.length > 0) {
        processBatch(pendingUpdates)
        pendingUpdatesRef.current.clear()
        rollbackDataRef.current.clear()
      }
    }
  }, [processBatch, useQueueSystem, queueSystem])

  // 保留中の更新をキャンセルする関数
  const cancelPendingUpdates = useCallback(() => {
    if (useQueueSystem) {
      // キューシステムの場合は個別のキャンセル機能を実装する必要がある
      console.log('Queue system cancel not implemented yet')
    } else {
      pendingUpdatesRef.current.clear()
      rollbackDataRef.current.clear()
    }
  }, [useQueueSystem])

  return {
    updateTask,
    flushPendingUpdates,
    cancelPendingUpdates,
    hasPendingUpdates: () => {
      if (useQueueSystem) {
        const status = queueSystem.getQueueStatus()
        return Object.values(status).some(s => s.queueLength > 0 || s.processing)
      } else {
        return pendingUpdatesRef.current.size > 0
      }
    },
    // デバッグ用メソッド
    getPendingUpdatesCount: () => {
      if (useQueueSystem) {
        const status = queueSystem.getQueueStatus()
        return Object.values(status).reduce((total, s) => total + s.queueLength, 0)
      } else {
        return pendingUpdatesRef.current.size
      }
    },
    getPendingTaskIds: () => {
      if (useQueueSystem) {
        return Object.keys(queueSystem.getQueueStatus())
      } else {
        return Array.from(pendingUpdatesRef.current.keys())
      }
    },
    // キューシステムの状態を取得
    getQueueStatus: () => {
      if (useQueueSystem) {
        return queueSystem.getQueueStatus()
      } else {
        return {}
      }
    }
  }
}
