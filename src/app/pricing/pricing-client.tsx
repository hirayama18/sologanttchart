"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type BillingStatus = {
  isPro: boolean
  status: string
  purchasedAt: string | null
}

export function PricingClient() {
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/billing/status', { method: 'POST' })
        const data = (await res.json().catch(() => null)) as BillingStatus | null
        if (!res.ok || !data) return
        if (cancelled) return
        setBillingStatus(data)
      } catch {
        // noop
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const isPro = billingStatus?.isPro === true
  const purchasedAtLabel = useMemo(() => {
    if (!billingStatus?.purchasedAt) return null
    try {
      const d = new Date(billingStatus.purchasedAt)
      return isNaN(d.getTime()) ? null : d.toLocaleString('ja-JP')
    } catch {
      return null
    }
  }, [billingStatus?.purchasedAt])

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
      alert('購入情報ページの起動に失敗しました。')
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">料金プラン</h1>
            <p className="text-sm text-gray-600">
              無料: タスク5件まで作成可能 / エクスポートは無料
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/projects" className="text-sm text-gray-600 hover:text-gray-900">
              プロジェクトへ戻る
            </Link>
          </div>
        </div>

        {/* 現在の状態 */}
        <Card className="border-gray-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              現在のプラン
              {billingStatus && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    isPro ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isPro ? 'Pro（購入済み）' : 'Free'}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isPro
                ? 'タスク数制限は解除されています。'
                : 'タスク数制限を解除したい場合はProを購入してください。'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {purchasedAtLabel ? `購入日時: ${purchasedAtLabel}` : '購入情報: -'}
            </div>
            <Button variant="outline" onClick={openPortal} disabled={loading !== null}>
              {loading === 'portal' ? '起動中...' : '購入情報を確認する'}
            </Button>
          </CardContent>
        </Card>

        {/* プラン比較 */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-gray-200/70">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>まずは無料で試す</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700">
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="mt-0.5 text-gray-400">•</span>
                  <span>タスク作成はプロジェクト内で5件まで</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-gray-400">•</span>
                  <span>Excelエクスポートは無料</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/projects">
                  <Button variant="outline">Freeのまま使う</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-gray-200/70">
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-purple-200/60 blur-3xl" />
            <div className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-blue-200/60 blur-3xl" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pro
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                  買い切り（永久）
                </span>
              </CardTitle>
              <CardDescription>タスク数制限解除で、チームや大規模案件でも快適</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>タスク数制限を解除</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>クーポン（割引/無料）対応</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-emerald-600">✓</span>
                  <span>購入後すぐに反映（Webhook）</span>
                </li>
              </ul>

              <div className="flex flex-wrap gap-2">
                <Button onClick={startCheckout} disabled={loading !== null || isPro}>
                  {isPro ? '購入済み' : loading === 'checkout' ? '起動中...' : 'Proを購入する（クーポン可）'}
                </Button>
                <Link href="/projects">
                  <Button variant="outline">あとで購入する</Button>
                </Link>
              </div>

              <p className="text-xs text-gray-500">
                決済はStripeにより安全に処理されます。購入完了後に自動でProが反映されます。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

