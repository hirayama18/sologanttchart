"use client"

import { Calendar, Github, Mail, Twitter } from "lucide-react"

const navigation = {
  product: [
    { name: "機能", href: "#features" },
    { name: "料金", href: "#pricing" },
    { name: "テンプレート", href: "#templates" },
    { name: "API", href: "#api" },
  ],
  support: [
    { name: "ヘルプセンター", href: "#help" },
    { name: "お問い合わせ", href: "#contact" },
    { name: "システム状況", href: "#status" },
    { name: "アップデート", href: "#updates" },
  ],
  company: [
    { name: "会社概要", href: "#about" },
    { name: "ブログ", href: "#blog" },
    { name: "採用情報", href: "#careers" },
    { name: "パートナー", href: "#partners" },
  ],
  legal: [
    { name: "プライバシーポリシー", href: "#privacy" },
    { name: "利用規約", href: "#terms" },
    { name: "セキュリティ", href: "#security" },
    { name: "Cookie設定", href: "#cookies" },
  ],
}

const socialLinks = [
  {
    name: "Twitter",
    href: "#",
    icon: Twitter,
  },
  {
    name: "GitHub",
    href: "#",
    icon: Github,
  },
  {
    name: "Email",
    href: "mailto:contact@gantt-app.com",
    icon: Mail,
  },
]

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* ブランド情報 */}
          <div className="lg:col-span-2">
            <div className="flex items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold">ガントチャート管理</span>
            </div>
            <p className="mt-6 text-gray-400 leading-6">
              プロジェクト管理をもっとシンプルに、もっと効率的に。
              次世代のガントチャートツールで、チームの生産性を向上させましょう。
            </p>
            <div className="mt-8 flex space-x-6">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" />
                </a>
              ))}
            </div>
          </div>

          {/* ナビゲーションリンク */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-6">プロダクト</h3>
            <ul className="space-y-4">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-6">サポート</h3>
            <ul className="space-y-4">
              {navigation.support.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-6">企業情報</h3>
            <ul className="space-y-4">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
            
            <h3 className="text-sm font-semibold text-white mb-6 mt-12">法的情報</h3>
            <ul className="space-y-4">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 区切り線とコピーライト */}
        <div className="mt-16 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center justify-between lg:flex-row">
            <p className="text-gray-400 text-sm">
              © 2024 ガントチャート管理システム. All rights reserved.
            </p>
            <div className="mt-4 lg:mt-0">
              <p className="text-gray-400 text-sm">
                Made with ❤️ in Japan
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
