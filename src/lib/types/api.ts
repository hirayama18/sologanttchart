// API Request/Response types

// Projects API
export interface CreateProjectRequest {
  title: string
  startDate: string // ISO string
  endDate?: string | null
}

export interface UpdateProjectRequest {
  title?: string
  startDate?: string // ISO string
  endDate?: string | null
}

export interface ProjectResponse {
  id: string
  title: string
  startDate: string
  endDate?: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectWithTasksResponse extends ProjectResponse {
  tasks: TaskResponse[]
}

// Tasks API
export interface CreateTaskRequest {
  title: string
  assignee: string
  plannedStart: string // YYYY-MM-DD string or ISO string
  plannedEnd: string // YYYY-MM-DD string or ISO string
  projectId: string
  order?: number
  completedAt?: string | null
}

export interface UpdateTaskRequest {
  title?: string
  assignee?: string
  plannedStart?: string // YYYY-MM-DD string or ISO string
  plannedEnd?: string // YYYY-MM-DD string or ISO string
  order?: number
  completedAt?: string | null
}

export interface TaskResponse {
  id: string
  title: string
  assignee: string
  plannedStart: string
  plannedEnd: string
  order: number
  deleted: boolean
  projectId: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

// Error response
export interface ErrorResponse {
  error: string
  message?: string
}