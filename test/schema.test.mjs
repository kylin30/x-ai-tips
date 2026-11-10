import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scanPublicText, validateFeed } from '../src/feed/schema.js'
import { validFeed, validItem } from './fixtures.mjs'

test('接受带 null 发布时间的合法 feed', () => {
  const result = validateFeed(validFeed([validItem({ published_at: null })]))
  assert.equal(result.ok, true)
  assert.equal(result.feed.items[0].published_at, null)
})

test('缺少发布时间字段时失败', () => {
  const item = validItem()
  delete item.published_at
  const result = validateFeed(validFeed([item]))
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /published_at/)
})

test('星级越界、非法时间和错误版本失败', () => {
  const badStar = validateFeed(validFeed([validItem({ importance: 6 })]))
  const badTime = validateFeed(validFeed([validItem({ collected_at: '2026-02-31T00:00:00+08:00' })]))
  const badVersion = validateFeed(validFeed([validItem()], { schema_version: '2.0.0' }))
  assert.equal(badStar.ok, false)
  assert.equal(badTime.ok, false)
  assert.equal(badVersion.ok, false)
})

test('同一文件里的重复 id 留给去重，不在结构层失败', () => {
  const item = validItem()
  const result = validateFeed(validFeed([item, { ...item }]))
  assert.equal(result.ok, true)
  assert.equal(result.feed.items.length, 2)
})

test('不安全的来源 URL 让整份 feed 失败', () => {
  const result = validateFeed(
    validFeed([
      validItem({
        sources: [{ url: 'javascript:alert(1)', type: 'x_post' }],
      }),
    ]),
  )
  assert.equal(result.ok, false)
  assert.match(result.errors.join('\n'), /sources/)
})

test('公开文本扫描拒绝内部路径和密钥片段', () => {
  assert.deepEqual(scanPublicText('{"title_zh":"公开标题"}'), [])
  const hits = scanPublicText('see /home/ubuntu and raw-x and PRIVATE KEY')
  assert.equal(hits.length, 3)
})
