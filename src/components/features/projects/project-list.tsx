'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProjectResponse } from '@/lib/types/api'
import { formatDate } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Trash2, Calendar, FolderOpen } from 'lucide-react'

interface ProjectListProps {
  onSelectProject: (project: ProjectResponse) => void
  onDeleteProject: (projectId: string) => void
  selectedProjectId?: string
}

export function ProjectList({ onSelectProject, onDeleteProject, selectedProjectId }: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        console.error('Failed to fetch projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation() // カード選択を防ぐ
    
    if (confirm('このプロジェクトを削除しますか？')) {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setProjects(projects.filter(p => p.id !== projectId))
          onDeleteProject(projectId)
        } else {
          console.error('Failed to delete project')
        }
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse rounded-xl">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 border rounded-xl bg-white">
        <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">プロジェクトがありません</h3>
        <p className="text-gray-500">右上の「新しいプロジェクト」から作成してください。</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project) => (
        <Card 
          key={project.id}
          className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 rounded-xl border bg-white ${
            selectedProjectId === project.id 
              ? 'ring-2 ring-blue-500 bg-blue-50/40' 
              : ''
          }`}
          onClick={() => onSelectProject(project)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
                {project.title}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDelete(project.id, e)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                aria-label="プロジェクトを削除"
                title="プロジェクトを削除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              開始日: {formatDate(new Date(project.startDate), 'yyyy年MM月dd日', { locale: ja })}
            </div>
            <CardDescription className="mt-2">
              作成: {formatDate(new Date(project.createdAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}