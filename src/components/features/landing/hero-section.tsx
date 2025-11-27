"use client"

import { ArrowRight, CheckCircle, PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignUpButton } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { HeroPreview } from "./hero-preview"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } as const }
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-24 pb-20 lg:pt-32 lg:pb-28">
      {/* 背景の装飾 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-100/50 blur-3xl animate-blob" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-pink-100/30 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* 左側：テキストコンテンツ */}
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="max-w-2xl text-left"
          >
            <motion.div variants={item} className="mb-6 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 border border-blue-100 ring-4 ring-blue-50/50">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
              New: AIスケジュール最適化機能
            </motion.div>
            
            <motion.h1 variants={item} className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl leading-[1.1]">
              プロジェクト管理を
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                もっと自由に、
              </span>
              <br />
              もっと直感的に。
            </motion.h1>
            
            <motion.p variants={item} className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl">
              複雑なタスク管理から解放されましょう。
              <br className="hidden sm:block" />
              日単位・週単位の切り替えも、タスクの並び替えも、
              驚くほどスムーズに。
            </motion.p>
            
            <motion.div variants={item} className="mt-10 flex flex-wrap gap-4">
              <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
                <Button size="lg" className="h-14 px-8 text-lg bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:-translate-y-1">
                  無料で始める
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
              
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-gray-50 transition-all">
                <PlayCircle className="mr-2 h-5 w-5" />
                デモを見る
              </Button>
            </motion.div>

            <motion.div variants={item} className="mt-10 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>クレジットカード不要</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>14日間無料トライアル</span>
              </div>
            </motion.div>
          </motion.div>

          {/* 右側：プレビュー（ここをリッチにする） */}
          <div className="relative lg:h-[600px] flex items-center justify-center">
             <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  )
}
