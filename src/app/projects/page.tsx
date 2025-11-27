"use client"

import { useState, useEffect } from 'react'
import { ProjectList } from '@/components/features/projects/project-list'
import { CreateProjectForm } from '@/components/features/projects/create-project-form'
import { ProjectResponse } from '@/lib/types/api'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    setLoading(true)
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

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleProjectCreated = (project: ProjectResponse) => {
    setProjects(prev => [project, ...prev])
  }

  // リスト側で削除完了後に呼ばれる
  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">プロジェクト</h1>
          <p className="text-sm text-gray-500 mt-1">
            プロジェクトの管理・編集を行います
          </p>
        </div>
        
        <CreateProjectForm 
          onProjectCreated={handleProjectCreated} 
          className="shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
        />
      </div>

      <ProjectList 
        projects={projects}
        onDeleteProject={handleDeleteProject}
        onSelectProject={() => {}} // 互換性のために残すが、実際はリンク遷移
        loading={loading}
        onRefresh={fetchProjects}
      />
    </div>
  )
}
