"use client"

import { ArrowRight, Check, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"

const features = [
  "無制限のプロジェクト作成",
  "リアルタイム同期",
  "Excelエクスポート",
  "テンプレート機能",
  "セキュアな認証",
  "モバイル対応"
]

export function CTASection() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center rounded-full bg-yellow-100 px-6 py-3 text-sm font-medium text-yellow-800">
            <Star className="mr-2 h-4 w-4 fill-current" />
            <span>30日間無料トライアル</span>
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            プロジェクト管理を
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}革新
            </span>
            しませんか？
          </h2>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
            今すぐ無料でアカウントを作成し、次世代のプロジェクト管理を体験してください。
            クレジットカード不要で、すべての機能を30日間お試しいただけます。
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* 左側：機能一覧 */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">
                無料トライアルに含まれる機能
              </h3>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="ml-3 text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              
              <div className="rounded-lg bg-blue-50 p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Star className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-900">特別オファー</h4>
                    <p className="mt-1 text-sm text-blue-700">
                      今月中にご登録いただいた方には、プレミアムテンプレートを無料でプレゼント！
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 右側：CTA */}
            <div className="flex flex-col justify-center space-y-8">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-8 text-white">
                <h4 className="text-2xl font-bold mb-4">今すぐ始める</h4>
                <p className="text-blue-100 mb-6">
                  セットアップは3分で完了。
                  すぐにプロジェクト管理を開始できます。
                </p>
                
                <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
                  <Button size="lg" variant="secondary" className="w-full bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
                    無料アカウント作成
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignUpButton>
                
                <p className="text-xs text-blue-200 mt-4 text-center">
                  クレジットカード不要 • 30日間無料 • いつでもキャンセル可能
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  既にアカウントをお持ちですか？
                </p>
                <SignInButton mode="modal" fallbackRedirectUrl="/projects">
                  <Button variant="outline" className="w-full">
                    ログインする
                  </Button>
                </SignInButton>
              </div>
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">10,000+</div>
            <div className="text-sm text-gray-600">満足しているユーザー</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">50,000+</div>
            <div className="text-sm text-gray-600">管理されたプロジェクト</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">99.9%</div>
            <div className="text-sm text-gray-600">サービス稼働率</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">24/7</div>
            <div className="text-sm text-gray-600">サポート体制</div>
          </div>
        </div>
      </div>
    </section>
  )
}
