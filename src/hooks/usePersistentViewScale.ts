'use client'

import { useCallback, useEffect, useState } from 'react'

type Scale = 'DAY' | 'WEEK'

const STORAGE_KEY_PREFIX = 'gantt:view-scale:'

/**
 * ガントチャートのビュー単位（日/週）をプロジェクト単位で永続化するフック。
 * - 既定値は常に日単位
 * - プロジェクトが切り替わると自動的に既定値へリセット
 * - ブラウザの localStorage に保存し、再訪時に同じ表示を再現
 */
export function usePersistentViewScale(projectId?: string | null) {
  const [scale, setScale] = useState<Scale>('DAY')

  useEffect(() => {
    if (!projectId) {
      setScale('DAY')
      return
    }
    if (typeof window === 'undefined') {
      return
    }
    try {
      const stored = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`)
      if (stored === 'DAY' || stored === 'WEEK') {
        setScale(stored)
      } else {
        setScale('DAY')
      }
    } catch (error) {
      console.warn('ビュー設定の読み込みに失敗しました', error)
      setScale('DAY')
    }
  }, [projectId])

  const persist = useCallback(
    (next: Scale) => {
      setScale(next)
      if (!projectId || typeof window === 'undefined') return
      try {
        window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, next)
      } catch (error) {
        console.warn('ビュー設定の保存に失敗しました', error)
      }
    },
    [projectId],
  )

  return [scale, persist] as const
}






