# ガントチャートアプリケーション 理解ガイド

## 📚 目次
1. [プロジェクト概要](#プロジェクト概要)
2. [アーキテクチャ全体像](#アーキテクチャ全体像)
3. [技術スタック詳細](#技術スタック詳細)
4. [ディレクトリ構造の説明](#ディレクトリ構造の説明)
5. [データフローの理解](#データフローの理解)
6. [主要機能の実装詳細](#主要機能の実装詳細)
7. [認証の仕組み](#認証の仕組み)
8. [パフォーマンス最適化](#パフォーマンス最適化)
9. [学習のポイント](#学習のポイント)

---

## プロジェクト概要

このプロジェクトは、**プロジェクト管理用のガントチャートWebアプリケーション**です。

### 主な機能
- ✅ ユーザー認証（Clerk）
- ✅ プロジェクトの作成・管理
- ✅ タスクの作成・編集・削除・複製
- ✅ ガントチャートでの視覚的なスケジュール管理
- ✅ ドラッグ&ドロップによる期間変更
- ✅ Excelエクスポート機能
- ✅ 日単位/週単位の表示切り替え

### 対象ユーザー
プロジェクトマネージャーや開発者が、タスクのスケジュールを視覚的に管理するためのツールです。

---

## アーキテクチャ全体像

```
┌─────────────────────────────────────────────────────────┐
│                     ブラウザ（クライアント）                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ ページコンポ  │  │ UIコンポーネント│  │ カスタムフック │  │
│  │   ーネント    │  │              │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          │  fetch API        │  React Hooks     │
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────┐
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼──────┐  │
│  │         Next.js API Routes (Server)              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │認証チェック│  │バリデーション│  │エラーハンドリング│      │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │  │
│  └───────┼─────────────┼─────────────┼─────────────┘  │
│          │             │             │                 │
│          │             │             │                 │
│  ┌───────▼─────────────▼─────────────▼─────────────┐  │
│  │            DAL (Data Access Layer)               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │ProjectDAL│  │ TaskDAL  │  │その他DAL │      │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │  │
│  └───────┼─────────────┼─────────────┼─────────────┘  │
│          │             │             │                 │
│          │             │             │                 │
│  ┌───────▼─────────────▼─────────────▼─────────────┐  │
│  │              Prisma ORM                           │  │
│  └───────┬───────────────────────────────────────────┘  │
│          │                                               │
│  ┌───────▼───────────────────────────────────────────┐  │
│  │         PostgreSQL (本番) / SQLite (開発)         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### レイヤー構造の説明

1. **プレゼンテーション層（UI）**
   - Reactコンポーネント
   - ユーザーインターフェース
   - イベントハンドリング

2. **ビジネスロジック層**
   - カスタムフック（`useOptimizedTaskOperations`など）
   - 状態管理
   - 楽観的UI更新

3. **API層**
   - Next.js API Routes
   - 認証・認可チェック
   - リクエスト/レスポンス処理

4. **データアクセス層（DAL）**
   - データベース操作の抽象化
   - ビジネスロジックとDB操作の分離

5. **データベース層**
   - Prisma ORM
   - PostgreSQL/SQLite

---

## 技術スタック詳細

### フロントエンド

#### Next.js 14.2.25 (App Router)
- **App Router**: 新しいルーティングシステム
- **Server Components**: デフォルトでサーバーサイドでレンダリング
- **Client Components**: `'use client'`ディレクティブで明示的に指定

**重要なポイント:**
```typescript
// Server Component（デフォルト）
export default function Page() {
  // サーバーサイドで実行される
  return <div>...</div>
}

// Client Component（明示的に指定）
'use client'
export default function Component() {
  // ブラウザで実行される
  const [state, setState] = useState()
  return <div>...</div>
}
```

#### React 18.2.0
- 関数コンポーネント
- Hooks（useState, useEffect, useCallback, useMemoなど）

#### TypeScript 5.2.2
- 型安全性の確保
- インターフェースと型定義

### バックエンド

#### Prisma 5.11.0
- **ORM（Object-Relational Mapping）**: データベース操作を型安全に行う
- **スキーマ定義**: `prisma/schema.prisma`でデータモデルを定義
- **マイグレーション**: データベース構造の変更管理

**Prismaの使い方:**
```typescript
// DAL層での使用例
import { prisma } from '@/lib/prisma'

// データ取得
const projects = await prisma.project.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
})

// データ作成
const project = await prisma.project.create({
  data: { title, startDate, userId }
})
```

### 認証

#### Clerk 6.12.9
- 認証・ユーザー管理サービス
- ミドルウェアで認証チェック

**認証の流れ:**
1. ユーザーがサインイン
2. Clerkが認証トークンを発行
3. ミドルウェア（`middleware.ts`）で認証チェック
4. API RoutesでユーザーIDを取得

---

## ディレクトリ構造の説明

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # トップページ（ランディングページ）
│   ├── layout.tsx                # ルートレイアウト（ClerkProvider含む）
│   ├── projects/                 # プロジェクト一覧ページ
│   │   └── page.tsx
│   ├── gantt/[id]/               # ガントチャートページ（動的ルート）
│   │   └── page.tsx
│   └── api/                      # API Routes
│       ├── projects/
│       │   ├── route.ts          # GET, POST /api/projects
│       │   └── [id]/
│       │       ├── route.ts      # GET, PATCH, DELETE /api/projects/:id
│       │       └── export/
│       │           └── route.ts  # POST /api/projects/:id/export
│       └── tasks/
│           ├── route.ts          # POST /api/tasks
│           └── [id]/
│               └── route.ts      # PATCH, DELETE /api/tasks/:id
│
├── components/                   # Reactコンポーネント
│   ├── features/                 # 機能別コンポーネント
│   │   ├── gantt/
│   │   │   ├── gantt-chart.tsx   # メインのガントチャートコンポーネント
│   │   │   └── color-legend.tsx  # 色凡例コンポーネント
│   │   ├── projects/
│   │   │   ├── project-list.tsx  # プロジェクト一覧
│   │   │   └── create-project-form.tsx
│   │   └── tasks/
│   │       ├── task-form.tsx    # タスク作成・編集フォーム
│   │       └── task-list.tsx
│   ├── layouts/                  # レイアウトコンポーネント
│   │   └── conditional-header.tsx
│   └── ui/                       # Shadcn/uiコンポーネント
│       ├── button.tsx
│       ├── dialog.tsx
│       └── ...
│
├── dal/                          # Data Access Layer
│   ├── projects/
│   │   └── index.ts              # ProjectDALクラス
│   └── tasks/
│       └── index.ts              # TaskDALクラス
│
├── hooks/                        # カスタムフック
│   ├── useOptimizedTaskOperations.ts  # タスク操作の最適化
│   ├── useOptimizedTaskUpdate.ts      # タスク更新の最適化
│   └── useDebounce.ts                 # デバウンス処理
│
└── lib/                          # ユーティリティ
    ├── auth.ts                   # 認証ヘルパー
    ├── prisma.ts                 # Prismaクライアント
    ├── colors.ts                 # 色管理
    ├── utils.ts                  # 汎用ユーティリティ
    └── types/                    # 型定義
        ├── api.ts                # API型定義
        └── database.ts           # データベース型定義
```

### 重要なディレクトリの役割

#### `app/` - Next.js App Router
- **ページコンポーネント**: 各ルートに対応するページ
- **API Routes**: バックエンドAPIエンドポイント
- **レイアウト**: 共通レイアウト（`layout.tsx`）

#### `components/` - Reactコンポーネント
- **features/**: 機能ごとに整理されたコンポーネント
- **ui/**: 再利用可能なUIコンポーネント（Shadcn/ui）

#### `dal/` - Data Access Layer
- **データベース操作の抽象化**: ビジネスロジックとDB操作を分離
- **再利用性**: 複数のAPI Routesから同じDALを使用

#### `hooks/` - カスタムフック
- **ロジックの再利用**: 複数のコンポーネントで使用
- **状態管理**: 複雑な状態管理ロジックをカプセル化

---

## データフローの理解

### 1. プロジェクト一覧の表示フロー

```
ユーザーが /projects にアクセス
    ↓
projects/page.tsx (Client Component)
    ↓
useEffect でデータ取得
    ↓
fetch('/api/projects') [GET]
    ↓
app/api/projects/route.ts
    ↓
getAuthenticatedUserId() で認証チェック
    ↓
ProjectDAL.getByUserId(userId)
    ↓
prisma.project.findMany()
    ↓
データベースから取得
    ↓
JSONレスポンスを返す
    ↓
フロントエンドで状態更新
    ↓
ProjectListコンポーネントで表示
```

### 2. タスク作成フロー

```
ユーザーが「新しいタスク」ボタンをクリック
    ↓
TaskFormコンポーネントが開く
    ↓
ユーザーがフォームに入力して送信
    ↓
useOptimizedTaskOperations.createTask() が呼ばれる
    ↓
【楽観的UI更新】
1. 仮のタスクを即座にUIに追加
2. バックグラウンドでAPI呼び出し
    ↓
fetch('/api/tasks', { method: 'POST' })
    ↓
app/api/tasks/route.ts
    ↓
認証チェック → プロジェクト所有者チェック
    ↓
TaskDAL.create(taskData)
    ↓
prisma.task.create()
    ↓
データベースに保存
    ↓
実際のタスクデータを返す
    ↓
フロントエンドで仮タスクを実際のタスクで置換
```

### 3. ガントバーのドラッグ操作フロー

```
ユーザーがガントバーをドラッグ
    ↓
gantt-chart.tsx の onMouseDown イベント
    ↓
ドラッグ状態を管理（dragState）
    ↓
マウス移動中はプレビュー表示（楽観的UI更新）
    ↓
マウスを離した時（onMouseUp）
    ↓
useOptimizedTaskUpdate.updateTask() が呼ばれる
    ↓
【デバウンス処理】
連続した更新をまとめて処理
    ↓
fetch('/api/tasks/:id', { method: 'PATCH' })
    ↓
app/api/tasks/[id]/route.ts
    ↓
TaskDAL.update(id, data)
    ↓
prisma.task.update()
    ↓
データベースを更新
    ↓
フロントエンドで状態を同期
```

---

## 主要機能の実装詳細

### 1. 認証機能

#### ミドルウェア（`middleware.ts`）

```typescript
// 公開ルートの定義
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)'
])

// 認証チェック
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect() // 認証が必要
  }
})
```

**動作:**
- 公開ルート以外は認証が必要
- 未認証の場合は自動的にサインインページにリダイレクト

#### API Routesでの認証チェック

```typescript
// lib/auth.ts の使用例
const authResult = await getAuthenticatedUserId()
if (isAuthError(authResult)) {
  return authResult.error // 401 Unauthorized
}
const { userId } = authResult
```

### 2. 楽観的UI更新

**目的**: ユーザー操作に対する即座の視覚的フィードバック

**実装例（タスク作成）:**

```typescript
// 1. 仮のタスクを即座にUIに追加
const tempId = `temp-${Date.now()}`
const optimisticTask = { id: tempId, title: '...', ... }
onLocalTaskAdd(optimisticTask) // 即座に表示

// 2. バックグラウンドでAPI呼び出し
const realTask = await fetch('/api/tasks', { ... })

// 3. 成功時：仮タスクを実際のタスクで置換
onLocalTaskRemove(tempId)
onLocalTaskAdd(realTask)

// 4. 失敗時：仮タスクを削除してロールバック
onLocalTaskRemove(tempId)
```

**メリット:**
- ユーザー体験の向上（即座の反応）
- ネットワーク遅延を感じさせない

### 3. デバウンス処理

**目的**: 連続した更新操作をまとめて処理し、API呼び出し回数を削減

**実装例:**

```typescript
// useDebounce.ts
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      func(...args)
    }, delay)
  }) as T
}

// 使用例
const refetchProjectDebounced = useDebounce(refetchProjectNow, 500)
// 500ms以内に複数回呼ばれても、最後の1回だけ実行される
```

**効果:**
- API呼び出し回数を70-80%削減
- データベース負荷の軽減

### 4. ガントチャートの描画

**主要な処理:**

1. **日付範囲の計算**
   ```typescript
   const startDate = project.startDate
   const endDate = project.endDate || addMonths(startDate, 6)
   const visibleDates = eachDayOfInterval({ start: startDate, end: endDate })
   ```

2. **タスクバーの位置計算**
   ```typescript
   const startOffsetDays = differenceInCalendarDays(taskStart, visibleStart)
   const durationDays = differenceInCalendarDays(taskEnd, taskStart) + 1
   const leftPx = startOffsetDays * DAY_WIDTH_PX
   const widthPx = durationDays * DAY_WIDTH_PX
   ```

3. **ドラッグ操作**
   - `onMouseDown`: ドラッグ開始
   - `onMouseMove`: ドラッグ中（プレビュー表示）
   - `onMouseUp`: ドラッグ終了（API呼び出し）

---

## 認証の仕組み

### Clerk認証の流れ

1. **初期設定**
   - `.env`に環境変数を設定
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

2. **レイアウトでの設定**
   ```typescript
   // app/layout.tsx
   <ClerkProvider publishableKey={...}>
     {children}
   </ClerkProvider>
   ```

3. **ミドルウェアでの保護**
   ```typescript
   // middleware.ts
   if (!isPublicRoute(req)) {
     await auth.protect()
   }
   ```

4. **API Routesでの認証チェック**
   ```typescript
   // lib/auth.ts
   export async function getAuthenticatedUserId() {
     const { userId } = await auth()
     if (!userId) {
       return { error: NextResponse.json(...) }
     }
     return { userId }
   }
   ```

### 認証が必要な理由

- **データの分離**: ユーザーごとにデータを分離
- **セキュリティ**: 他人のプロジェクトにアクセスできないようにする
- **個人情報保護**: ユーザーIDでデータを識別

---

## パフォーマンス最適化

### 1. 楽観的UI更新

- **即座の視覚的フィードバック**: ユーザー操作に即座に反応
- **バックグラウンド処理**: API呼び出しを非同期で実行

### 2. デバウンス処理

- **連続操作のまとめ**: 500ms以内の連続操作を1回にまとめる
- **API呼び出し削減**: 70-80%の呼び出し回数を削減

### 3. メモ化（React.memo, useMemo）

```typescript
// コンポーネントのメモ化
const TaskBar = memo(({ task, ... }) => {
  // 再レンダリングを抑制
})

// 計算結果のメモ化
const taskBarStyle = useMemo(() => {
  // 重い計算処理
  return { left: '...', width: '...' }
}, [task, visibleDates])
```

### 4. 差分マージ

```typescript
// サーバーから取得したデータと現在のデータをマージ
const mergeTasksById = (current, incoming) => {
  // 変化がない場合は参照を保つ（再レンダリング抑制）
  return incoming.map(next => {
    const prev = currentMap.get(next.id)
    if (same) return prev // 参照を保つ
    return next
  })
}
```

---

## 学習のポイント

### 1. Next.js App Routerの理解

- **Server Components vs Client Components**
  - デフォルトはServer Component
  - インタラクティブな機能はClient Component

- **API Routes**
  - `app/api/`ディレクトリに配置
  - HTTPメソッド（GET, POST, PATCH, DELETE）に対応

### 2. React Hooksの活用

- **useState**: コンポーネントの状態管理
- **useEffect**: 副作用処理（データ取得など）
- **useCallback**: 関数のメモ化
- **useMemo**: 計算結果のメモ化

### 3. TypeScriptの型定義

- **インターフェース**: オブジェクトの構造を定義
- **型安全性**: コンパイル時にエラーを検出

### 4. Prisma ORM

- **スキーマ定義**: `schema.prisma`でデータモデルを定義
- **クエリビルダー**: 型安全なデータベース操作

### 5. アーキテクチャパターン

- **DAL（Data Access Layer）**: データベース操作の抽象化
- **楽観的UI更新**: ユーザー体験の向上
- **デバウンス**: パフォーマンス最適化

---

## よくある質問（FAQ）

### Q1: Server ComponentとClient Componentの違いは？

**A:** 
- **Server Component**: サーバーサイドでレンダリング、データ取得に最適
- **Client Component**: ブラウザで実行、インタラクティブな機能に必要

### Q2: なぜDAL層が必要なのか？

**A:**
- ビジネスロジックとデータベース操作を分離
- 複数のAPI Routesから同じロジックを再利用
- テストしやすくなる

### Q3: 楽観的UI更新とは？

**A:**
- ユーザー操作に対して即座にUIを更新
- バックグラウンドでAPI呼び出しを実行
- 成功時は実際のデータで置換、失敗時はロールバック

### Q4: デバウンス処理の目的は？

**A:**
- 連続した操作をまとめて処理
- API呼び出し回数を削減
- データベース負荷の軽減

---

## 次のステップ

1. **コードを読む**: 各ファイルを実際に読んで理解を深める
2. **デバッガーを使う**: ブレークポイントを設定して動作を確認
3. **小さな変更を加える**: 機能を追加・修正して理解を深める
4. **ログを確認**: `console.log`でデータフローを追跡

---

## 参考リソース

- [Next.js 公式ドキュメント](https://nextjs.org/docs)
- [React 公式ドキュメント](https://react.dev)
- [Prisma 公式ドキュメント](https://www.prisma.io/docs)
- [Clerk 公式ドキュメント](https://clerk.com/docs)
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/docs)

---

**作成日**: 2025年1月27日  
**バージョン**: 1.0  
**対象**: ジュニアエンジニア向け








