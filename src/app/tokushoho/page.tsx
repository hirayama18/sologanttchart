import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記',
}

export default function TokushohoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">特定商取引法に基づく表記</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">販売事業者</h2>
        <div className="mt-3 rounded-md border">
          <dl className="divide-y">
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">販売事業者名（屋号）</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">平山大貴</dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">運営責任者</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">平山大貴</dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">所在地</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                請求があったら遅滞なく開示します。
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">電話番号</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                請求があったら遅滞なく開示します。
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">メールアドレス</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">hirayamahiroki18@gmail.com</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">販売価格・支払い</h2>
        <div className="mt-3 rounded-md border">
          <dl className="divide-y">
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">販売価格</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                <Link href="/pricing" className="underline underline-offset-2">
                  各サービス/プランページ（/pricing）
                </Link>
                に表示します
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">商品代金以外の必要料金</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                なし（ただし、インターネット接続料金・通信料金等はお客様の負担となります）
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">支払方法</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                クレジットカード（Stripe による決済）
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">支払時期</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">購入手続き完了時に決済が確定します</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">提供時期・返品/キャンセル</h2>
        <div className="mt-3 rounded-md border">
          <dl className="divide-y">
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">提供（引渡し）時期</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                決済完了後、直ちに利用可能になります
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">返品/キャンセル</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                デジタルサービスの性質上、原則として返品・キャンセルはお受けしておりません
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">動作環境</h2>
        <div className="mt-3 rounded-md border">
          <dl className="divide-y">
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium">推奨環境</dt>
              <dd className="text-sm text-muted-foreground sm:col-span-2">
                <div className="space-y-2">
                  <div>
                    ブラウザ：Google Chrome（最新版推奨・動作確認済み）、Microsoft Edge（最新版推奨）、
                    Safari（最新版推奨）、Firefox（最新版推奨）
                  </div>
                  <div>OS：Windows / macOS（各OSのサポート対象バージョン）</div>
                  <div>その他：JavaScript有効、Cookie有効、ローカルストレージ利用可能</div>
                </div>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">最終更新日：2026年1月19日</p>
    </main>
  )
}

