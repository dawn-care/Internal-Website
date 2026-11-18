import { useEffect, useState, type RefObject } from 'react'
import type { BarTone, MetricKey } from '../../../lib/prMetrics'

/** Bar fill per tone: semantic status tokens, readable as marks in both themes. */
export const TONE_FILL: Record<BarTone, string> = {
  good: 'fill-status-green-text',
  warn: 'fill-status-yellow-text',
  bad: 'fill-status-red-text',
}

/** The element's content width, tracked with ResizeObserver (for pixel-sized SVG text). */
export function useWidth(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, Math.round(entry.contentRect.width)))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** Where each tile links: its metric's card on the page. */
export const PR_METRIC_ANCHORS: Record<MetricKey, string> = {
  size: 'pr-size',
  speed: 'pr-speed',
  balance: 'pr-balance',
  coverage: 'pr-coverage',
  breadth: 'pr-breadth',
}
