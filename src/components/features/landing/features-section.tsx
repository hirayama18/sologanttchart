"use client"

import { 
  BarChart3, 
  Calendar, 
  Download, 
  GripVertical, 
  Lock, 
  Smartphone,
  Target,
  Users,
  Zap
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: GripVertical,
    title: "直感的なドラッグ&ドロップ",
    description: "タスクの期間や順序をドラッグ&ドロップで簡単に変更。視覚的な操作でプロジェクト管理がより直感的に。",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    icon: BarChart3,
    title: "リアルタイム更新",
    description: "変更はリアルタイムで反映され、チーム全体で最新の進捗状況を共有できます。",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    icon: Calendar,
    title: "スマートスケジューリング",
    description: "プロジェクトの開始日から自動で6ヶ月分のスケジュールを表示。祝日や週末も自動で色分け表示。",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    icon: Users,
    title: "担当者管理",
    description: "「弊社」「お客様」「弊社/お客様」「その他」から担当者を選択し、責任の所在を明確化。",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    icon: Download,
    title: "Excelエクスポート",
    description: "ガントチャートをExcelファイルとして出力可能。クライアントとの共有や報告書作成に最適。",
    color: "text-teal-600",
    bgColor: "bg-teal-100"
  },
  {
    icon: Target,
    title: "プロジェクトテンプレート",
    description: "システム開発やWebサイト制作のテンプレートを使用して、すぐにプロジェクトを開始できます。",
    color: "text-pink-600",
    bgColor: "bg-pink-100"
  },
  {
    icon: Lock,
    title: "セキュアな認証",
    description: "Clerkによる安全な認証システムで、ユーザーデータを保護。企業レベルのセキュリティを提供。",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  },
  {
    icon: Zap,
    title: "高速パフォーマンス",
    description: "Next.jsとTypeScriptで構築された高性能アプリケーション。大量のタスクでも快適に動作。",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100"
  },
  {
    icon: Smartphone,
    title: "レスポンシブデザイン",
    description: "PC、タブレット、スマートフォンあらゆるデバイスで最適な表示。いつでもどこでもプロジェクト管理。",
    color: "text-cyan-600",
    bgColor: "bg-cyan-100"
  }
]

export function FeaturesSection() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">機能紹介</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            プロジェクト管理に必要な
            <br />
            すべての機能を提供
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
            初心者でも使いやすく、上級者にも満足いただける豊富な機能で、
            あらゆるプロジェクトに対応します。
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="group transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-6">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
