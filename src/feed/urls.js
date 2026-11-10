export function safeHttpsUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2000) return null
  if (/[\u0000-\u001F\u007F\s]/.test(value)) return null
  let url
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (!url.hostname.includes('.')) return null
  return url.href
}
