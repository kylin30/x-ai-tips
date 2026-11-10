import { isIsoWithOffset } from './schema.js'

export const STALE_AFTER_MS = 30 * 60 * 1000
export const FUTURE_SKEW_MS = 5 * 60 * 1000

export function assessFreshness(generatedAt, now) {
  const current = now instanceof Date ? now.getTime() : Date.parse(now)
  if (!isIsoWithOffset(generatedAt) || Number.isNaN(current)) {
    return { state: 'error', label: '无法读取最近更新时间' }
  }
  const age = current - Date.parse(generatedAt)
  if (age < -FUTURE_SKEW_MS) {
    return { state: 'error', label: '更新时间超前，无法确认这份数据' }
  }
  if (age > STALE_AFTER_MS) {
    return { state: 'stale', label: '数据可能过期' }
  }
  return { state: 'fresh', label: '数据在更新窗口内' }
}
