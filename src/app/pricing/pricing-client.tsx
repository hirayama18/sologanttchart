"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PricingClient() {
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)

  const startCheckout = async () => {
    setLoading('checkout')
    try {
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'checkout failed')
      if (!data?.url) throw new Error('checkout url missing')
      window.location.href = data.url
    } catch (e) {
      console.error(e)
      alert('決済ページの起動に失敗しました。')
    } finally {
      setLoading(null)
    }
  }

  const openPortal = async () => {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'portal failed')
      if (!data?.url) throw new Error('portal url missing')
      window.location.href = data.url
    } catch (e) {
      console.error(e)
      alert('プラン管理ページの起動に失敗しました。')
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">料金プラン</h1>
          <p className="text-sm text-gray-600">
            無料: タスク5件まで作成可能 / エクスポートは無料
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>買い切り（永久）: タスク数制限解除</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={startCheckout} disabled={loading !== null}>
              {loading === 'checkout' ? '起動中...' : '購入する（クーポン可）'}
            </Button>
            <Button variant="outline" onClick={openPortal} disabled={loading !== null}>
              {loading === 'portal' ? '起動中...' : '購入情報を確認する'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

