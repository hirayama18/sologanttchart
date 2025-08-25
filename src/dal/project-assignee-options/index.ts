import { prisma } from '@/lib/prisma'

export interface ProjectAssigneeOption {
  id: string
  name: string
  order: number
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export class ProjectAssigneeOptionDAL {
  /**
   * プロジェクトの担当者選択肢を取得（順序でソート）
   */
  static async getProjectAssigneeOptions(projectId: string): Promise<ProjectAssigneeOption[]> {
    const options = await prisma.projectAssigneeOption.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    })
    
    return options
  }

  /**
   * プロジェクトの担当者選択肢を設定（一括更新）
   */
  static async setProjectAssigneeOptions(
    projectId: string,
    options: { name: string; order: number }[]
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 既存の選択肢を削除
      await tx.projectAssigneeOption.deleteMany({
        where: { projectId },
      })
      
      // 新しい選択肢を作成
      for (const option of options) {
        await tx.projectAssigneeOption.create({
          data: {
            projectId,
            name: option.name,
            order: option.order,
          },
        })
      }
    })
  }

  /**
   * デフォルトの担当者選択肢を作成
   */
  static async createDefaultAssigneeOptions(projectId: string): Promise<void> {
    const defaultOptions = [
      { name: '弊社', order: 0 },
      { name: 'お客様', order: 1 },
      { name: '弊社/お客様', order: 2 },
      { name: 'その他', order: 3 },
    ]
    
    await this.setProjectAssigneeOptions(projectId, defaultOptions)
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

  /**
   * 既存プロジェクトに担当者選択肢がない場合にデフォルトを作成
   */
  static async ensureAssigneeOptionsExist(projectId: string): Promise<void> {
    const existingOptions = await this.getProjectAssigneeOptions(projectId)
    
    if (existingOptions.length === 0) {
      await this.createDefaultAssigneeOptions(projectId)
    }
  }
}
