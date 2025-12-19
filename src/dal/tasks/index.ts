import { prisma } from '@/lib/prisma'
import { CreateTaskData, UpdateTaskData, Task, TaskWithProject } from '@/lib/types/database'

export class TaskDAL {
  /**
   * プロジェクト配下の全タスクの plannedStart / plannedEnd を n 日シフト
   * - deleted=true は除外
   * - デフォルトでは 完了済み（isCompleted=true）も含める（includeCompleted=true）
   * - plannedStart / plannedEnd が null の場合はそのまま
   */
  static async shiftPlannedDatesByProjectId(
    projectId: string,
    days: number,
    options?: { includeCompleted?: boolean }
  ): Promise<{ updatedCount: number }> {
    // 0日の場合はDBを触らない
    if (!Number.isFinite(days) || days === 0) {
      return { updatedCount: 0 }
    }

    // デフォルトは完了済みも対象
    const includeCompleted = options?.includeCompleted !== false

    // Postgres: interval 加算で一括更新
    // Prisma の map によりテーブル名は "tasks"、カラムは "plannedStart" 等の camelCase になる想定
    const updatedCount = includeCompleted
      ? await prisma.$executeRaw<number>`
          UPDATE "tasks"
          SET
            "plannedStart" = CASE
              WHEN "plannedStart" IS NULL THEN NULL
              ELSE "plannedStart" + (${days} * INTERVAL '1 day')
            END,
            "plannedEnd" = CASE
              WHEN "plannedEnd" IS NULL THEN NULL
              ELSE "plannedEnd" + (${days} * INTERVAL '1 day')
            END
          WHERE
            "projectId" = ${projectId}
            AND "deleted" = false
        `
      : await prisma.$executeRaw<number>`
          UPDATE "tasks"
          SET
            "plannedStart" = CASE
              WHEN "plannedStart" IS NULL THEN NULL
              ELSE "plannedStart" + (${days} * INTERVAL '1 day')
            END,
            "plannedEnd" = CASE
              WHEN "plannedEnd" IS NULL THEN NULL
              ELSE "plannedEnd" + (${days} * INTERVAL '1 day')
            END
          WHERE
            "projectId" = ${projectId}
            AND "deleted" = false
            AND "isCompleted" = false
        `

    return { updatedCount }
  }

  /**
   * プロジェクトの全タスクを取得
   */
  static async getByProjectId(projectId: string): Promise<Task[]> {
    return await prisma.task.findMany({
      where: { 
        projectId,
        deleted: false 
      },
      orderBy: { order: 'asc' }
    })
  }

  /**
   * タスクIDで取得
   */
  static async getById(id: string): Promise<TaskWithProject | null> {
    return await prisma.task.findUnique({
      where: { id },
      include: { project: true }
    })
  }

  /**
   * タスク作成
   */
  static async create(data: CreateTaskData): Promise<Task> {
    // 新規タスクは必ず一番下に配置するため、最大値+1を設定
    const maxOrder = await prisma.task.aggregate({
      where: { 
        projectId: data.projectId,
        deleted: false 
      },
      _max: { order: true }
    })
    
    // orderが指定されていない場合、または指定されたorderが最大値以下の場合は最大値+1に設定
    if (data.order === undefined || data.order <= (maxOrder._max.order || 0)) {
      data.order = (maxOrder._max.order || 0) + 1
    }

    return await prisma.task.create({
      data
    })
  }

  /**
   * タスク更新
   */
  static async update(id: string, data: UpdateTaskData): Promise<Task> {
    return await prisma.task.update({
      where: { id },
      data
    })
  }

  /**
   * タスク削除（論理削除）
   */
  static async delete(id: string): Promise<Task> {
    return await prisma.task.update({
      where: { id },
      data: { deleted: true }
    })
  }

  /**
   * タスク完全削除
   */
  static async hardDelete(id: string): Promise<void> {
    await prisma.task.delete({
      where: { id }
    })
  }

  /**
   * タスクの順序を更新
   */
  static async updateOrder(taskUpdates: { id: string; order: number }[]): Promise<void> {
    await prisma.$transaction(
      taskUpdates.map(({ id, order }) =>
        prisma.task.update({
          where: { id },
          data: { order }
        })
      )
    )
  }

  /**
   * タスクがユーザーのプロジェクトに属しているかチェック
   */
  static async isOwnerTask(taskId: string, userId: string): Promise<boolean> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    })
    
    if (!task) return false
    return task.project.userId === userId
  }

  /**
   * タスクを複製
   */
  static async duplicate(id: string): Promise<Task> {
    const originalTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!originalTask) {
      throw new Error('Task not found')
    }

    // 最大orderを取得（削除済みタスクは除外）
    const maxOrder = await prisma.task.aggregate({
      where: { 
        projectId: originalTask.projectId,
        deleted: false 
      },
      _max: { order: true }
    })

    const newOrder = (maxOrder._max.order || 0) + 1

    // 新しいタスクを作成
    return await prisma.task.create({
      data: {
        title: `${originalTask.title} (コピー)`,
        assignee: originalTask.assignee,
        plannedStart: originalTask.plannedStart,
        plannedEnd: originalTask.plannedEnd,
        projectId: originalTask.projectId,
        parentId: originalTask.parentId,
        order: newOrder
      }
    })
  }
}