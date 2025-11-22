import { prisma } from '@/lib/prisma'
import {
  CreateProjectData,
  UpdateProjectData,
  Project,
  ProjectWithTasks,
} from '@/lib/types/database'

export class ProjectDAL {
  static async getByUserId(userId: string): Promise<Project[]> {
    return await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async getById(id: string): Promise<ProjectWithTasks | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          where: { deleted: false },
          orderBy: { order: 'asc' },
        },
      },
    })
    if (!project) return null

    // PrismaのincludeによりPostgreSQL/SQLite双方で動作
    return project as unknown as ProjectWithTasks
  }

  static async create(data: CreateProjectData): Promise<Project> {
    return await prisma.project.create({
      data,
    })
  }

  static async update(
    id: string,
    data: UpdateProjectData,
  ): Promise<ProjectWithTasks> {
    return await prisma.project.update({
      where: { id },
      data,
      include: {
        tasks: {
          where: { deleted: false },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  static async delete(id: string): Promise<Project> {
    // 物理削除（Task には onDelete: Cascade が設定されています）
    return await prisma.project.delete({
      where: { id },
    })
  }

  static async isOwner(id: string, userId: string): Promise<boolean> {
    const count = await prisma.project.count({
      where: { id, userId },
    })
    return count > 0
  }

  static async copyProject(
    sourceProjectId: string,
    newProjectData: CreateProjectData
  ): Promise<ProjectWithTasks> {
    // トランザクション内でコピー処理を実行
    return await prisma.$transaction(async (tx) => {
      // コピー元プロジェクトの詳細データを取得
      const sourceProject = await tx.project.findUnique({
        where: { id: sourceProjectId },
        include: {
          tasks: {
            where: { deleted: false },
            orderBy: { order: 'asc' },
          },
          assigneeOptions: {
            orderBy: { order: 'asc' },
          },
          assigneeColors: true,
        },
      })

      if (!sourceProject) {
        throw new Error('Source project not found')
      }

      // 新しいプロジェクトを作成
      const newProject = await tx.project.create({
        data: {
          ...newProjectData,
          timeScale: newProjectData.timeScale ?? sourceProject.timeScale,
        },
        include: {
          tasks: true,
          assigneeOptions: true,
          assigneeColors: true,
        },
      })

      // タスクをコピー
      if (sourceProject.tasks.length > 0) {
        await tx.task.createMany({
          data: sourceProject.tasks.map((task) => ({
            title: task.title,
            assignee: task.assignee,
            plannedStart: task.plannedStart,
            plannedEnd: task.plannedEnd,
            order: task.order,
            projectId: newProject.id,
            deleted: false,
          })),
        })
      }

      // 担当者選択肢をコピー
      if (sourceProject.assigneeOptions.length > 0) {
        await tx.projectAssigneeOption.createMany({
          data: sourceProject.assigneeOptions.map((option) => ({
            projectId: newProject.id,
            name: option.name,
            order: option.order,
          })),
        })
      }

      // 担当者色設定をコピー
      if (sourceProject.assigneeColors.length > 0) {
        await tx.assigneeColor.createMany({
          data: sourceProject.assigneeColors.map((color) => ({
            projectId: newProject.id,
            assignee: color.assignee,
            colorIndex: color.colorIndex,
          })),
        })
      }

      // 作成されたプロジェクトを関連データと共に返す
      const result = await tx.project.findUnique({
        where: { id: newProject.id },
        include: {
          tasks: {
            where: { deleted: false },
            orderBy: { order: 'asc' },
          },
        },
      })

      return result as ProjectWithTasks
    })
  }
}


