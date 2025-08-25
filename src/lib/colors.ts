/**
 * 担当者色管理システム
 * 淡い色の5色パレットから色を自動選択
 */

// 5色の淡いカラーパレット（Tailwind CSS）
export const COLOR_PALETTE = [
  {
    name: 'ライトブルー',
    tailwind: 'bg-blue-300',
    hex: '93C5FD', // #93C5FD
    rgb: { r: 147, g: 197, b: 253 }
  },
  {
    name: 'ライトグリーン', 
    tailwind: 'bg-green-300',
    hex: '86EFAC', // #86EFAC
    rgb: { r: 134, g: 239, b: 172 }
  },
  {
    name: 'ライトパープル',
    tailwind: 'bg-purple-300', 
    hex: 'C4B5FD', // #C4B5FD
    rgb: { r: 196, g: 181, b: 253 }
  },
  {
    name: 'ライトピンク',
    tailwind: 'bg-pink-300',
    hex: 'F9A8D4', // #F9A8D4
    rgb: { r: 249, g: 168, b: 212 }
  },
  {
    name: 'ライトオレンジ',
    tailwind: 'bg-orange-300',
    hex: 'FDBA74', // #FDBA74
    rgb: { r: 253, g: 186, b: 116 }
  }
] as const

// 完了タスクの色（固定）
export const COMPLETED_COLOR = {
  name: '完了済み（グレー）',
  tailwind: 'bg-gray-400',
  hex: '9CA3AF', // #9CA3AF
  rgb: { r: 156, g: 163, b: 175 }
} as const

/**
 * 担当者名から色を決定する関数
 * 担当者名のハッシュ値を使って5色から一貫した色を選択
 */
export function getAssigneeColor(assignee: string, isCompleted: boolean = false): typeof COLOR_PALETTE[number] | typeof COMPLETED_COLOR {
  if (isCompleted) {
    return COMPLETED_COLOR
  }
  
  // 担当者名から簡単なハッシュ値を計算
  let hash = 0
  for (let i = 0; i < assignee.length; i++) {
    const char = assignee.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32bit整数に変換
  }
  
  // ハッシュ値を使って5色から選択
  const colorIndex = Math.abs(hash) % COLOR_PALETTE.length
  return COLOR_PALETTE[colorIndex]
}

/**
 * 指定されたカラーインデックスから色を取得
 */
export function getColorByIndex(colorIndex: number): typeof COLOR_PALETTE[number] {
  const index = Math.max(0, Math.min(colorIndex, COLOR_PALETTE.length - 1))
  return COLOR_PALETTE[index]
}

/**
 * プロジェクト固有の色設定を考慮した担当者色取得
 */
export function getAssigneeColorWithSettings(
  assignee: string, 
  isCompleted: boolean = false,
  customColorSettings?: Record<string, number>
): typeof COLOR_PALETTE[number] | typeof COMPLETED_COLOR {
  if (isCompleted) {
    return COMPLETED_COLOR
  }
  
  // カスタム設定があればそれを使用
  if (customColorSettings && customColorSettings[assignee] !== undefined) {
    return getColorByIndex(customColorSettings[assignee])
  }
  
  // なければデフォルトのハッシュベース選択
  return getAssigneeColor(assignee, false)
}

/**
 * Tailwind CSSクラス名を取得
 */
export function getAssigneeColorClass(assignee: string, isCompleted: boolean = false): string {
  const color = getAssigneeColor(assignee, isCompleted)
  return color.tailwind
}

/**
 * Excel用のHEX色コードを取得
 */
export function getAssigneeColorHex(assignee: string, isCompleted: boolean = false): string {
  const color = getAssigneeColor(assignee, isCompleted)
  return color.hex
}

/**
 * プロジェクト内で使用されている色の一覧を取得
 */
export function getProjectColorMapping(assignees: string[]): Record<string, typeof COLOR_PALETTE[number] | typeof COMPLETED_COLOR> {
  const mapping: Record<string, typeof COLOR_PALETTE[number] | typeof COMPLETED_COLOR> = {}
  
  for (const assignee of assignees) {
    mapping[assignee] = getAssigneeColor(assignee, false) // 担当者リストでは完了状態はfalse
  }
  
  return mapping
}
