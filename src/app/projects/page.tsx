"use client"

import { useState } from 'react'
// import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProjectList } from '@/components/features/projects/project-list'
import { CreateProjectForm } from '@/components/features/projects/create-project-form'
import { ProjectResponse } from '@/lib/types/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Settings, BarChart3 } from 'lucide-react'

export default function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null)
  const [, setProjects] = useState<ProjectResponse[]>([])
  // const router = useRouter()

  const handleProjectCreated = (project: ProjectResponse) => {
    setProjects(prev => [project, ...prev])
    setSelectedProject(project)
  }

  const handleSelectProject = (project: ProjectResponse) => {
    setSelectedProject(project)
  }

  const handleDeleteProject = (projectId: string) => {
    if (selectedProject?.id === projectId) {
      setSelectedProject(null)
    }
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  // リンク遷移へ変更済み

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero section */}
      <div className="mb-8">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">プロジェクト</h1>
                <p className="text-gray-600 max-w-prose">
                  プロジェクトを作成・選択し、ガントチャートでスケジュールを管理できます。
                </p>
              </div>
              <div className="shrink-0">
                <CreateProjectForm onProjectCreated={handleProjectCreated} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* プロジェクト一覧 */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">プロジェクト一覧</h2>
          </div>
          
          <ProjectList 
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            selectedProjectId={selectedProject?.id}
          />
        </div>

        {/* プロジェクト詳細・操作パネル */}
        <div className="lg:col-span-1">
          {selectedProject ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderOpen className="h-5 w-5 mr-2" />
                  選択中のプロジェクト
                </CardTitle>
                <CardDescription>
                  プロジェクトの詳細と操作
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">{selectedProject.title}</h3>
                  <p className="text-sm text-gray-600">
                    開始日: {new Date(selectedProject.startDate).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  {selectedProject && (
                    <Button asChild className="w-full">
                      <Link href={`/gantt/${selectedProject.id}`} prefetch={false}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        ガントチャートを開く
                      </Link>
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    プロジェクト設定
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    作成日: {new Date(selectedProject.createdAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>プロジェクトを選択</CardTitle>
                <CardDescription>
                  左からプロジェクトを選択してください
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    プロジェクトを選択すると、<br />
                    詳細情報と操作メニューが表示されます。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}