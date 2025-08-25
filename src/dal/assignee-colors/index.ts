import { prisma } from '@/lib/prisma'

export class AssigneeColorDAL {
  /**
   * プロジェクトの担当者色設定を取得
   */
  static async getProjectColorSettings(projectId: string): Promise<Record<string, number>> {
    const colors = await prisma.assigneeColor.findMany({
      where: { projectId },
    })
    
    const settings: Record<string, number> = {}
    for (const color of colors) {
      settings[color.assignee] = color.colorIndex
    }
    
    return settings
  }

  /**
   * 担当者の色設定を更新または作成
   */
  static async setAssigneeColor(
    projectId: string,
    assignee: string,
    colorIndex: number
  ): Promise<void> {
    await prisma.assigneeColor.upsert({
      where: {
        projectId_assignee: {
          projectId,
          assignee,
        },
      },
      update: {
        colorIndex,
      },
      create: {
        projectId,
        assignee,
        colorIndex,
      },
    })
  }

  /**
   * 担当者の色設定を削除（デフォルトに戻す）
   */
  static async removeAssigneeColor(
    projectId: string,
    assignee: string
  ): Promise<void> {
    await prisma.assigneeColor.deleteMany({
      where: {
        projectId,
        assignee,
      },
    })
  }

  /**
   * プロジェクトの全色設定を削除
   */
  static async clearProjectColorSettings(projectId: string): Promise<void> {
    await prisma.assigneeColor.deleteMany({
      where: { projectId },
    })
  }

  /**
   * プロジェクトの所有者チェック
   */
  static async isProjectOwner(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    })
    
    return project?.userId === userId
  }
}
