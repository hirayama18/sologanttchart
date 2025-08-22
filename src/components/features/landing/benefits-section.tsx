"use client"

import { CheckCircle, Clock, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignUpButton } from "@clerk/nextjs"

const benefits = [
  {
    icon: TrendingUp,
    title: "生産性向上",
    description: "視覚的なガントチャートで、プロジェクトの全体像を把握。タスクの依存関係や進捗状況が一目で分かり、チーム全体の生産性が向上します。",
    stats: "生産性30%向上"
  },
  {
    icon: Clock,
    title: "時間短縮",
    description: "ドラッグ&ドロップの直感的な操作で、従来の管理方法と比べて大幅な時間短縮を実現。複雑なスケジュール調整も簡単に。",
    stats: "管理時間50%削減"
  },
  {
    icon: CheckCircle,
    title: "品質向上",
    description: "タスクの抜け漏れを防ぎ、プロジェクトの品質を向上。テンプレート機能で標準的なワークフローを確立し、一貫性のある成果物を提供。",
    stats: "品質向上40%"
  }
]

export function BenefitsSection() {
  return (
    <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* セクションヘッダー */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">なぜ選ばれるのか</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            プロジェクト管理を
            <br />
            次のレベルへ
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
            数値で証明された効果と、ユーザーの声が示す真の価値をご紹介します。
          </p>
        </div>

        {/* ベネフィット一覧 */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-12 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="group relative">
              <div className="relative rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                
                <p className="text-gray-600 leading-6 mb-6">
                  {benefit.description}
                </p>
                
                <div className="inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
                  {benefit.stats}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 顧客の声 */}
        <div className="mt-20">
          <div className="mx-auto max-w-4xl">
            <h3 className="text-center text-2xl font-bold text-gray-900 mb-12">
              お客様の声
            </h3>
            
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-8 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    田中
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">田中 太郎</div>
                    <div className="text-sm text-gray-600">株式会社ABC プロジェクトマネージャー</div>
                  </div>
                </div>
                <p className="text-gray-600 leading-6">
                  「これまでExcelで管理していたスケジュールが、このツールのおかげで圧倒的に見やすくなりました。
                  特にドラッグ&ドロップでタスクを調整できるのが便利で、チーム全体の生産性が向上しています。」
                </p>
              </div>
              
              <div className="rounded-2xl bg-white p-8 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white font-bold">
                    佐藤
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">佐藤 花子</div>
                    <div className="text-sm text-gray-600">デザイン事務所XYZ 代表</div>
                  </div>
                </div>
                <p className="text-gray-600 leading-6">
                  「Web制作プロジェクトのテンプレートが非常に役立っています。
                  クライアントとのスケジュール共有もExcelエクスポート機能で簡単になり、
                  コミュニケーションが円滑になりました。」
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              今すぐ始めて、効果を実感してください
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              無料でアカウントを作成し、プロジェクト管理の新しい体験を始めましょう。
              30日間すべての機能を無料でお試しいただけます。
            </p>
            <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
                無料で始める
              </Button>
            </SignUpButton>
          </div>
        </div>
      </div>
    </section>
  )
}
