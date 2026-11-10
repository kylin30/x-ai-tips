import { shanghaiDate } from './time.js'

function haystack(item) {
  return [
    item.title_zh,
    item.summary_zh,
    item.body_zh,
    item.vendor,
    item.status_release,
    item.importance_reason_zh,
    item.verification_note,
    item.id,
    item.event_key,
    ...(item.sources || []).flatMap((source) => [source.url, source.type]),
  ]
    .filter((part) => typeof part === 'string' && part.length > 0)
    .join('\n')
    .toLowerCase()
}

export function filterItems(items, criteria = {}) {
  const query = (criteria.query || '').trim().toLowerCase()
  const vendor = criteria.vendor || 'all'
  const date = criteria.date || 'all'
  const minStars = criteria.minStars ?? 1
  return items.filter((item) => {
    if (query && !haystack(item).includes(query)) return false
    if (vendor !== 'all' && item.vendor !== vendor) return false
    if (date === 'unknown') {
      if (item.published_at) return false
    } else if (date !== 'all' && (!item.published_at || shanghaiDate(item.published_at) !== date)) {
      return false
    }
    return item.importance >= minStars
  })
}
