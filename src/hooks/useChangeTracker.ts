import { useCallback, useState, useMemo } from 'react'
import { TaskResponse, CreateTaskRequest, UpdateTaskRequest } from '@/lib/types/api'

// 変更の種類を管理する型
export interface ChangeSet {
  created: Map<string, CreateTaskRequest>        // 新規作成（tempId -> タスクデータ）
  updated: Map<string, UpdateTaskRequest>        // 更新（実際のtaskId -> 変更差分）
  deleted: Set<string>                           // 削除予定のタスクID（実際のtaskIdのみ）
}

// 仮IDのプレフィックス
const TEMP_ID_PREFIX = 'local-'

/**
 * 仮IDかどうかを判定
 */
export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX)
}

/**
 * 仮IDを生成
 */
export function generateTempId(): string {
  return `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface UseChangeTrackerProps {
  initialTasks: TaskResponse[]
}

interface UseChangeTrackerReturn {
  // ローカルタスク（UIに表示される）
  localTasks: TaskResponse[]
  
  // 変更セット（保存時にAPIに送信）
  changeSet: ChangeSet
  
  // 変更があるかどうか
  hasChanges: boolean
  
  // 変更件数
  changeCount: number
  
  // タスク操作（ローカルステートのみ更新）
  addTask: (taskData: CreateTaskRequest) => TaskResponse
  updateTask: (taskId: string, updates: Partial<TaskResponse>) => void
  deleteTask: (taskId: string) => void
  reorderTasks: (newOrderIds: string[]) => void
  
  // サーバーからのデータで初期化/リセット
  resetWithServerData: (tasks: TaskResponse[]) => void
  
  // 変更をクリア（保存成功後に呼び出す）
  clearChanges: () => void
  
  // 保存用のデータを取得
  getChangesForSave: () => {
    created: CreateTaskRequest[]
    updated: { id: string; updates: UpdateTaskRequest }[]
    deleted: string[]
    reordered: { id: string; order: number }[] | null
  }
}

/**
 * タスクの変更を追跡するフック
 * - すべての変更はローカルステートで管理
 * - 保存ボタンを押したときのみDBに保存
 */
export function useChangeTracker({ initialTasks }: UseChangeTrackerProps): UseChangeTrackerReturn {
  // ローカルタスク状態
  const [localTasks, setLocalTasks] = useState<TaskResponse[]>(initialTasks)
  
  // 変更セット
  const [changeSet, setChangeSet] = useState<ChangeSet>({
    created: new Map(),
    updated: new Map(),
    deleted: new Set()
  })
  
  // 元のタスク順序（並び替え検出用）
  const [originalOrder, setOriginalOrder] = useState<string[]>(initialTasks.map(t => t.id))
  
  // 変更があるかどうか
  const hasChanges = useMemo(() => {
    if (changeSet.created.size > 0 || changeSet.updated.size > 0 || changeSet.deleted.size > 0) {
      return true
    }
    // 並び替えがあるかチェック
    const currentOrder = localTasks.filter(t => !isTempId(t.id)).map(t => t.id)
    const filteredOriginalOrder = originalOrder.filter(id => !changeSet.deleted.has(id))
    if (currentOrder.length !== filteredOriginalOrder.length) return true
    return currentOrder.some((id, index) => id !== filteredOriginalOrder[index])
  }, [changeSet, localTasks, originalOrder])
  
  // 変更件数
  const changeCount = useMemo(() => {
    let count = changeSet.created.size + changeSet.updated.size + changeSet.deleted.size
    // 並び替えがあれば+1
    const currentOrder = localTasks.filter(t => !isTempId(t.id)).map(t => t.id)
    const filteredOriginalOrder = originalOrder.filter(id => !changeSet.deleted.has(id))
    const hasReorder = currentOrder.some((id, index) => id !== filteredOriginalOrder[index])
    if (hasReorder) count += 1
    return count
  }, [changeSet, localTasks, originalOrder])
  
  // タスク追加
  const addTask = useCallback((taskData: CreateTaskRequest): TaskResponse => {
    const tempId = generateTempId()
    
    // ISO形式に変換するヘルパー
    const toIsoOrNull = (value?: string | null): string | null => {
      if (!value) return null
      try {
        const dateString = value.includes('T') ? value : `${value}T00:00:00.000Z`
        const parsed = new Date(dateString)
        return isNaN(parsed.getTime()) ? null : parsed.toISOString()
      } catch {
        return null
      }
    }
    
    // ローカル表示用のタスクオブジェクト
    const newTask: TaskResponse = {
      id: tempId,
      title: taskData.title,
      assignee: taskData.assignee,
      plannedStart: toIsoOrNull(taskData.plannedStart),
      plannedEnd: toIsoOrNull(taskData.plannedEnd),
      completedAt: toIsoOrNull(taskData.completedAt),
      order: 999999, // 仮の値（保存時に正しい値が設定される）
      deleted: false,
      projectId: taskData.projectId,
      parentId: taskData.parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // ローカルタスクに追加
    setLocalTasks(prev => [...prev, newTask])
    
    // 変更セットに追加
    setChangeSet(prev => {
      const newCreated = new Map(prev.created)
      newCreated.set(tempId, taskData)
      return { ...prev, created: newCreated }
    })
    
    return newTask
  }, [])
  
  // タスク更新
  const updateTask = useCallback((taskId: string, updates: Partial<TaskResponse>) => {
    // ローカルタスクを更新
    setLocalTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
    ))
    
    // 変更セットを更新
    setChangeSet(prev => {
      if (isTempId(taskId)) {
        // 新規作成タスクの更新：createdのデータを更新
        const newCreated = new Map(prev.created)
        const existingData = newCreated.get(taskId)
        if (existingData) {
          newCreated.set(taskId, { ...existingData, ...updates })
        }
        return { ...prev, created: newCreated }
      } else {
        // 既存タスクの更新：updatedに追加/マージ
        const newUpdated = new Map(prev.updated)
        const existingUpdates = newUpdated.get(taskId) || {}
        newUpdated.set(taskId, { ...existingUpdates, ...updates })
        return { ...prev, updated: newUpdated }
      }
    })
  }, [])
  
  // タスク削除
  const deleteTask = useCallback((taskId: string) => {
    // ローカルタスクから削除
    setLocalTasks(prev => prev.filter(task => task.id !== taskId))
    
    // 変更セットを更新
    setChangeSet(prev => {
      if (isTempId(taskId)) {
        // 新規作成タスクの削除：createdから削除するだけ
        const newCreated = new Map(prev.created)
        newCreated.delete(taskId)
        return { ...prev, created: newCreated }
      } else {
        // 既存タスクの削除：deletedに追加、updatedから削除
        const newDeleted = new Set(prev.deleted)
        newDeleted.add(taskId)
        const newUpdated = new Map(prev.updated)
        newUpdated.delete(taskId)
        return { ...prev, deleted: newDeleted, updated: newUpdated }
      }
    })
  }, [])
  
  // タスク並び替え
  const reorderTasks = useCallback((newOrderIds: string[]) => {
    setLocalTasks(prev => {
      const taskMap = new Map(prev.map(task => [task.id, task]))
      return newOrderIds
        .map(id => taskMap.get(id))
        .filter((task): task is TaskResponse => task !== undefined)
        .map((task, index) => ({ ...task, order: index + 1 }))
    })
  }, [])
  
  // サーバーデータでリセット
  const resetWithServerData = useCallback((tasks: TaskResponse[]) => {
    setLocalTasks(tasks)
    setOriginalOrder(tasks.map(t => t.id))
    setChangeSet({
      created: new Map(),
      updated: new Map(),
      deleted: new Set()
    })
  }, [])
  
  // 変更をクリア
  const clearChanges = useCallback(() => {
    setOriginalOrder(localTasks.filter(t => !isTempId(t.id)).map(t => t.id))
    setChangeSet({
      created: new Map(),
      updated: new Map(),
      deleted: new Set()
    })
  }, [localTasks])
  
  // 保存用データを取得
  const getChangesForSave = useCallback(() => {
    // 新規作成タスク（仮IDも含める）
    const created = Array.from(changeSet.created.entries()).map(([tempId, taskData]) => ({
      ...taskData,
      tempId // 仮IDを追加
    }))
    
    // 更新タスク
    const updated = Array.from(changeSet.updated.entries()).map(([id, updates]) => ({
      id,
      updates
    }))
    
    // 削除タスク
    const deleted = Array.from(changeSet.deleted)
    
    // 並び替え（既存タスクのみ）
    const currentOrder = localTasks.filter(t => !isTempId(t.id)).map(t => t.id)
    const filteredOriginalOrder = originalOrder.filter(id => !changeSet.deleted.has(id))
    const hasReorder = currentOrder.some((id, index) => id !== filteredOriginalOrder[index])
    
    const reordered = hasReorder
      ? localTasks
          .filter(t => !isTempId(t.id) && !changeSet.deleted.has(t.id))
          .map((t, index) => ({ id: t.id, order: index + 1 }))
      : null
    
    return { created, updated, deleted, reordered }
  }, [changeSet, localTasks, originalOrder])
  
  return {
    localTasks,
    changeSet,
    hasChanges,
    changeCount,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    resetWithServerData,
    clearChanges,
    getChangesForSave
  }
}

