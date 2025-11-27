"use client"

import { CheckCircle, Clock, TrendingUp, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignUpButton } from "@clerk/nextjs"
import { motion } from "framer-motion"

const benefits = [
  {
    icon: TrendingUp,
    title: "生産性向上",
    description: "視覚的なガントチャートで、プロジェクトの全体像を把握。タスクの依存関係や進捗状況が一目で分かり、チーム全体の生産性が向上します。",
    stats: "30%",
    statsLabel: "生産性向上"
  },
  {
    icon: Clock,
    title: "時間短縮",
    description: "ドラッグ&ドロップの直感的な操作で、従来の管理方法と比べて大幅な時間短縮を実現。複雑なスケジュール調整も簡単に。",
    stats: "50%",
    statsLabel: "管理工数削減"
  },
  {
    icon: CheckCircle,
    title: "品質向上",
    description: "タスクの抜け漏れを防ぎ、プロジェクトの品質を向上。テンプレート機能で標準的なワークフローを確立し、一貫性のある成果物を提供。",
    stats: "40%",
    statsLabel: "品質改善"
  }
]

const testimonials = [
  {
    name: "田中 太郎",
    role: "株式会社ABC PM",
    image: "T",
    color: "from-blue-500 to-purple-600",
    content: "これまでExcelで管理していたスケジュールが、このツールのおかげで圧倒的に見やすくなりました。特にドラッグ&ドロップでタスクを調整できるのが便利です。"
  },
  {
    name: "佐藤 花子",
    role: "Design Studio 代表",
    image: "S",
    color: "from-pink-500 to-orange-600",
    content: "Web制作プロジェクトのテンプレートが非常に役立っています。クライアントとのスケジュール共有もExcelエクスポート機能で簡単になり、コミュニケーションが円滑になりました。"
  }
]

export function BenefitsSection() {
  return (
    <section className="py-24 lg:py-32 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* 左側：ベネフィット */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-base font-semibold leading-7 text-blue-600">Why Choose Us</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                結果が出るプロジェクト管理
              </p>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                単なる管理ツールではありません。<br />
                あなたのチームの潜在能力を最大限に引き出すためのプラットフォームです。
              </p>
            </motion.div>

            <div className="mt-10 space-y-8">
              {benefits.map((benefit, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="relative pl-16"
                >
                  <div className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                    <benefit.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex items-baseline gap-4">
                    <h3 className="text-xl font-semibold text-gray-900">{benefit.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      {benefit.stats} {benefit.statsLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-base leading-7 text-gray-600">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 右側：お客様の声（カード風） */}
          <div className="relative lg:mt-20">
            <div className="absolute -top-10 -right-10 w-[300px] h-[300px] bg-blue-100/50 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-[300px] h-[300px] bg-purple-100/50 rounded-full blur-3xl" />
            
            <div className="space-y-6 relative">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 + 0.2 }}
                  className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-900/5"
                >
                  <div className="flex items-center gap-x-4 mb-4">
                    <div className={`h-12 w-12 flex items-center justify-center rounded-full bg-gradient-to-r ${testimonial.color} text-white font-bold text-lg shadow-md`}>
                      {testimonial.image}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <blockquote className="text-gray-700 leading-relaxed">
                    &quot;{testimonial.content}&quot;
                  </blockquote>
                </motion.div>
              ))}

              {/* CTA Box in Testimonial Column */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center shadow-xl"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  次はあなたの番です
                </h3>
                <p className="text-gray-300 text-sm mb-6">
                  30日間の無料トライアルで、<br />
                  劇的な変化を体験してください。
                </p>
                <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
                  <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold">
                    無料で始める
                  </Button>
                </SignUpButton>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
