import { useCallback } from 'react'
import { TaskResponse, CreateTaskRequest } from '@/lib/types/api'
import { useOptimizedTaskUpdate } from './useOptimizedTaskUpdate'

interface UseOptimizedTaskOperationsProps {
  onLocalTaskAdd: (task: TaskResponse) => void
  onLocalTaskUpdate: (taskId: string, updates: Partial<TaskResponse>) => void
  onLocalTaskRemove: (taskId: string) => void
  onBatchRefresh?: () => void
}

/**
 * タスクの新規作成・編集・コピー・削除操作を最適化するフック
 * 楽観的UI更新により即座のビジュアルフィードバックを提供
 */
export function useOptimizedTaskOperations({
  onLocalTaskAdd,
  onLocalTaskUpdate,
  onLocalTaskRemove,
  onBatchRefresh
}: UseOptimizedTaskOperationsProps) {
  
  // 編集操作用の最適化フック
  const { updateTask: optimizedUpdateTask } = useOptimizedTaskUpdate({
    onLocalUpdate: onLocalTaskUpdate,
    onBatchRefresh,
    debounceDelay: 300,
    batchDelay: 200
  })

  // 新規タスク作成（楽観的UI更新）
  const createTask = useCallback(async (taskData: CreateTaskRequest): Promise<TaskResponse | null> => {
    // 1. 仮のタスクIDを生成
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 2. 楽観的UI更新用の仮タスクデータを作成
    const optimisticTask: TaskResponse = {
      id: tempId,
      title: taskData.title,
      assignee: taskData.assignee,
      plannedStart: new Date(taskData.plannedStart + 'T00:00:00.000Z').toISOString(),
      plannedEnd: new Date(taskData.plannedEnd + 'T00:00:00.000Z').toISOString(),
      completedAt: taskData.completedAt ? new Date(taskData.completedAt + 'T00:00:00.000Z').toISOString() : null,
      order: taskData.order || 0,
      deleted: false,
      projectId: taskData.projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 3. 即座にUIに仮タスクを追加
    onLocalTaskAdd(optimisticTask)

    try {
      // 4. バックグラウンドでAPI呼び出し
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const realTask: TaskResponse = await response.json()

      // 5. 成功時：仮タスクを実際のタスクで置換
      onLocalTaskRemove(tempId) // 仮タスクを削除
      onLocalTaskAdd(realTask)   // 実際のタスクを追加

      return realTask
    } catch (error) {
      console.error('Failed to create task:', error)
      
      // 6. 失敗時：仮タスクを削除してロールバック
      onLocalTaskRemove(tempId)
      
      // エラー通知
      alert('タスクの作成に失敗しました。')
      
      // フォールバック：全データ再取得
      onBatchRefresh?.()
      
      return null
    }
  }, [onLocalTaskAdd, onLocalTaskRemove, onBatchRefresh])

  // タスク編集（楽観的UI更新）
  const editTask = useCallback((taskId: string, updates: Partial<TaskResponse>, originalData?: Partial<TaskResponse>) => {
    // 最適化された更新処理を使用
    optimizedUpdateTask(taskId, updates, originalData)
  }, [optimizedUpdateTask])

  // タスクコピー（楽観的UI更新）
  const duplicateTask = useCallback(async (originalTask: TaskResponse): Promise<TaskResponse | null> => {
    // 1. 仮のコピータスクを生成
    const tempId = `temp-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const optimisticCopyTask: TaskResponse = {
      ...originalTask,
      id: tempId,
      title: `${originalTask.title} (コピー)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 2. 即座にUIにコピータスクを追加
    onLocalTaskAdd(optimisticCopyTask)

    try {
      // 3. バックグラウンドでAPI呼び出し
      const response = await fetch(`/api/tasks/${originalTask.id}/duplicate`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const realCopyTask: TaskResponse = await response.json()

      // 4. 成功時：仮コピータスクを実際のコピータスクで置換
      onLocalTaskRemove(tempId)      // 仮コピータスクを削除
      onLocalTaskAdd(realCopyTask)   // 実際のコピータスクを追加

      return realCopyTask
    } catch (error) {
      console.error('Failed to duplicate task:', error)
      
      // 5. 失敗時：仮コピータスクを削除してロールバック
      onLocalTaskRemove(tempId)
      
      // エラー通知
      alert('タスクの複製に失敗しました。')
      
      // フォールバック：全データ再取得
      onBatchRefresh?.()
      
      return null
    }
  }, [onLocalTaskAdd, onLocalTaskRemove, onBatchRefresh])

  // タスク削除（楽観的UI更新）
  const deleteTask = useCallback(async (task: TaskResponse): Promise<boolean> => {
    // 確認ダイアログ
    if (!confirm('このタスクを削除しますか？')) {
      return false
    }

    // 1. 即座にUIからタスクを削除
    onLocalTaskRemove(task.id)

    try {
      // 2. バックグラウンドでAPI呼び出し
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      // 3. 成功時：何もしない（既にUIから削除済み）
      return true
    } catch (error) {
      console.error('Failed to delete task:', error)
      
      // 4. 失敗時：タスクを復元
      onLocalTaskAdd(task)
      
      // エラー通知
      alert('タスクの削除に失敗しました。')
      
      // フォールバック：全データ再取得
      onBatchRefresh?.()
      
      return false
    }
  }, [onLocalTaskRemove, onLocalTaskAdd, onBatchRefresh])

  return {
    createTask,
    editTask,
    duplicateTask,
    deleteTask
  }
}
