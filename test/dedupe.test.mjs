import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dedupeFeed, mergeFeeds, verificationScore } from '../src/feed/dedupe.js'
import { validFeed, validItem } from './fixtures.mjs'

test('相同 id 保留两边修订，并在字段变化时追加合并说明', () => {
  const existing = validFeed([
    validItem({
      revisions: [{ at: '2026-11-10T08:00:00+08:00', change: '初版' }],
    }),
  ])
  const incoming = validFeed([
    validItem({
      collected_at: '2026-11-10T09:00:00+08:00',
      summary_zh: '更新后的摘要',
      revisions: [{ at: '2026-11-10T09:00:00+08:00', change: '补充摘要' }],
    }),
  ])
  const { feed } = mergeFeeds(existing, incoming)
  assert.equal(feed.items.length, 1)
  assert.equal(feed.items[0].summary_zh, '更新后的摘要')
  assert.deepEqual(
    feed.items[0].revisions.map((revision) => revision.change),
    ['初版', '补充摘要', '合并更新（采集时间 2026-11-10T09:00:00+08:00）'],
  )
  assert.equal(existing.items[0].summary_zh.includes('更新后'), false)
})

test('相同 event_key 的不同 id 采用完整度更高的字段', () => {
  const low = validItem({
    id: '100',
    published_at: null,
    sources: [{ url: 'https://example.com/a', type: 'other' }],
    title_zh: '较短记录',
    revisions: [{ at: '2026-11-10T08:00:00+08:00', change: '低分初版' }],
  })
  delete low.verification_note
  const high = validItem({
    id: '200',
    title_zh: '更完整的标题',
    body_zh: '官网确认的正文。',
    collected_at: '2026-11-10T07:00:00+08:00',
    sources: [
      { url: 'https://example.com/a', type: 'other' },
      { url: 'https://example.com/b', type: 'vendor_blog' },
    ],
    revisions: [{ at: '2026-11-10T07:00:00+08:00', change: '高分初版' }],
  })
  assert.ok(verificationScore(high) > verificationScore(low))
  const { feed } = mergeFeeds(validFeed([low]), validFeed([high]))
  assert.equal(feed.items.length, 1)
  assert.equal(feed.items[0].id, '200')
  assert.equal(feed.items[0].title_zh, '更完整的标题')
  assert.deepEqual(
    feed.items[0].sources.map((source) => source.url),
    ['https://example.com/a', 'https://example.com/b'],
  )
  assert.deepEqual(
    feed.items[0].revisions.map((revision) => revision.change),
    ['高分初版', '合并更新（采集时间 2026-11-10T07:00:00+08:00）', '低分初版'],
  )
})

test('完整度相同则采用更新的采集时间，仓库独有条目保留', () => {
  const kept = validItem({ id: 'keep', event_key: 'kept-event', title_zh: '只在仓库里' })
  const older = validItem({
    id: '1',
    title_zh: '旧标题',
    collected_at: '2026-11-10T08:00:00+08:00',
  })
  const newer = validItem({
    id: '2',
    title_zh: '新标题',
    collected_at: '2026-11-10T10:00:00+08:00',
    revisions: [{ at: '2026-11-10T10:00:00+08:00', change: '改标题' }],
  })
  const { feed } = mergeFeeds(validFeed([older, kept]), validFeed([newer]))
  assert.equal(feed.items.length, 2)
  assert.equal(feed.items[0].id, '2')
  assert.equal(feed.items[0].title_zh, '新标题')
  assert.equal(feed.items[1].title_zh, '只在仓库里')
})

test('字段没有变化时不追加合并说明', () => {
  const feed = validFeed([validItem()])
  const { feed: merged } = mergeFeeds(feed, validFeed([validItem()]))
  assert.equal(merged.items[0].revisions.length, 1)
  assert.equal(merged.items[0].revisions.some((revision) => revision.change.startsWith('合并更新')), false)
})

test('单份文件内的重复 id 被折成一条', () => {
  const { feed, mergedCount } = dedupeFeed(
    validFeed([
      validItem({ revisions: [{ at: '2026-11-10T08:00:00+08:00', change: '甲' }] }),
      validItem({
        summary_zh: '第二条摘要',
        collected_at: '2026-11-10T09:00:00+08:00',
        revisions: [{ at: '2026-11-10T09:00:00+08:00', change: '乙' }],
      }),
    ]),
  )
  assert.equal(mergedCount, 1)
  assert.equal(feed.items.length, 1)
  assert.equal(feed.items[0].summary_zh, '第二条摘要')
})
