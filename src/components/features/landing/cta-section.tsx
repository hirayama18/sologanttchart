"use client"

import { ArrowRight, Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { motion } from "framer-motion"

const features = [
  "無制限のプロジェクト",
  "リアルタイム同期",
  "Excelエクスポート",
  "テンプレート機能",
  "モバイル対応",
  "24時間サポート"
]

export function CTASection() {
  return (
    <section className="relative isolate overflow-hidden bg-gray-900 py-24 sm:py-32">
      {/* 背景アニメーション */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-gray-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/20 rounded-full blur-[100px]"
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <div className="mb-8 inline-flex items-center rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
            <Sparkles className="mr-2 h-4 w-4 text-yellow-300" />
            <span>今すぐ始めれば、最初の30日間は完全無料</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            プロジェクトの成功を、
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ここから始めよう
            </span>
          </h2>
          
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            すでに10,000人以上のプロジェクトマネージャーが導入しています。<br />
            クレジットカードは必要ありません。1分でセットアップ完了。
          </p>

          <div className="mt-10 flex flex-col items-center gap-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
                <Button size="lg" className="min-w-[200px] h-14 text-lg bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-900/20 transition-all hover:scale-105">
                  無料でアカウント作成
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/projects">
                <Button variant="outline" size="lg" className="min-w-[200px] h-14 text-lg rounded-full border-gray-700 bg-transparent text-white hover:bg-gray-800 hover:text-white transition-all">
                  ログイン
                </Button>
              </SignInButton>
            </div>

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-gray-400">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
