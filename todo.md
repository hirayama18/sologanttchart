# TODO管理ルール

## 基本ルール
- 各機能は `- [ ]` の形式で記述し、完了したら `- [x]` に変更
- 優先度は 🔴高、🟡中、🟢低 で表示
- 各機能には以下の情報を含める：
  - 機能名
  - 優先度
  - 簡潔な説明
  - 関連する技術スタック

## 機能実装リスト

### 認証関連
- [x] 🔴 ユーザー認証機能の実装
  - Clerkを使用した認証システムの構築
  - ログイン/ログアウト機能
  - ユーザープロフィール管理

### ガントチャート機能
- [x] 🔴 ガントチャートの基本機能
  - タスクの作成/編集/削除
  - ドラッグ&ドロップによる日付変更
  - 依存関係の設定

### UI/UX
- [ ] 🟡 レスポンシブデザインの実装
  - モバイル対応
  - タブレット対応
  - デスクトップ対応

### データ管理
- [x] 🟡 データの永続化
  - Prismaを使用したデータベース設計
  - APIエンドポイントの実装
  - データのCRUD操作

### 課金（Stripe）
- [~] 🟡 Stripe買い切り導入（Checkout + Webhook + Billing Portal）
  - 依存追加: `stripe`
  - DB: 課金状態テーブル追加（ユーザーID / customerId / paymentIntentId / status / purchasedAt）
  - API: Checkoutセッション作成（Promotion Code対応）、Webhook署名検証、Billing Portal（購入情報確認）
  - 注意: WebhookはClerk認証の対象外（public route）
- [x] 🟡 「特定商取引法に基づく表記」（Stripe commerce disclosure）ページの作成
  - 対象: `src/app/tokushoho/page.tsx`, `src/app/commerce-disclosure/page.tsx`, `src/middleware.ts`
  - 内容: `/tokushoho` を追加し、`/commerce-disclosure` は `/tokushoho` にリダイレクト。いずれも未ログインで閲覧可能に設定
  - 追記: 「販売価格」の説明に `/pricing` へのリンクを追加
  - 追記: 推奨環境（Chrome動作確認済み）を記載
  - 追記: LPフッターと `/pricing` から `/tokushoho` へ遷移できる導線を追加
  - 追記: `/pricing` を未ログイン閲覧できる公開ルートに変更
  - 追記: 未ログインで購入操作をした場合はサインインへ誘導（戻り先: `/pricing`）
- [~] 🟢 ログインユーザーのプラン表示（Free / Pro）
  - 対象: `src/components/layouts/conditional-header.tsx`, `src/app/api/billing/status/route.ts`
  - 内容: ヘッダーに現在プランを表示し、購入済みかどうかを画面上で判別できるようにする
- [x] 🟢 プロジェクト一覧からpricingへ遷移できる導線 + 購入日時の可視化
  - 対象: `src/app/projects/page.tsx`
  - 内容: プロジェクト一覧画面に「現在のプラン（Free/Pro）」「購入日時（purchasedAt）」「/pricing へのボタン」を表示して、ユーザーが購入タイミングを確認できるようにする
- [x] 🟢 ヘッダーのPro導線を強調
  - 対象: `src/components/layouts/conditional-header.tsx`
  - 内容: Freeユーザー向け「Proにする」をアウトライン→塗りボタンに変更して視認性を向上
- [~] 🟢 /pricing の購入導線をモダンに改善
  - 対象: `src/app/pricing/pricing-client.tsx`, `src/components/layouts/conditional-header.tsx`
  - 内容: 現在プランの見える化、Proメリットの提示、Freeユーザーに「Proにする」導線を追加
- [~] 🟡 無料プラン制限（タスク5件まで / エクスポートは無料）
  - 対象: `src/app/api/projects/[id]/batch-save/route.ts`, `src/app/api/tasks/route.ts`, `src/app/api/projects/[id]/copy/route.ts`, `src/app/api/tasks/[id]/duplicate/route.ts`
  - 仕様: 無料ユーザーは「プロジェクト内のタスク数が5件を超える新規作成」を403で拒否（削除→作成の同時保存は差分で判定）
  - 例外: エクスポート（`/api/projects/[id]/export`）は無料のまま
