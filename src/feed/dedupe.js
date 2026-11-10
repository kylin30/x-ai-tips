export function verificationScore(item) {
  let score = 0
  if (typeof item.verification_note === 'string' && item.verification_note.trim()) score += 2
  if (typeof item.body_zh === 'string' && item.body_zh.trim()) score += 1
  if (item.published_at) score += 1
  score += Array.isArray(item.sources) ? item.sources.length : 0
  return score
}

function visibleSnapshot(item) {
  return JSON.stringify({
    id: item.id,
    event_key: item.event_key,
    vendor: item.vendor,
    title_zh: item.title_zh,
    summary_zh: item.summary_zh,
    body_zh: item.body_zh ?? null,
    importance: item.importance,
    importance_reason_zh: item.importance_reason_zh,
    status_release: item.status_release,
    published_at: item.published_at ?? null,
    collected_at: item.collected_at,
    verification_note: item.verification_note ?? null,
    sources: (item.sources || []).map((source) => [source.url, source.type]),
  })
}

function revisionKey(revision) {
  return JSON.stringify([revision.at, revision.change, revision.importance ?? null, revision.summary_zh ?? null])
}

function unionRevisions(groups) {
  const seen = new Map()
  for (const revision of groups.flat()) {
    const key = revisionKey(revision)
    if (!seen.has(key)) seen.set(key, { ...revision })
  }
  return [...seen.values()].sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
}

function chooseWinner(current, incoming) {
  const score = verificationScore(incoming) - verificationScore(current)
  if (score > 0) return incoming
  if (score < 0) return current
  if (Date.parse(incoming.collected_at) > Date.parse(current.collected_at)) return incoming
  return current
}

function mergePair(current, incoming) {
  const winner = chooseWinner(current, incoming)
  const merged = structuredClone(winner)
  const seen = new Set()
  merged.sources = []
  for (const source of [...(current.sources || []), ...(incoming.sources || [])]) {
    if (seen.has(source.url)) continue
    seen.add(source.url)
    merged.sources.push(structuredClone(source))
  }
  let revisions = unionRevisions([current.revisions || [], incoming.revisions || []])
  if (visibleSnapshot(current) !== visibleSnapshot(merged)) {
    const change = `合并更新（采集时间 ${incoming.collected_at}）`
    const exists = revisions.some((revision) => revision.at === incoming.collected_at && revision.change === change)
    if (!exists) revisions = unionRevisions([revisions, [{ at: incoming.collected_at, change }]])
  }
  if (revisions.length > 0) merged.revisions = revisions
  else delete merged.revisions
  return merged
}

function absorbConflicts(items, start) {
  let mergedCount = 0
  let cursor = start
  for (;;) {
    const current = items[cursor]
    const other = items.findIndex(
      (item, index) => index !== cursor && (item.id === current.id || item.event_key === current.event_key),
    )
    if (other < 0) break
    const keep = Math.min(cursor, other)
    const drop = Math.max(cursor, other)
    items[keep] = mergePair(items[keep], items[drop])
    items.splice(drop, 1)
    cursor = keep
    mergedCount += 1
  }
  return mergedCount
}

export function dedupeFeed(feed) {
  const items = []
  let mergedCount = 0
  for (const raw of feed.items) {
    const item = structuredClone(raw)
    const match = items.findIndex((current) => current.id === item.id || current.event_key === item.event_key)
    if (match < 0) {
      items.push(item)
      continue
    }
    items[match] = mergePair(items[match], item)
    mergedCount += 1 + absorbConflicts(items, match)
  }
  return { feed: { ...feed, items }, mergedCount }
}

export function mergeFeeds(existing, incoming) {
  const base = dedupeFeed(existing)
  const extra = dedupeFeed(incoming)
  const combined = dedupeFeed({
    ...base.feed,
    items: [...base.feed.items, ...extra.feed.items],
  })
  const generatedAt =
    Date.parse(incoming.generated_at) > Date.parse(existing.generated_at)
      ? incoming.generated_at
      : existing.generated_at
  return {
    feed: {
      ...combined.feed,
      schema_version: existing.schema_version,
      generated_at: generatedAt,
    },
    mergedCount: base.mergedCount + extra.mergedCount + combined.mergedCount,
  }
}
