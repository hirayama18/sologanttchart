import { useCallback, useRef, useEffect } from 'react'
import { TaskResponse } from '@/lib/types/api'

// キュー内の更新アイテム
interface QueuedUpdate {
  id: string
  updates: Partial<TaskResponse>
  timestamp: number
  priority: 'high' | 'normal' | 'low'
  retryCount: number
}

// タスク別キュー
interface TaskQueue {
  updates: QueuedUpdate[]
  processing: boolean
  processor: NodeJS.Timeout | null
  lastProcessedAt: number
}

// キューマネージャーの設定
interface QueueManagerOptions {
  maxRetries: number
  processingDelay: number
  batchWindow: number
  onUpdateSuccess: (taskId: string, updates: Partial<TaskResponse>) => void
  onUpdateError: (taskId: string, error: Error, updates: Partial<TaskResponse>) => void
  onBatchRefresh?: () => void
}

/**
 * タスク別更新キューシステム
 * 各タスクごとに専用のキューを管理し、順次処理を保証する
 */
export class TaskUpdateQueueManager {
  private queues: Map<string, TaskQueue> = new Map()
  private options: QueueManagerOptions
  private updateCounter = 0

  constructor(options: QueueManagerOptions) {
    this.options = options
  }

  /**
   * 更新をキューに追加
   */
  async enqueue(
    taskId: string,
    updates: Partial<TaskResponse>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    const queue = this.getOrCreateQueue(taskId)
    
    // Phase 4: 動的優先度決定
    const dynamicPriority = this.calculateDynamicPriority(updates, priority)

    // 新しい更新アイテムを作成
    const queuedUpdate: QueuedUpdate = {
      id: `update-${++this.updateCounter}-${Date.now()}`,
      updates,
      timestamp: Date.now(),
      priority: dynamicPriority,
      retryCount: 0
    }

    console.log('TaskQueue - Enqueuing update:', {
      taskId,
      updateId: queuedUpdate.id,
      originalPriority: priority,
      dynamicPriority: dynamicPriority,
      queueLength: queue.updates.length,
      processing: queue.processing
    })

    // キューに追加（優先度順）
    this.insertByPriority(queue.updates, queuedUpdate)
    
    // 処理開始
    if (!queue.processing) {
      this.scheduleProcessing(taskId)
    }
  }

  /**
   * キューの処理をスケジューリング（Phase 4: 適応的遅延）
   */
  private scheduleProcessing(taskId: string): void {
    const queue = this.queues.get(taskId)
    if (!queue || queue.processing) return

    // Phase 4: 適応的処理遅延を計算
    const adaptiveDelay = this.calculateAdaptiveDelay()
    
    console.log('TaskQueue - Scheduling processing:', {
      taskId,
      baseDelay: this.options.processingDelay,
      adaptiveDelay,
      systemLoad: this.calculateSystemLoad()
    })

    // 適応的遅延を使用してスケジューリング
    console.log('TaskQueue - Setting timeout:', {
      taskId,
      adaptiveDelay,
      timeoutId: 'will-be-set'
    })
    
    queue.processor = setTimeout(() => {
      console.log('TaskQueue - Timeout callback executed:', {
        taskId,
        queueExists: !!this.queues.get(taskId),
        queueLength: this.queues.get(taskId)?.updates.length || 0
      })
      this.processQueue(taskId)
    }, adaptiveDelay)
  }

  /**
   * キューの処理を実行
   */
  private async processQueue(taskId: string): Promise<void> {
    console.log('TaskQueue - processQueue called:', {
      taskId,
      queueExists: !!this.queues.get(taskId),
      queueLength: this.queues.get(taskId)?.updates.length || 0,
      isProcessing: this.queues.get(taskId)?.processing || false
    })
    
    const queue = this.queues.get(taskId)
    if (!queue || queue.processing || queue.updates.length === 0) {
      console.log('TaskQueue - processQueue early return:', {
        taskId,
        hasQueue: !!queue,
        isProcessing: queue?.processing,
        queueLength: queue?.updates.length || 0
      })
      return
    }

    console.log('TaskQueue - Processing queue:', {
      taskId,
      queueLength: queue.updates.length,
      lastProcessedAt: queue.lastProcessedAt
    })

    queue.processing = true
    queue.lastProcessedAt = Date.now()

    try {
      // バッチウィンドウ内の更新を取得
      const batch = this.extractBatch(queue.updates)
      
      if (batch.length > 0) {
        await this.processBatch(taskId, batch)
      }

      // まだ処理すべき更新がある場合は再スケジューリング
      if (queue.updates.length > 0) {
        queue.processing = false
        this.scheduleProcessing(taskId)
      } else {
        queue.processing = false
        // キューが空になったらクリーンアップ
        this.cleanupQueue(taskId)
      }
    } catch (error) {
      console.error('TaskQueue - Queue processing failed:', error)
      queue.processing = false
      
      // エラー時は少し待ってから再試行
      setTimeout(() => {
        if (queue.updates.length > 0) {
          this.scheduleProcessing(taskId)
        }
      }, 1000)
    }
  }

