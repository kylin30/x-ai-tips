import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadFeed } from '../src/load-feed.js'
import { validFeed, validItem } from './fixtures.mjs'

function jsonResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  }
}

test('HTTP 失败、非法 JSON 和结构错误都不返回条目', async () => {
  const http = await loadFeed('https://example.test/feed.json', async () => jsonResponse(null, false, 404))
  const broken = await loadFeed('https://example.test/feed.json', async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token')
    },
  }))
  const invalid = await loadFeed('https://example.test/feed.json', async () => jsonResponse({ schema_version: '1.0.0' }))
  assert.equal(http.ok, false)
  assert.equal(broken.ok, false)
  assert.equal(invalid.ok, false)
  assert.equal(http.items, undefined)
  assert.equal(invalid.feed, undefined)
})

test('成功加载后按 id 去重', async () => {
  const feed = validFeed([
    validItem({ revisions: [{ at: '2026-11-10T08:00:00+08:00', change: '甲' }] }),
    validItem({
      summary_zh: '合并后的摘要',
      collected_at: '2026-11-10T09:00:00+08:00',
      revisions: [{ at: '2026-11-10T09:00:00+08:00', change: '乙' }],
    }),
  ])
  const result = await loadFeed('https://example.test/feed.json', async () => jsonResponse(feed))
  assert.equal(result.ok, true)
  assert.equal(result.feed.items.length, 1)
  assert.equal(result.feed.items[0].summary_zh, '合并后的摘要')
})
