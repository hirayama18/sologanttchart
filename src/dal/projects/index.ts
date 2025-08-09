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
}


