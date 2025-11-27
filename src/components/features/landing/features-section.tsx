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
import { motion } from "framer-motion"

const features = [
  {
    icon: GripVertical,
    title: "直感的なドラッグ&ドロップ",
    description: "タスクの期間や順序をドラッグ&ドロップで簡単に変更。視覚的な操作でプロジェクト管理がより直感的に。",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    delay: 0
  },
  {
    icon: BarChart3,
    title: "リアルタイム更新",
    description: "変更はリアルタイムで反映され、チーム全体で最新の進捗状況を共有できます。競合の心配もありません。",
    color: "text-green-600",
    bgColor: "bg-green-50",
    delay: 0.1
  },
  {
    icon: Calendar,
    title: "スマートスケジューリング",
    description: "プロジェクトの開始日から自動で6ヶ月分のスケジュールを表示。祝日や週末も自動で色分け表示。",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    delay: 0.2
  },
  {
    icon: Users,
    title: "柔軟な担当者管理",
    description: "「弊社」「お客様」「弊社/お客様」「その他」から担当者を選択し、責任の所在を明確化。",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    delay: 0
  },
  {
    icon: Download,
    title: "Excelエクスポート",
    description: "ガントチャートをExcelファイルとして出力可能。クライアントとの共有や報告書作成に最適。",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    delay: 0.1
  },
  {
    icon: Target,
    title: "テンプレート活用",
    description: "システム開発やWebサイト制作のテンプレートを使用して、すぐにプロジェクトを開始できます。",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    delay: 0.2
  },
  {
    icon: Lock,
    title: "エンタープライズ級セキュリティ",
    description: "Clerkによる安全な認証システムで、ユーザーデータを保護。安心してご利用いただけます。",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    delay: 0
  },
  {
    icon: Zap,
    title: "高速パフォーマンス",
    description: "最新のNext.js技術スタックにより、大量のタスクでもサクサク動作する快適な操作性を実現。",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    delay: 0.1
  },
  {
    icon: Smartphone,
    title: "レスポンシブ対応",
    description: "PC、タブレット、スマートフォンあらゆるデバイスで最適な表示。移動中でも確認可能です。",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    delay: 0.2
  }
]

export function FeaturesSection() {
  return (
    <section className="bg-gray-50 py-24 lg:py-32 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="mx-auto max-w-4xl text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-base font-semibold leading-7 text-blue-600"
          >
            Powerful Features
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
          >
            プロジェクト管理に必要な
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              すべての機能
            </span>
            を搭載
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: feature.delay, duration: 0.5 }}
            >
              <Card className="h-full border-0 shadow-none bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ring-1 ring-gray-900/5">
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 mt-4">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