- [x] 🔴 セキュリティ: batch-save のIDOR対策（他プロジェクトtaskId混入の防止）
  - 対象: `src/app/api/projects/[id]/batch-save/route.ts`
  - 内容: updated/reordered/deleted の taskId を projectId スコープで一括検証し、更新クエリも projectId 条件付きに変更
  - 期待結果: 他プロジェクト/他ユーザーのタスクIDを混入しても 403 となり改ざんできない
- [x] 🔴 セキュリティ: 500レスポンスで内部エラー詳細（error.message）を返さない
  - 対象: `src/app/api/**/route.ts`（一部）
  - 内容: 500時のレスポンスから `message: (error as Error).message` を削除し、汎用エラーのみ返す（詳細はサーバログのみ）
- [~] 🟢 Pricingページ（最小）と上限到達時の誘導
  - 既存UIの見た目を大きく変えず、`/pricing` を追加してアップグレード導線を提供

### タスク仕様調整
- [x] 🟢 中項目タスクは担当者未設定を許可
  - 対象: `src/components/features/tasks/task-form.tsx`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`
  - 内容: 中項目（親なし / `parentId=null`）の作成時に担当者を自動セットしない。更新APIは空文字で担当者をクリア可能にする。
  - 仕様: 小項目（親あり）は担当者が空の場合に400を返す（運用上の誤入力防止）

### 一括操作
- [x] 🟡 プロジェクト配下タスクの日付を +n 日シフトするAPI
  - 対象: `src/app/api/projects/[id]/shift-tasks/route.ts`, `src/dal/tasks/index.ts`
  - 内容: プロジェクト所有者のみ、`plannedStart`/`plannedEnd` を一括で整数日シフト（deleted=true は除外）
  - 仕様: `POST /api/projects/[id]/shift-tasks` に `{ days: number, includeCompleted?: boolean }`（daysは整数・±3650以内）を送る
  - 注意: `includeCompleted=false` の場合のみ、`isCompleted=true`（完了済み）を除外（デフォルトは完了済みも対象）

### 完了状態管理
- [x] 🔴 完了状態をチェックボックス（boolean）で管理し、完了日を非表示にする
  - 対象: Prismaスキーマ、タスクAPI、ガント/フォームUI、エクスポート
  - 内容: `completedAt` 依存を廃止し `isCompleted:boolean` を正として扱う（UIはチェックボックス）
  - DB: `tasks.isCompleted` を追加し、既存の `completedAt != null` は `isCompleted=true` に移行
  - UI: 完了日入力は削除。エクスポートの「完了日」列は「完了（✓）」列へ変更

## 完了した機能
- [x] 🟢 プロジェクトの初期設定
  - Next.jsプロジェクトの作成
  - 必要なパッケージのインストール
  - 開発環境の構築 
- [x] 🟢 ガントチャートのヘッダー期間がプロジェクトの終了日に追従
  - 対象: `src/components/features/gantt/gantt-chart.tsx`
  - 内容: `endDate` が設定されている場合はそれを表示し、未設定時は開始日から約6ヶ月分にフォールバック
- [x] 🟡 プロジェクトコピー機能の実装
  - 対象: プロジェクト作成フォーム、API、DAL
  - 内容: 既存プロジェクトからタスク、担当者設定、色設定をコピーして新規プロジェクトを作成
  - 機能: コピー元選択UI、トランザクション処理、認証・権限チェック
- [x] 🟡 日本の祝日表示機能の実装
  - 対象: ガントチャートコンポーネント、エクスポート機能
  - 内容: `@holiday-jp/holiday_jp`を使用して日本の祝日を判定し、ガントチャート上で色分け表示
  - 機能: 祝日判定ユーティリティ関数、祝日の背景色表示（ピンク系）、エクスポート時の祝日反映
- [x] 🟡 タスクの2階層化（中項目・小項目）の実装
  - 対象: DBスキーマ、API、ガントチャートUI、タスクフォーム
  - 内容: タスクに親子関係（中項目・小項目）を導入
  - 機能: `parentId`カラム追加、階層表示（インデント）、親タスク選択機能
  - 追加: 中項目の日付（開始・終了）を任意に変更し、バー表示をスキップ
- [x] 🟡 週次エクセルエクスポート対応
  - 対象: `src/app/api/projects/[id]/export/route.ts`
  - 内容: 週単位プロジェクトの場合に1列=1週のヘッダー・バーを出力
  - 仕様: 月曜日始まり、月行の結合、週セルは「d〜」表記、タスクバーは週のセル単位で塗り潰し
- [x] 🟡 ガントチャートの週単位表示の実装
  - 対象: プロジェクト作成フォーム、ガントチャートコンポーネント、API
  - 内容: プロジェクト作成時に日単位/週単位を選択可能にし、ガントチャートのヘッダー・グリッドを切り替え
  - 機能: `timeScale`フィールド対応、週次ヘッダー（年/月/週）、週区切りのグリッド表示
- [x] 🟡 日/週ビュー切替とエクスポート粒度選択
  - 対象: `src/app/gantt/[id]/page.tsx`, `src/components/features/gantt/gantt-chart.tsx`, `src/app/api/projects/[id]/export/route.ts`
  - 内容: プロジェクト表示は常に日単位を初期表示にしつつ、画面上で週表示へ切替可能に変更
  - 機能: ビュー切替セレクト、エクスポート時の単位選択ドロップダウン、APIでの粒度切替処理追加
- [x] 🟢 ビュー切替設定の永続化とエクスポートUI改善
  - 対象: `src/hooks/usePersistentViewScale.ts`, `src/app/gantt/[id]/page.tsx`
  - 内容: プロジェクトごとの表示単位をlocalStorageへ保存し、再訪時も前回と同じビューを自動復元
  - 機能: `usePersistentViewScale`フック、現在ビューでの即時エクスポート/単位別のチェック表示
- [x] 🔴 手動保存方式への変更（ローカルステート一元管理）
  - 対象: `src/hooks/useChangeTracker.ts`, `src/app/gantt/[id]/page.tsx`, `src/components/features/gantt/gantt-chart.tsx`, `src/components/features/tasks/task-form.tsx`
  - 内容: タスクの自動保存を廃止し、手動保存方式に変更。すべての変更をローカルステートで管理し、保存ボタンを押したときのみDBに保存
  - 機能:
    - 変更追跡システム（useChangeTracker）: 新規作成/更新/削除/並び替えを追跡
    - 一括保存API（/api/projects/[id]/batch-save）: トランザクションで一括保存
    - 保存ボタン + 未保存インジケーター: 変更件数表示、保存状態の視覚的フィードバック
    - ページ離脱警告: 未保存の変更がある場合に警告表示（タブ閉じ/リロード: `beforeunload`、ブラウザ戻る/進む: `popstate`）
  - 効果: UIラグの解消、保存競合の防止、ユーザーによる保存タイミングの制御
- [x] 🟡 未保存変更の Undo/Redo（Cmd+Z / Cmd+Y）
  - 対象: `src/hooks/useChangeTracker.ts`, `src/app/gantt/[id]/page.tsx`
  - 内容: 手動保存方式のローカル変更に対し、undo/redo の履歴を保持。キーボード（Cmd+Z/Cmd+Y/Cmd+Shift+Z）とボタンで操作可能にする
  - 注意: テキスト入力中はブラウザ標準のUndo/Redoを優先（入力欄では横取りしない）
- [x] 🟡 ガント画面のヘッダーUI整理（操作群の分割）
  - 対象: `src/app/gantt/[id]/page.tsx`, `src/components/features/gantt/gantt-chart.tsx`, `src/components/features/gantt/color-legend.tsx`
  - 内容: 画面最上部は主要操作（Undo/Redo・保存・新規）に集約し、補助操作（ビュー/エクスポート/シフト/設定/期間編集）はガントヘッダー右側の空きスペースへ移動。色凡例は埋め込み表示にして余白を削減。
  - 注意: 機能は維持し、配置のみを変更
- [x] 🔴 一括保存のトランザクション安定化（Transaction not found 対策）
  - 対象: `src/app/api/projects/[id]/batch-save/route.ts`
  - 内容: interactive transaction の `timeout/maxWait` を延長し、多数更新時にトランザクションが途中で閉じて保存失敗しないように修正