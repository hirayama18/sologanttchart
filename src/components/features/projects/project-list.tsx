'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ProjectResponse } from '@/lib/types/api'
import { formatDate } from 'date-fns'
import { ja } from 'date-fns/locale'
import { 
  Trash2, 
  Calendar, 
  FolderOpen, 
  Search, 
  LayoutGrid, 
  List as ListIcon, 
  MoreVertical,
  ArrowUpDown,
  Clock,
  ExternalLink,
  Pencil,
  RefreshCw
} from 'lucide-react'

interface ProjectListProps {
  onSelectProject: (project: ProjectResponse) => void // Legacy support
  onDeleteProject: (projectId: string) => void
  projects: ProjectResponse[]
  loading: boolean
  onRefresh: () => void
}

type ViewMode = 'grid' | 'list'
type SortOrder = 'updatedAt' | 'createdAt' | 'title'

export function ProjectList({ onDeleteProject, projects: initialProjects, loading, onRefresh }: ProjectListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('updatedAt')
  
  // プロジェクトのフィルタリングとソート
  const filteredProjects = useMemo(() => {
    let result = [...initialProjects]

    // 検索フィルタ
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.title.toLowerCase().includes(query)
      )
    }

    // ソート
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'updatedAt':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

    return result
  }, [initialProjects, searchQuery, sortOrder])

  const handleDelete = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    
    if (confirm('このプロジェクトを削除しますか？復元することはできません。')) {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          onDeleteProject(projectId)
        } else {
          console.error('Failed to delete project')
        }
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }

  // ローディングスケルトン
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 bg-gray-100 rounded-md w-64 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-10 bg-gray-100 rounded-md animate-pulse" />
            <div className="h-10 w-10 bg-gray-100 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse rounded-xl border-gray-200">
              <div className="h-32 bg-gray-100 border-b border-gray-100" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ツールバー */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="プロジェクトを検索..."
            className="pl-9 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600"
            onClick={onRefresh}
            title="一覧を更新"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-600">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <span className="text-xs font-medium">
                  {sortOrder === 'updatedAt' && '最終更新順'}
                  {sortOrder === 'createdAt' && '作成順'}
                  {sortOrder === 'title' && '名前順'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setSortOrder('updatedAt')}>
                最終更新順
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('createdAt')}>
                作成順
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOrder('title')}>
                名前順
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* プロジェクト一覧 */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">プロジェクトが見つかりません</h3>
          <p className="text-sm text-gray-500">
            検索条件を変更するか、新しいプロジェクトを作成してください。
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onDelete={handleDelete} 
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-6 sm:col-span-5">プロジェクト名</div>
                <div className="col-span-3 sm:col-span-3 text-right sm:text-left">開始日</div>
                <div className="hidden sm:block col-span-3">最終更新</div>
                <div className="col-span-3 sm:col-span-1 text-right">アクション</div>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredProjects.map((project) => (
                  <ProjectListItem 
                    key={project.id} 
                    project={project} 
                    onDelete={handleDelete} 
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProjectCard({ project, onDelete }: { project: ProjectResponse, onDelete: (id: string) => void }) {
  return (
    <div className="group relative flex flex-col bg-white rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* サムネイルエリア（将来的にプレビュー画像など） */}
      <Link href={`/gantt/${project.id}`} className="block h-32 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
        <div className="absolute inset-0 flex items-center justify-center">
          <FolderOpen className="h-12 w-12 text-blue-200/70 group-hover:text-blue-300/70 transition-colors" />
        </div>
        {/* プロジェクトの種類などがあればバッジを表示 */}
        <div className="absolute top-3 right-3">
           {/* <span className="px-2 py-1 bg-white/80 backdrop-blur text-xs rounded-md font-medium text-gray-600 shadow-sm">
             進行中
           </span> */}
        </div>
      </Link>

      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/gantt/${project.id}`} className="block flex-1">
            <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors" title={project.title}>
              {project.title}
            </h3>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/gantt/${project.id}`} className="flex items-center cursor-pointer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  開く
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled className="flex items-center cursor-pointer">
                <Pencil className="h-4 w-4 mr-2" />
                名前を変更
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(project.id)} 
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto space-y-1.5">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            {formatDate(new Date(project.startDate), 'yyyy/MM/dd', { locale: ja })}
          </div>
          <div className="flex items-center text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {formatDate(new Date(project.updatedAt), 'yyyy/MM/dd', { locale: ja })}
          </div>
        </div>
      </CardContent>
    </div>
  )
}

function ProjectListItem({ project, onDelete }: { project: ProjectResponse, onDelete: (id: string) => void }) {
  return (
    <div className="group grid grid-cols-12 gap-4 p-4 items-center hover:bg-blue-50/30 transition-colors">
      <div className="col-span-6 sm:col-span-5 flex items-center gap-3 overflow-hidden">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
          <FolderOpen className="h-4 w-4" />
        </div>
        <Link href={`/gantt/${project.id}`} className="truncate font-medium text-gray-900 hover:text-blue-600 hover:underline">
          {project.title}
        </Link>
      </div>
      
      <div className="col-span-3 sm:col-span-3 text-xs text-gray-500 text-right sm:text-left truncate">
        <span className="sm:hidden">
          {formatDate(new Date(project.startDate), 'MM/dd', { locale: ja })}
        </span>
        <span className="hidden sm:inline">
          {formatDate(new Date(project.startDate), 'yyyy年MM月dd日', { locale: ja })}
        </span>
      </div>

      <div className="hidden sm:block col-span-3 text-xs text-gray-500 truncate">
        {formatDate(new Date(project.updatedAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
      </div>

      <div className="col-span-3 sm:col-span-1 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/gantt/${project.id}`} className="flex items-center cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2" />
                開く
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(project.id)} 
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
