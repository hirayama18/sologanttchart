"use client"

import { useState } from "react"
import { Calendar, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignInButton, SignUpButton } from "@clerk/nextjs"

const navigation = [
  { name: "機能", href: "#features" },
  { name: "メリット", href: "#benefits" },
  { name: "料金", href: "#pricing" },
  { name: "お問い合わせ", href: "#contact" },
]

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
    setMobileMenuOpen(false)
  }

  return (
    <header className="absolute inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-sm">
      <nav className="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <a href="#" className="-m-1.5 p-1.5 flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-gray-900">ガントチャート管理</span>
          </a>
        </div>
        
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">メニューを開く</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => scrollToSection(item.href)}
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors duration-200"
            >
              {item.name}
            </button>
          ))}
        </div>
        
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-4">
          <SignInButton mode="modal" fallbackRedirectUrl="/projects">
            <Button variant="ghost" className="text-sm font-semibold">
              ログイン
            </Button>
          </SignInButton>
          <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
              無料で始める
            </Button>
          </SignUpButton>
        </div>
      </nav>
      
      {/* モバイルメニュー */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href="#" className="-m-1.5 p-1.5 flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">ガントチャート管理</span>
              </a>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">メニューを閉じる</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => scrollToSection(item.href)}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 w-full text-left"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
                <div className="py-6 space-y-4">
                  <SignInButton mode="modal" fallbackRedirectUrl="/projects">
                    <Button variant="ghost" className="w-full">
                      ログイン
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal" fallbackRedirectUrl="/projects">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
                      無料で始める
                    </Button>
                  </SignUpButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
