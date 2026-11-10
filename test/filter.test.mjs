import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterItems } from '../src/feed/filter.js'
import { validItem } from './fixtures.mjs'

const items = [
  validItem({
    id: 'openai',
    vendor: 'OpenAI',
    title_zh: 'OpenAI 发布 Control Room',
    summary_zh: '安全停机',
    published_at: '2026-11-10T06:01:00+08:00',
    importance: 3,
  }),
  validItem({
    id: 'anthropic',
    event_key: 'anthropic-launch',
    vendor: 'Anthropic',
    title_zh: 'Anthropic 发布 Claude Fable 5.2',
    summary_zh: 'API 定价下调',
    body_zh: '开发者标识 claude-fable-5-2',
    published_at: '2026-11-10T02:57:59+08:00',
    importance: 5,
    sources: [{ url: 'https://www.anthropic.com/claude-fable-and-mythos-5-2', type: 'vendor_blog' }],
  }),
  validItem({
    id: 'unknown-time',
    event_key: 'unknown-time',
    vendor: 'Mistral',
    title_zh: '发布时间未知的平台更新',
    summary_zh: '仅有采集时间',
    published_at: null,
    importance: 4,
    sources: [{ url: 'https://mistral.ai/news/build-with-studio/', type: 'vendor_blog' }],
  }),
]

test('空条件返回全部，搜索匹配标题且忽略英文大小写', () => {
  assert.equal(filterItems(items, {}).length, 3)
  assert.deepEqual(filterItems(items, { query: 'control' }).map((item) => item.id), ['openai'])
  assert.deepEqual(filterItems(items, { query: 'CLAUDE-FABLE' }).map((item) => item.id), ['anthropic'])
})

test('厂商、日期和最低星级同时收紧', () => {
  const matched = filterItems(items, {
    query: '发布',
    vendor: 'Anthropic',
    date: '2026-11-10',
    minStars: 5,
  })
  assert.deepEqual(matched.map((item) => item.id), ['anthropic'])
})

test('未知发布时间不进入具体日期，只进入未知', () => {
  assert.deepEqual(filterItems(items, { date: '2026-11-10' }).map((item) => item.id), ['openai', 'anthropic'])
  assert.deepEqual(filterItems(items, { date: 'unknown' }).map((item) => item.id), ['unknown-time'])
})
