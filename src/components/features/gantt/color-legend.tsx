"use client"

import { useMemo } from 'react'
import { TaskResponse } from '@/lib/types/api'
import { getProjectColorMapping, COMPLETED_COLOR } from '@/lib/colors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ColorLegendProps {
  tasks: TaskResponse[]
}

export function ColorLegend({ tasks }: ColorLegendProps) {
  // プロジェクト内で使用されている担当者を抽出
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set(tasks.map(task => task.assignee))
    return Array.from(uniqueAssignees).sort()
  }, [tasks])

  // 担当者ごとの色マッピングを取得
  const colorMapping = useMemo(() => {
    return getProjectColorMapping(assignees)
  }, [assignees])

  if (assignees.length === 0) {
    return null
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">色分け凡例</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3">
          {/* 担当者ごとの色 */}
          {assignees.map((assignee) => {
            const color = colorMapping[assignee]
            return (
              <div key={assignee} className="flex items-center gap-2">
                <div 
                  className={`w-4 h-4 rounded ${color.tailwind} border border-gray-300`}
                  title={color.name}
                />
                <span className="text-sm text-gray-700">{assignee}</span>
              </div>
            )
          })}
          
          {/* 完了済みタスクの色 */}
          <div className="flex items-center gap-2">
            <div 
              className={`w-4 h-4 rounded ${COMPLETED_COLOR.tailwind} border border-gray-300`}
              title={COMPLETED_COLOR.name}
            />
            <span className="text-sm text-gray-700">完了済み</span>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          ※ 担当者ごとに自動的に色が割り当てられます
        </p>
      </CardContent>
    </Card>
  )
}
