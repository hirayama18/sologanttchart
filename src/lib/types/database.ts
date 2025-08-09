import { Project, Task } from '@prisma/client'

// Database types
export type { Project, Task }

// Extended types with relations
export type ProjectWithTasks = Project & {
  tasks: Task[]
}

export type TaskWithProject = Task & {
  project: Project
}

// Create/Update types
export type CreateProjectData = {
  title: string
  startDate: Date
  endDate?: Date | null
  userId: string
}

export type UpdateProjectData = Partial<Omit<CreateProjectData, 'userId'>>

export type CreateTaskData = {
  title: string
  assignee: string
  plannedStart: Date
  plannedEnd: Date
  projectId: string
  order?: number
  completedAt?: Date | null
}

export type UpdateTaskData = Partial<Omit<CreateTaskData, 'projectId'>>

// Assignee enum
export enum TaskAssignee {
  COMPANY = '弊社',
  CLIENT = 'お客様', 
  BOTH = '弊社/お客様',
  OTHER = 'その他'
}