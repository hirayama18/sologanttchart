"use client"

import { ArrowRight, Calendar, CheckCircle, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignUpButton } from "@clerk/nextjs"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 lg:py-28">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDYwIDAgTCAwIDAgMCA2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjJmNGY3IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center rounded-full bg-blue-100 px-6 py-3 text-sm font-medium text-blue-800">
            <Calendar className="mr-2 h-4 w-4" />
            <span>プロジェクト管理をもっとシンプルに</span>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            プロジェクトの進捗を
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}視覚的に管理
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
            直感的なガントチャートで、チームの生産性を向上させましょう。
            ドラッグ&ドロップでタスクを管理し、プロジェクトの全体像を一目で把握できます。
          </p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white hover:from-blue-700 hover:to-purple-700">
                無料で始める
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </SignUpButton>
            
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg font-semibold">
              デモを見る
            </Button>
          </div>
          
          {/* 統計情報 */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900">10,000+</div>
              <div className="text-sm text-gray-600">アクティブユーザー</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900">50,000+</div>
              <div className="text-sm text-gray-600">完了プロジェクト</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mt-4 text-2xl font-bold text-gray-900">99.9%</div>
              <div className="text-sm text-gray-600">稼働率</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