  /**
   * バッチウィンドウ内の更新を抽出
   */
  private extractBatch(updates: QueuedUpdate[]): QueuedUpdate[] {
    if (updates.length === 0) return []

    const batch: QueuedUpdate[] = []
    const now = Date.now()
    const batchWindow = this.options.batchWindow

    // 最初の更新は必ず含める
    batch.push(updates.shift()!)

    // バッチウィンドウ内の更新を追加
    while (updates.length > 0) {
      const nextUpdate = updates[0]
      if (now - nextUpdate.timestamp <= batchWindow) {
        batch.push(updates.shift()!)
      } else {
        break
      }
    }

    console.log('TaskQueue - Extracted batch:', {
      batchSize: batch.length,
      remainingUpdates: updates.length
    })

    return batch
  }

  /**
   * バッチ処理を実行
   */
  private async processBatch(taskId: string, batch: QueuedUpdate[]): Promise<void> {
    // Phase 2: インテリジェントマージ機能
    const mergedUpdate = this.intelligentMerge(batch)
    
    try {
      console.log('TaskQueue - Processing merged batch:', {
        taskId,
        updateId: mergedUpdate.id,
        updates: mergedUpdate.updates,
        originalBatchSize: batch.length
      })

      // Phase 3: 競合回避機能 - 更新前に競合をチェック
      const conflictResolution = await this.checkAndResolveConflicts(taskId, mergedUpdate.updates)
      if (conflictResolution.hasConflict) {
        console.log('TaskQueue - Conflict detected, using resolved updates:', {
          taskId,
          originalUpdates: mergedUpdate.updates,
          resolvedUpdates: conflictResolution.resolvedUpdates
        })
        mergedUpdate.updates = conflictResolution.resolvedUpdates
      }

      // API送信前に日付フィールドを正規化
      const normalizedUpdates = this.normalizeDateFields(mergedUpdate.updates)

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedUpdates),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API update failed: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      // 成功時のコールバック
      this.options.onUpdateSuccess(taskId, mergedUpdate.updates)
      
      console.log('TaskQueue - Merged batch processed successfully:', {
        taskId,
        updateId: mergedUpdate.id,
        mergedFields: Object.keys(mergedUpdate.updates)
      })

    } catch (error) {
      console.error('TaskQueue - Batch processing failed:', error)
      
      // リトライ処理
      if (mergedUpdate.retryCount < this.options.maxRetries) {
        mergedUpdate.retryCount++
        const queue = this.queues.get(taskId)
        if (queue) {
          // 優先度を上げて再キューイング
          mergedUpdate.priority = 'high'
          this.insertByPriority(queue.updates, mergedUpdate)
          console.log('TaskQueue - Retrying merged update:', {
            taskId,
            updateId: mergedUpdate.id,
            retryCount: mergedUpdate.retryCount
          })
        }
      } else {
        // 最大リトライ回数に達した場合
        this.options.onUpdateError(taskId, error as Error, mergedUpdate.updates)
        
        // フォールバック：全データ再取得
        this.options.onBatchRefresh?.()
      }
    }
  }

  /**
   * インテリジェントマージ機能（Phase 2）
   * 複数の更新を効率的に統合する
   */
  private intelligentMerge(batch: QueuedUpdate[]): QueuedUpdate {
    if (batch.length === 1) {
      return batch[0]
    }

    console.log('TaskQueue - Intelligent merge:', {
      batchSize: batch.length,
      updateIds: batch.map(u => u.id)
    })

    // 最新のメタデータを使用
    const latestUpdate = batch[batch.length - 1]
    const mergedUpdates: Partial<TaskResponse> = {}

    // 各フィールドのマージ戦略
    this.mergeField(batch, 'title', mergedUpdates, 'latest')
    this.mergeField(batch, 'assignee', mergedUpdates, 'latest')
    this.mergeField(batch, 'plannedStart', mergedUpdates, 'chronological')
    this.mergeField(batch, 'plannedEnd', mergedUpdates, 'chronological')
    this.mergeField(batch, 'completedAt', mergedUpdates, 'latest')
    this.mergeField(batch, 'order', mergedUpdates, 'latest')

    // マージされた更新を作成
    const mergedUpdate: QueuedUpdate = {
      id: `merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      updates: mergedUpdates,
      timestamp: latestUpdate.timestamp,
      priority: this.getHighestPriority(batch),
      retryCount: 0
    }

    console.log('TaskQueue - Merge result:', {
      originalUpdates: batch.length,
      mergedFields: Object.keys(mergedUpdates),
      finalPriority: mergedUpdate.priority
    })

    return mergedUpdate
  }

  /**
   * フィールド別マージ戦略
   */
  private mergeField(
    batch: QueuedUpdate[],
    fieldName: keyof TaskResponse,
    mergedUpdates: Partial<TaskResponse>,
    strategy: 'latest' | 'chronological' | 'smart'
  ): void {
    const updatesWithField = batch.filter(update => 
      update.updates[fieldName] !== undefined
    )

    if (updatesWithField.length === 0) return

    const latestValue = updatesWithField[updatesWithField.length - 1].updates[fieldName]

    switch (strategy) {
      case 'latest':
        // 最新の値を使用
        this.setMergedValue(mergedUpdates, fieldName, latestValue)
        break

      case 'chronological':
        // 日付フィールドの場合、時系列で最も合理的な値を選択
        if (fieldName === 'plannedStart' || fieldName === 'plannedEnd') {
          const chronologicalValue = this.mergeChronological(updatesWithField, fieldName)
          this.setMergedValue(mergedUpdates, fieldName, chronologicalValue)
        } else {
          this.setMergedValue(mergedUpdates, fieldName, latestValue)
        }
        break

      case 'smart':
        // 将来の拡張用（現在は latest と同じ）
        this.setMergedValue(mergedUpdates, fieldName, latestValue)
        break
    }
  }

  /**
   * 型安全にマージされた値を設定
   */
  private setMergedValue(
    mergedUpdates: Partial<TaskResponse>,
    fieldName: keyof TaskResponse,
    value: TaskResponse[keyof TaskResponse] | undefined
  ): void {
    if (value !== undefined) {
      switch (fieldName) {
        case 'id':
        case 'title':
        case 'assignee':
        case 'plannedStart':
        case 'plannedEnd':
        case 'createdAt':
        case 'updatedAt':
        case 'projectId':
          mergedUpdates[fieldName] = value as string
          break
        case 'order':
          mergedUpdates[fieldName] = value as number
          break
        case 'deleted':
          mergedUpdates[fieldName] = value as boolean
          break
        case 'completedAt':
          mergedUpdates[fieldName] = value as string | null
          break
      }
    }
  }

  /**
   * 日付フィールドの時系列マージ
   */
  private mergeChronological(
    updatesWithField: QueuedUpdate[],
    fieldName: 'plannedStart' | 'plannedEnd'
  ): string {
    const values = updatesWithField.map(u => u.updates[fieldName] as string)
    
    // 日付として解析
    const dates = values.map(v => new Date(v)).filter(d => !isNaN(d.getTime()))
    
    if (dates.length === 0) {
      return values[values.length - 1] // フォールバック：最新の値
    }

    if (fieldName === 'plannedStart') {
      // 開始日は最も早い日付を選択（ただし、明らかに意図的な変更は尊重）
      const latest = dates[dates.length - 1]
      const earliest = new Date(Math.min(...dates.map(d => d.getTime())))
      
      // 最新の変更が1日以上の大きな変更の場合は最新を採用
      const daysDiff = Math.abs(latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff > 1 ? latest.toISOString() : earliest.toISOString()
    } else {
      // 終了日は最も遅い日付を選択
      const latest = new Date(Math.max(...dates.map(d => d.getTime())))
      return latest.toISOString()
    }
  }

  /**
   * バッチ内の最高優先度を取得
   */
  private getHighestPriority(batch: QueuedUpdate[]): 'high' | 'normal' | 'low' {
    const priorities = batch.map(u => u.priority)
    if (priorities.includes('high')) return 'high'
    if (priorities.includes('normal')) return 'normal'
    return 'low'
  }

  /**
   * 競合チェックと解決機能（Phase 3）
   */
  private async checkAndResolveConflicts(
    taskId: string,
    updates: Partial<TaskResponse>
  ): Promise<{ hasConflict: boolean; resolvedUpdates: Partial<TaskResponse> }> {
    try {
      // 現在のタスク状態を取得
      const currentTask = await this.fetchCurrentTask(taskId)
      if (!currentTask) {
        return { hasConflict: false, resolvedUpdates: updates }
      }

      // 競合を検出
      const conflicts = this.detectConflicts(currentTask, updates)
      
      if (conflicts.length === 0) {
        return { hasConflict: false, resolvedUpdates: updates }
      }

      console.log('TaskQueue - Conflicts detected:', {
        taskId,
        conflicts: conflicts.map(c => ({ field: c.field, current: c.currentValue, proposed: c.proposedValue }))
      })

      // 競合を解決
      const resolvedUpdates = this.resolveConflicts(currentTask, updates, conflicts)

      return { hasConflict: true, resolvedUpdates }

    } catch (error) {
      console.error('TaskQueue - Conflict check failed:', error)
      // エラー時は元の更新をそのまま使用
      return { hasConflict: false, resolvedUpdates: updates }
    }
  }

  /**
   * 現在のタスク状態を取得
   */
  private async fetchCurrentTask(taskId: string): Promise<TaskResponse | null> {
    try {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('TaskQueue - Failed to fetch current task:', error)
      return null
    }
  }

  /**
   * 競合を検出
   */
  private detectConflicts(
    currentTask: TaskResponse,
    updates: Partial<TaskResponse>
  ): Array<{ field: keyof TaskResponse; currentValue: unknown; proposedValue: unknown }> {
    const conflicts: Array<{ field: keyof TaskResponse; currentValue: unknown; proposedValue: unknown }> = []

    // 重要なフィールドのみ競合チェック
    const criticalFields: Array<keyof TaskResponse> = ['title', 'assignee', 'plannedStart', 'plannedEnd', 'completedAt']

    criticalFields.forEach(field => {
      if (updates[field] !== undefined) {
        const currentValue = currentTask[field]
        const proposedValue = updates[field]

        // 値が異なり、かつ現在値が予期したものと異なる場合は競合
        if (currentValue !== proposedValue) {
          // 日付フィールドの場合は時刻差を考慮
          if (field === 'plannedStart' || field === 'plannedEnd') {
            if (this.isDateConflict(currentValue as string, proposedValue as string)) {
              conflicts.push({ field, currentValue, proposedValue })
            }
          } else {
            conflicts.push({ field, currentValue, proposedValue })
          }
        }
      }
    })

    return conflicts
  }

  /**
   * 日付フィールドの競合チェック
   */
  private isDateConflict(currentValue: string, proposedValue: string): boolean {
    if (!currentValue || !proposedValue) return false

    const currentDate = new Date(currentValue)
    const proposedDate = new Date(this.normalizeDate(proposedValue))

    if (isNaN(currentDate.getTime()) || isNaN(proposedDate.getTime())) return false

    // 1時間以上の差がある場合は競合とみなす
    const timeDiff = Math.abs(currentDate.getTime() - proposedDate.getTime())
    return timeDiff > 60 * 60 * 1000 // 1時間
  }

  /**
   * 日付文字列を正規化（時間情報が欠落している場合は補完）
   */
  private normalizeDate(dateStr: string): string {
    // 既にISO形式（時間情報含む）の場合はそのまま返す
    if (dateStr.includes('T')) {
      return dateStr
    }
    
    // YYYY-MM-DD形式の場合は00:00:00.000Zを追加
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return `${dateStr}T00:00:00.000Z`
    }
    
    // その他の場合はそのまま返す
    return dateStr
  }

  /**
   * 更新データの日付フィールドを正規化
   */
  private normalizeDateFields(updates: Partial<TaskResponse>): Partial<TaskResponse> {
    const normalized = { ...updates }

    const toIso = (v: unknown): string | null => {
      if (v == null) return null
      if (typeof v === 'string') {
        const s = this.normalizeDate(v)
        const d = new Date(s)
        return isNaN(d.getTime()) ? null : d.toISOString()
      }
      if (v instanceof Date) {
        return isNaN(v.getTime()) ? null : v.toISOString()
      }
      return null
    }

    const ps = toIso(normalized.plannedStart as unknown)
    if (ps !== null) normalized.plannedStart = ps

    const pe = toIso(normalized.plannedEnd as unknown)
    if (pe !== null) normalized.plannedEnd = pe

    const ca = toIso(normalized.completedAt as unknown)
    if (ca !== null) normalized.completedAt = ca

    return normalized
  }

  /**
   * 競合を解決
   */
  private resolveConflicts(
    currentTask: TaskResponse,
    updates: Partial<TaskResponse>,
    conflicts: Array<{ field: keyof TaskResponse; currentValue: unknown; proposedValue: unknown }>
  ): Partial<TaskResponse> {
    const resolvedUpdates = { ...updates }

    conflicts.forEach(conflict => {
      const resolution = this.getConflictResolution(conflict.field, conflict.currentValue, conflict.proposedValue)
      
      console.log('TaskQueue - Resolving conflict:', {
        field: conflict.field,
        current: conflict.currentValue,
        proposed: conflict.proposedValue,
        resolution: resolution.value,
        strategy: resolution.strategy
      })

      if (resolution.value !== undefined) {
        this.setMergedValue(resolvedUpdates, conflict.field, resolution.value as TaskResponse[keyof TaskResponse])
      } else {
        // 解決できない場合は更新から除外
        delete resolvedUpdates[conflict.field]
      }
    })

    return resolvedUpdates
  }

  /**
   * 競合解決戦略
   */
  private getConflictResolution(
    field: keyof TaskResponse,
    currentValue: unknown,
    proposedValue: unknown
  ): { value: unknown; strategy: string } {
    switch (field) {
      case 'title':
      case 'assignee':
        // テキストフィールドは提案値を優先（ユーザーの意図を尊重）
        return { value: proposedValue, strategy: 'user_intent' }

      case 'plannedStart':
      case 'plannedEnd':
        // ドラッグ&ドロップなどのユーザー操作を優先（ユーザー意図を尊重）
        // 受け取った提案値は正規化して返す
        if (typeof proposedValue === 'string') {
          return { value: this.normalizeDate(proposedValue), strategy: 'user_intent' }
        }
        return { value: proposedValue, strategy: 'user_intent' }

      case 'completedAt':
        // 完了日時は最新の値を優先
        if (currentValue && !proposedValue) {
          return { value: currentValue, strategy: 'keep_completed' }
        } else if (!currentValue && proposedValue) {
          return { value: proposedValue, strategy: 'mark_completed' }
        } else {
          return { value: proposedValue, strategy: 'latest_completion' }
        }

      default:
        // その他のフィールドは提案値を優先
        return { value: proposedValue, strategy: 'default_proposed' }
    }
  }

  /**
   * 動的優先度計算（Phase 4）
   */
  private calculateDynamicPriority(
    updates: Partial<TaskResponse>,
    basePriority: 'high' | 'normal' | 'low'
  ): 'high' | 'normal' | 'low' {
    let priorityScore = this.getPriorityScore(basePriority)

    // フィールドの重要度による優先度調整
    const fieldPriorities = this.analyzeFieldPriority(updates)
    priorityScore += fieldPriorities.urgencyBonus
    
    // システム状態による優先度調整
    const systemPriorities = this.analyzeSystemPriority()
    priorityScore += systemPriorities.loadBonus

    // スコアを優先度に変換
    if (priorityScore >= 4) return 'high'
    if (priorityScore >= 2) return 'normal'
    return 'low'
  }

  /**
   * 基本優先度のスコア化
   */
  private getPriorityScore(priority: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high': return 3
      case 'normal': return 2
      case 'low': return 1
    }
  }

  /**
   * フィールドの重要度分析
   */
  private analyzeFieldPriority(updates: Partial<TaskResponse>): { urgencyBonus: number } {
    let urgencyBonus = 0

    // 完了状態の変更は高優先度
    if (updates.completedAt !== undefined) {
      urgencyBonus += 2
    }

    // タイトルの変更は中優先度
    if (updates.title !== undefined) {
      urgencyBonus += 1
    }

    // 担当者の変更は中優先度
    if (updates.assignee !== undefined) {
      urgencyBonus += 1
    }

    // 日付の変更は通常優先度
    if (updates.plannedStart !== undefined || updates.plannedEnd !== undefined) {
      urgencyBonus += 0.5
    }

    // 順序の変更は低優先度
    if (updates.order !== undefined) {
      urgencyBonus += 0.2
    }

    return { urgencyBonus }
  }

  /**
   * システム状態による優先度分析
   */
  private analyzeSystemPriority(): { loadBonus: number } {
    let loadBonus = 0

    // 全体のキュー負荷を計算
    const totalQueueLength = Array.from(this.queues.values())
      .reduce((total, queue) => total + queue.updates.length, 0)

    // 処理中のキュー数を計算
    const processingQueues = Array.from(this.queues.values())
      .filter(queue => queue.processing).length

    // 高負荷時は優先度を下げる（システム保護）
    if (totalQueueLength > 20) {
      loadBonus -= 1
    } else if (totalQueueLength > 10) {
      loadBonus -= 0.5
    }

    // 多数の並行処理時は優先度を下げる
    if (processingQueues > 5) {
      loadBonus -= 1
    } else if (processingQueues > 3) {
      loadBonus -= 0.5
    }

    return { loadBonus }
  }

  /**
   * 適応的処理遅延計算
   */
  private calculateAdaptiveDelay(): number {
    const baseDelay = this.options.processingDelay

    // システム負荷に基づく遅延調整
    const systemLoad = this.calculateSystemLoad()
    
    if (systemLoad > 0.8) {
      return baseDelay * 2 // 高負荷時は遅延を倍に
    } else if (systemLoad > 0.5) {
      return baseDelay * 1.5 // 中負荷時は1.5倍
    } else {
      return baseDelay // 通常時は基本遅延
    }
  }

  /**
   * システム負荷計算
   */
  private calculateSystemLoad(): number {
    const totalQueues = this.queues.size
    const totalUpdates = Array.from(this.queues.values())
      .reduce((total, queue) => total + queue.updates.length, 0)
    const processingQueues = Array.from(this.queues.values())
      .filter(queue => queue.processing).length

    // 負荷スコア計算（0.0 - 1.0）
    const queueLoad = Math.min(totalQueues / 10, 1.0) // 10キュー以上で最大
    const updateLoad = Math.min(totalUpdates / 50, 1.0) // 50更新以上で最大
    const processingLoad = Math.min(processingQueues / 5, 1.0) // 5並行以上で最大

    return Math.max(queueLoad, updateLoad, processingLoad)
  }

  /**
   * 優先度順にキューに挿入
   */
  private insertByPriority(queue: QueuedUpdate[], update: QueuedUpdate): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 }
    const updatePriority = priorityOrder[update.priority]
    
    let insertIndex = queue.length
    for (let i = 0; i < queue.length; i++) {
      const existingPriority = priorityOrder[queue[i].priority]
      if (updatePriority > existingPriority) {
        insertIndex = i
        break
      }
    }
    
    queue.splice(insertIndex, 0, update)
  }

  /**
   * キューを取得または作成
   */
  private getOrCreateQueue(taskId: string): TaskQueue {
    if (!this.queues.has(taskId)) {
      this.queues.set(taskId, {
        updates: [],
        processing: false,
        processor: null,
        lastProcessedAt: 0
      })
    }
    return this.queues.get(taskId)!
  }

  /**
   * 空のキューをクリーンアップ
   */
  private cleanupQueue(taskId: string): void {
    const queue = this.queues.get(taskId)
    if (queue && queue.updates.length === 0 && !queue.processing) {
      if (queue.processor) {
        clearTimeout(queue.processor)
      }
      this.queues.delete(taskId)
      console.log('TaskQueue - Cleaned up queue:', taskId)
    }
  }

  /**
   * 全てのキューを強制処理
   */
  public async flushAll(): Promise<void> {
    console.log('TaskQueue - Flushing all queues:', this.queues.size)
    
    const flushPromises = Array.from(this.queues.keys()).map(taskId => 
      this.processQueue(taskId)
    )
    
    await Promise.all(flushPromises)
  }

  /**
   * 特定タスクのキューを強制処理
   */
  public async flushTask(taskId: string): Promise<void> {
    await this.processQueue(taskId)
  }

  /**
   * キューの状態を取得（デバッグ用）
   */
  public getQueueStatus(): Record<string, { queueLength: number; processing: boolean }> {
    const status: Record<string, { queueLength: number; processing: boolean }> = {}
    
    this.queues.forEach((queue, taskId) => {
      status[taskId] = {
        queueLength: queue.updates.length,
        processing: queue.processing
      }
    })
    
    return status
  }

  /**
   * 全てのキューをクリア
   */
  public clearAll(): void {
    this.queues.forEach(queue => {
      if (queue.processor) {
        clearTimeout(queue.processor)
      }
    })
    this.queues.clear()
    console.log('TaskQueue - All queues cleared')
  }

  /**
   * コールバック関数を更新
   */
  public updateCallbacks(callbacks: Partial<Pick<QueueManagerOptions, 'onBatchRefresh' | 'onUpdateSuccess' | 'onUpdateError'>>): void {
    if (callbacks.onBatchRefresh !== undefined) {
      this.options.onBatchRefresh = callbacks.onBatchRefresh
    }
    if (callbacks.onUpdateSuccess !== undefined) {
      this.options.onUpdateSuccess = callbacks.onUpdateSuccess
    }
    if (callbacks.onUpdateError !== undefined) {
      this.options.onUpdateError = callbacks.onUpdateError
    }
  }
}

/**
 * タスク更新キューシステムを使用するReactフック
 */
interface UseTaskUpdateQueueProps {
  onLocalUpdate: (taskId: string, updates: Partial<TaskResponse>) => void
  onBatchRefresh?: () => void
  maxRetries?: number
  processingDelay?: number
  batchWindow?: number
}

export function useTaskUpdateQueue({
  onLocalUpdate,
  onBatchRefresh,
  maxRetries = 3,
  processingDelay = 300,
  batchWindow = 500
}: UseTaskUpdateQueueProps) {
  const queueManagerRef = useRef<TaskUpdateQueueManager | null>(null)

  // キューマネージャーの初期化（onBatchRefreshの変更では再初期化しない）
  useEffect(() => {
    if (!queueManagerRef.current) {
      console.log('TaskQueue - Initializing queue manager')
      queueManagerRef.current = new TaskUpdateQueueManager({
        maxRetries,
        processingDelay,
        batchWindow,
        onUpdateSuccess: (taskId, updates) => {
          console.log('TaskQueue - Update successful:', { taskId, updates })
        },
        onUpdateError: (taskId, error, updates) => {
          console.error('TaskQueue - Update failed:', { taskId, error, updates })
          // エラー時は元の状態に戻す（ロールバック）
          // 実際の実装では、元のデータを保持しておく必要がある
        },
        onBatchRefresh
      })
    }

    return () => {
      // コンポーネントアンマウント時のみクリア
      queueManagerRef.current?.clearAll()
      queueManagerRef.current = null
    }
  }, [maxRetries, processingDelay, batchWindow])

  // onBatchRefreshの更新は別のuseEffectで処理
  useEffect(() => {
    if (queueManagerRef.current) {
      // 既存のマネージャーのコールバックを更新
      queueManagerRef.current.updateCallbacks({ onBatchRefresh })
    }
  }, [onBatchRefresh])

  // 更新関数
  const updateTask = useCallback((
    taskId: string,
    updates: Partial<TaskResponse>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) => {
    console.log('TaskQueue - updateTask called:', {
      taskId,
      updates,
      priority
    })

    // 1. 即座にローカル状態を更新（楽観的UI更新）
    onLocalUpdate(taskId, updates)

    // 2. キューに追加してAPI更新をスケジューリング
    queueManagerRef.current?.enqueue(taskId, updates, priority)
  }, [onLocalUpdate])

  // 全キューを強制処理
  const flushPendingUpdates = useCallback(async () => {
    await queueManagerRef.current?.flushAll()
  }, [])

  // 特定タスクのキューを強制処理
  const flushTask = useCallback(async (taskId: string) => {
    await queueManagerRef.current?.flushTask(taskId)
  }, [])

  // キューの状態を取得
  const getQueueStatus = useCallback(() => {
    return queueManagerRef.current?.getQueueStatus() || {}
  }, [])

  return {
    updateTask,
    flushPendingUpdates,
    flushTask,
    getQueueStatus
  }
}
