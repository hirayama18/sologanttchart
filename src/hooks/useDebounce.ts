import { useCallback, useRef } from 'react'

/**
 * デバウンシング機能を提供するカスタムフック
 * 連続する呼び出しを遅延させ、最後の呼び出しのみを実行する
 * 
 * @param callback 実行する関数
 * @param delay 遅延時間（ミリ秒）
 * @returns デバウンスされた関数
 */
export function useDebounce<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      // 既存のタイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // 新しいタイマーを設定
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

/**
 * 複数の操作をバッチ処理するためのカスタムフック
 * 指定時間内の複数の操作をまとめて実行する
 * 
 * @param batchProcessor バッチ処理を実行する関数
 * @param delay バッチ処理の遅延時間（ミリ秒）
 * @returns バッチにアイテムを追加する関数
 */
export function useBatch<T>(
  batchProcessor: (items: T[]) => void,
  delay: number = 300
): (item: T) => void {
  const batchRef = useRef<T[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (item: T) => {
      // バッチにアイテムを追加
      batchRef.current.push(item)

      // 既存のタイマーをクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // 新しいタイマーを設定
      timeoutRef.current = setTimeout(() => {
        if (batchRef.current.length > 0) {
          // バッチ処理を実行
          batchProcessor([...batchRef.current])
          // バッチをクリア
          batchRef.current = []
        }
      }, delay)
    },
    [batchProcessor, delay]
  )
}
