"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ProjectList } from '@/components/features/projects/project-list'
import { CreateProjectForm } from '@/components/features/projects/create-project-form'
import { ProjectResponse } from '@/lib/types/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type BillingStatus = {
  isPro: boolean
  status: string
  purchasedAt: string | null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)

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

  useEffect(() => {
    let cancelled = false
    const fetchBillingStatus = async () => {
      setBillingLoading(true)
      try {
        const response = await fetch('/api/billing/status', { method: 'POST' })
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) {
            setBillingStatus(data)
          }
        }
      } catch (error) {
        console.error('Error fetching billing status:', error)
      } finally {
        if (!cancelled) {
          setBillingLoading(false)
        }
      }
    }
    fetchBillingStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const purchasedAtLabel = useMemo(() => {
    if (!billingStatus?.purchasedAt) return null
    try {
      const d = new Date(billingStatus.purchasedAt)
      return isNaN(d.getTime()) ? null : d.toLocaleString('ja-JP')
    } catch {
      return null
    }
  }, [billingStatus?.purchasedAt])

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

      {/* プラン情報セクション */}
      {!billingLoading && billingStatus && (
        <Card className="mb-6 border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              現在のプラン
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  billingStatus.isPro ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {billingStatus.isPro ? 'Pro（購入済み）' : 'Free'}
              </span>
            </CardTitle>
            <CardDescription>
              {billingStatus.isPro
                ? 'タスク数制限は解除されています。'
                : 'タスク数制限を解除したい場合はProを購入してください。'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {purchasedAtLabel ? `購入日時: ${purchasedAtLabel}` : '購入情報: -'}
            </div>
            <Link href="/pricing">
              <Button variant={billingStatus.isPro ? "outline" : "default"} className={!billingStatus.isPro ? "bg-[#6c47ff] hover:bg-[#5c3cff]" : ""}>
                {billingStatus.isPro ? 'プラン管理' : 'Proプランにアップグレード'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

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
