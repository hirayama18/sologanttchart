"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'

export function ConditionalHeader() {
  const pathname = usePathname()
  const [planLabel, setPlanLabel] = useState<string | null>(null)
  const [isPro, setIsPro] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/billing/status', { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        if (cancelled) return
        const pro = data?.isPro === true
        setIsPro(pro)
        setPlanLabel(pro ? 'Pro' : 'Free')
      } catch {
        // noop
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  // ランディングページと特定商取引法ページの場合はヘッダーを表示しない
  if (pathname === '/' || pathname === '/tokushoho' || pathname === '/commerce-disclosure') {
    return null
  }

  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16">
      <SignedOut>
        <SignInButton fallbackRedirectUrl="/projects" />
        <SignUpButton fallbackRedirectUrl="/projects">
          <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
            サインアップ
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        {planLabel && (
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              プラン: <span className="font-medium text-gray-700">{planLabel}</span>
            </div>
            {isPro === false && (
              <Link href="/pricing">
                <Button
                  size="sm"
                  variant="default"
                  className="rounded-full bg-[#6c47ff] text-white shadow hover:bg-[#5c3cff]"
                >
                  Proにする
                </Button>
              </Link>
            )}
          </div>
        )}
        <UserButton />
      </SignedIn>
    </header>
  )
}
