import { type Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import localFont from 'next/font/local'
import './globals.css'
import { ConditionalHeader } from '@/components/layouts/conditional-header'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'ガントチャート管理',
  description: 'プロジェクトのガントチャート管理システム',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      afterSignInUrl="/projects"
      afterSignUpUrl="/projects"
    >
      <html lang="ja">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ConditionalHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
