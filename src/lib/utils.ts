import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { holidays } from "@holiday-jp/holiday_jp"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 指定された日付が日本の祝日かどうかを判定します
 * @param date 判定する日付
 * @returns 祝日の場合、祝日名を返します。祝日でない場合はnullを返します
 */
export function isJapaneseHoliday(date: Date): string | null {
  const dateStr = format(date, "yyyy-MM-dd")
  const holiday = (holidays as Record<string, { name: string }>)[dateStr]
  return holiday?.name || null
}
