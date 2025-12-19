# コードウォークスルー - 主要ファイルの詳細解説

このドキュメントでは、プロジェクトの主要なファイルを1つずつ詳しく解説します。

## 📚 目次
1. [認証関連](#認証関連)
2. [データベース関連](#データベース関連)
3. [API Routes](#api-routes)
4. [DAL（Data Access Layer）](#daldata-access-layer)
5. [Reactコンポーネント](#reactコンポーネント)
6. [カスタムフック](#カスタムフック)
7. [ユーティリティ](#ユーティリティ)

---

## 認証関連

### `src/middleware.ts`

**役割**: すべてのリクエストに対して認証チェックを実行

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 公開ルートの定義（認証不要）
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // 公開ルート以外は認証が必要
  if (!isPublicRoute(req)) {
    await auth.protect(); // 未認証の場合は自動的にサインインページへリダイレクト
  }
});
```

**重要なポイント:**
- `clerkMiddleware`: Clerkが提供するミドルウェア関数
- `createRouteMatcher`: ルートパターンマッチング用のヘルパー
- `auth.protect()`: 認証が必要な場合に呼び出す

**動作フロー:**
1. リクエストが来る
2. 公開ルートかチェック
3. 公開ルートでなければ `auth.protect()` を実行
4. 未認証の場合は自動的にサインインページへリダイレクト

---

### `src/lib/auth.ts`

**役割**: API Routesで認証チェックを行うヘルパー関数

```typescript
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function getAuthenticatedUserId(): Promise<{ userId: string } | { error: NextResponse }> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return {
        error: NextResponse.json(
          { error: 'Unauthorized: User not authenticated' },
          { status: 401 }
        )
      }
    }
    
    return { userId }
  } catch (error) {
    // エラーハンドリング
    return {
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}

// 型ガード関数
export function isAuthError(result: { userId: string } | { error: NextResponse }): result is { error: NextResponse } {
  return 'error' in result
}
```

**使用例:**
```typescript
// API Route内での使用
const authResult = await getAuthenticatedUserId()
if (isAuthError(authResult)) {
  return authResult.error // 401 Unauthorized を返す
}
const { userId } = authResult
// 以降、userIdを使用してデータベース操作などを行う
```

**重要なポイント:**
- **型安全性**: TypeScriptの型ガードを使用
- **エラーハンドリング**: 認証失敗時の適切な処理
- **再利用性**: すべてのAPI Routesで同じ関数を使用

---

## データベース関連

### `prisma/schema.prisma`

**役割**: データベースのスキーマ定義

```prisma
model Project {
  id                String                  @id @default(cuid())
  title             String
  startDate         DateTime
  endDate           DateTime?
  userId            String
  timeScale         TimeScale               @default(DAY)
  tasks             Task[]
  assigneeColors    AssigneeColor[]
  assigneeOptions   ProjectAssigneeOption[]
  
  @@map("projects")
}

model Task {
  id            String    @id @default(cuid())
  title         String
  assignee      String
  plannedStart  DateTime?
  plannedEnd    DateTime?
  completedAt   DateTime?
  order         Int       @default(0)
  deleted       Boolean   @default(false)
  projectId     String
  parentId      String?
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent        Task?     @relation("TaskHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  subTasks      Task[]    @relation("TaskHierarchy")
  
  @@map("tasks")
}
```

**重要なポイント:**
- **リレーション**: `Project 1:N Task`（1つのプロジェクトに複数のタスク）
- **階層構造**: `Task`は自己参照で親子関係を表現（`parentId`）
- **論理削除**: `deleted`フラグで論理削除を実現
- **カスケード削除**: `onDelete: Cascade`で親が削除されると子も削除

---

### `src/lib/prisma.ts`

**役割**: Prismaクライアントのシングルトンインスタンス

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'], // 開発環境でクエリをログ出力
  })

// 開発環境ではグローバル変数に保存（ホットリロード対策）
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**重要なポイント:**
- **シングルトンパターン**: 1つのPrismaクライアントインスタンスを共有
- **ホットリロード対策**: 開発環境でグローバル変数に保存
- **クエリログ**: 開発環境でSQLクエリをログ出力（デバッグ用）

---

## API Routes

### `src/app/api/projects/route.ts`

**役割**: プロジェクトの一覧取得（GET）と作成（POST）

#### GET `/api/projects`

```typescript
export async function GET() {
  try {
    // 1. 認証チェック
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult
    
    // 2. データ取得
    const { ProjectDAL } = await import('@/dal/projects')
    const projects = await ProjectDAL.getByUserId(userId)
    
    // 3. レスポンス形式に変換
    const response: ProjectResponse[] = projects.map(project => ({
      id: project.id,
      title: project.title,
      startDate: project.startDate.toISOString(),
      // ...
    }))
    
    return NextResponse.json(response)
  } catch (error) {
    // エラーハンドリング
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

#### POST `/api/projects`

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. リクエストボディを取得
    const body: CreateProjectRequest = await request.json()
    
    // 2. 認証チェック
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult
    
    // 3. データ作成
    const { ProjectDAL } = await import('@/dal/projects')
    const project = await ProjectDAL.create({
      title: body.title,
      startDate: new Date(body.startDate),
      userId,
      // ...
    })
    
    // 4. レスポンスを返す
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    // エラーハンドリング
  }
}
```

**重要なポイント:**
- **動的インポート**: `await import('@/dal/projects')`でDALを遅延読み込み
- **型安全性**: TypeScriptの型定義を使用
- **エラーハンドリング**: try-catchでエラーを適切に処理

---

### `src/app/api/tasks/route.ts`

**役割**: タスクの作成（POST）

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const authResult = await getAuthenticatedUserId()
    if (isAuthError(authResult)) {
      return authResult.error
    }
    const { userId } = authResult

    // 2. リクエストボディを取得
    const body: CreateTaskRequest = await request.json()
    
    // 3. プロジェクトの所有者チェック
    const { ProjectDAL } = await import('@/dal/projects')
    const isOwner = await ProjectDAL.isOwner(body.projectId, userId)
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this project' },
        { status: 403 }
      )
    }

    // 4. タスク作成
    const { TaskDAL } = await import('@/dal/tasks')
    const task = await TaskDAL.create({
      title: body.title,
      assignee: body.assignee,
      plannedStart: parseDate(body.plannedStart),
      plannedEnd: parseDate(body.plannedEnd),
      projectId: body.projectId,
      parentId: body.parentId || null,
    })

    // 5. レスポンスを返す
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    // エラーハンドリング
  }
}
```

**重要なポイント:**
- **認可チェック**: プロジェクトの所有者かどうかを確認
- **日付のパース**: 文字列をDateオブジェクトに変換
- **階層構造**: `parentId`で親タスクを指定可能

---

## DAL（Data Access Layer）

### `src/dal/projects/index.ts`

**役割**: プロジェクト関連のデータベース操作を抽象化

```typescript
export class ProjectDAL {
  // ユーザーIDでプロジェクト一覧を取得
  static async getByUserId(userId: string): Promise<Project[]> {
    return await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  // プロジェクトIDでプロジェクトとタスクを取得
  static async getById(id: string): Promise<ProjectWithTasks | null> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          where: { deleted: false },
          orderBy: { order: 'asc' },
        },
      },
    })
    return project as ProjectWithTasks
  }

  // プロジェクト作成
  static async create(data: CreateProjectData): Promise<Project> {
    return await prisma.project.create({
      data,
    })
  }

  // プロジェクト更新
  static async update(id: string, data: UpdateProjectData): Promise<ProjectWithTasks> {
    return await prisma.project.update({
      where: { id },
      data,
      include: {
        tasks: {
          where: { deleted: false },
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  // プロジェクト削除
  static async delete(id: string): Promise<Project> {
    return await prisma.project.delete({
      where: { id },
    })
  }

  // 所有者チェック
  static async isOwner(id: string, userId: string): Promise<boolean> {
    const count = await prisma.project.count({
      where: { id, userId },
    })
    return count > 0
  }
}
```

**重要なポイント:**
- **静的メソッド**: インスタンス化不要で使用可能
- **型安全性**: TypeScriptの型定義を使用
- **再利用性**: 複数のAPI Routesから同じメソッドを使用

---

### `src/dal/tasks/index.ts`

**役割**: タスク関連のデータベース操作を抽象化

```typescript
export class TaskDAL {
  // タスク作成（orderを自動計算）
  static async create(data: CreateTaskData): Promise<Task> {
    // 最大orderを取得
    const maxOrder = await prisma.task.aggregate({
      where: { 
        projectId: data.projectId,
        deleted: false 
      },
      _max: { order: true }
    })
    
    // 新規タスクは必ず一番下に配置
    data.order = (maxOrder._max.order || 0) + 1

    return await prisma.task.create({
      data
    })
  }

  // タスク更新
  static async update(id: string, data: UpdateTaskData): Promise<Task> {
    return await prisma.task.update({
      where: { id },
      data
    })
  }

  // タスク削除（論理削除）
  static async delete(id: string): Promise<Task> {
    return await prisma.task.update({
      where: { id },
      data: { deleted: true }
    })
  }

  // タスクの順序を一括更新
  static async updateOrder(taskUpdates: { id: string; order: number }[]): Promise<void> {
    await prisma.$transaction(
      taskUpdates.map(({ id, order }) =>
        prisma.task.update({
          where: { id },
          data: { order }
        })
      )
    )
  }
}
```

**重要なポイント:**
- **orderの自動計算**: 新規タスクは必ず一番下に配置
- **論理削除**: `deleted`フラグで削除を表現
- **トランザクション**: 複数の更新を一括処理

---

## Reactコンポーネント

### `src/app/gantt/[id]/page.tsx`

**役割**: ガントチャートページのメインコンポーネント

**主要な処理:**

1. **データ取得**
```typescript
const fetchProject = useCallback(async () => {
  const response = await fetch(`/api/projects/${projectId}`, {
    cache: 'no-store', // キャッシュを無効化
  })
  const projectData = await response.json()
  setProject(projectData)
  setTasks(projectData.tasks)
}, [projectId])
```

2. **楽観的UI更新**
```typescript
// タスク更新時の即座のUI更新
const handleTaskUpdate = useCallback((taskId: string, updates: Partial<TaskResponse>) => {
  setTasks(prevTasks => 
    prevTasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    )
  )
}, [])
```

3. **最適化されたタスク操作**
```typescript
const { createTask, editTask, duplicateTask, deleteTask } = useOptimizedTaskOperations({
  onLocalTaskAdd: handleTaskAdd,
  onLocalTaskUpdate: handleTaskUpdate,
  onLocalTaskRemove: handleTaskRemove,
  onBatchRefresh: handleTasksChange
})
```

**重要なポイント:**
- **Client Component**: `'use client'`で明示的に指定
- **カスタムフック**: 複雑なロジックをフックに分離
- **楽観的UI更新**: 即座の視覚的フィードバック

---

### `src/components/features/gantt/gantt-chart.tsx`

**役割**: ガントチャートの描画とインタラクション

**主要な処理:**

1. **日付範囲の計算**
```typescript
const visibleDates = useMemo(() => {
  const start = projectStartDay
  const end = project.endDate || addDays(start, 6 * 30 - 1)
  const dates: Date[] = []
  let current = start
  while (current <= end) {
    dates.push(new Date(current))
    current = addDays(current, 1)
  }
  return dates
}, [projectStartDay, project.endDate])
```

2. **タスクバーの位置計算**
```typescript
const taskBarStyle = useMemo(() => {
  const startOffsetDays = differenceInCalendarDays(taskStart, visibleStart)
  const durationDays = differenceInCalendarDays(taskEnd, taskStart) + 1
  const leftPx = startOffsetDays * DAY_WIDTH_PX
  const widthPx = durationDays * DAY_WIDTH_PX
  return {
    left: `${leftPx}px`,
    width: `${widthPx}px`,
  }
}, [task, visibleDates, DAY_WIDTH_PX])
```

3. **ドラッグ操作**
```typescript
const [dragState, setDragState] = useState<DragState>(null)

const handleMouseDown = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-left' | 'resize-right') => {
  setDragState({
    taskId,
    type,
    startClientX: e.clientX,
    originalStart: task.plannedStart,
    originalEnd: task.plannedEnd,
    previewStart: task.plannedStart,
    previewEnd: task.plannedEnd,
  })
}

const handleMouseMove = (e: MouseEvent) => {
  if (!dragState) return
  
  // マウス移動量を計算
  const deltaX = e.clientX - dragState.startClientX
  const deltaDays = Math.round(deltaX / DAY_WIDTH_PX)
  
  // プレビュー期間を更新
  setDragState(prev => ({
    ...prev!,
    previewStart: addDays(prev!.originalStart, deltaDays),
    previewEnd: addDays(prev!.originalEnd, deltaDays),
  }))
}

const handleMouseUp = () => {
  if (!dragState) return
  
  // API呼び出しでデータベースを更新
  optimizedUpdateTask(dragState.taskId, {
    plannedStart: dragState.previewStart.toISOString(),
    plannedEnd: dragState.previewEnd.toISOString(),
  })
  
  setDragState(null)
}
```

**重要なポイント:**
- **メモ化**: `useMemo`で計算結果をキャッシュ
- **ドラッグ状態管理**: マウスイベントで状態を管理
- **楽観的UI更新**: ドラッグ中はプレビュー表示

---

## カスタムフック

### `src/hooks/useOptimizedTaskOperations.ts`

**役割**: タスク操作（作成・編集・コピー・削除）の最適化

**主要な機能:**

1. **楽観的UI更新**
```typescript
const createTask = useCallback(async (taskData: CreateTaskRequest) => {
  // 1. 仮のタスクを生成
  const tempId = `temp-${Date.now()}`
  const optimisticTask = { id: tempId, ...taskData }
  
  // 2. 即座にUIに追加
  onLocalTaskAdd(optimisticTask)
  
  // 3. バックグラウンドでAPI呼び出し
  const realTask = await fetch('/api/tasks', { method: 'POST', ... })
  
  // 4. 仮タスクを実際のタスクで置換
  onLocalTaskRemove(tempId)
  onLocalTaskAdd(realTask)
}, [onLocalTaskAdd, onLocalTaskRemove])
```

2. **エラーハンドリング**
```typescript
catch (error) {
  // 失敗時：仮タスクを削除してロールバック
  onLocalTaskRemove(tempId)
  alert('タスクの作成に失敗しました。')
  // フォールバック：全データ再取得
  onBatchRefresh?.()
}
```

**重要なポイント:**
- **即座のフィードバック**: ユーザー操作に即座に反応
- **エラーハンドリング**: 失敗時の適切な処理
- **再利用性**: 複数のコンポーネントで使用可能

---

### `src/hooks/useOptimizedTaskUpdate.ts`

**役割**: タスク更新の最適化（デバウンス + バッチ処理）

**主要な機能:**

1. **デバウンス処理**
```typescript
const debouncedUpdate = useDebounce(async (taskId: string, updates: any) => {
  await fetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}, debounceDelay) // 1000ms後に実行
```

2. **バッチ処理**
```typescript
const batchUpdates = useRef<Map<string, any>>(new Map())

const updateTask = (taskId: string, updates: any) => {
  // バッチに追加
  batchUpdates.current.set(taskId, updates)
  
  // 一定時間後に一括送信
  setTimeout(() => {
    const allUpdates = Array.from(batchUpdates.current.entries())
    // 一括でAPI呼び出し
    batchUpdates.current.clear()
  }, batchDelay)
}
```

**重要なポイント:**
- **デバウンス**: 連続操作をまとめて処理
- **バッチ処理**: 複数の更新を一括送信
- **パフォーマンス**: API呼び出し回数を削減

---

## ユーティリティ

### `src/lib/utils.ts`

**役割**: 汎用ユーティリティ関数

```typescript
// 日本の祝日判定
export function isJapaneseHoliday(date: Date): boolean {
  const holiday = holiday_jp.find(date)
  return holiday !== null
}

// 日付のフォーマット
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd', { locale: ja })
}
```

---

## まとめ

このプロジェクトは以下のような構造になっています：

1. **認証**: Clerkで認証・認可を実現
2. **データベース**: Prisma ORMで型安全なデータ操作
3. **API**: Next.js API RoutesでRESTful APIを実装
4. **DAL**: データベース操作を抽象化
5. **UI**: ReactコンポーネントでインタラクティブなUI
6. **最適化**: 楽観的UI更新、デバウンス、バッチ処理

各レイヤーが適切に分離されており、保守性と拡張性が高い設計になっています。

---

**作成日**: 2025年1月27日  
**バージョン**: 1.0








