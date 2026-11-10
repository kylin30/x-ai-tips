import { dedupeFeed } from './feed/dedupe.js'
import { validateFeed } from './feed/schema.js'

export async function loadFeed(url, fetchImpl = globalThis.fetch) {
  try {
    const response = await fetchImpl(url)
    if (!response?.ok) {
      return { ok: false, reason: 'http', status: response?.status ?? 0 }
    }
    let data
    try {
      data = await response.json()
    } catch (error) {
      console.error('新闻数据不是合法 JSON', error)
      return { ok: false, reason: 'json' }
    }
    const validated = validateFeed(data)
    if (!validated.ok) return { ok: false, reason: 'schema', errors: validated.errors }
    return { ok: true, feed: dedupeFeed(validated.feed).feed }
  } catch (error) {
    console.error('新闻数据加载失败', error)
    return { ok: false, reason: 'network' }
  }
}
