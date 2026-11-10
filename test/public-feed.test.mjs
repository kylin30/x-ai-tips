import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { validateFeed } from '../src/feed/schema.js'

const expected = [
  ['2119913172039868579', 'OpenAI 发布 Control Room 研究侧安全停机系统'],
  ['2119867114450268322', 'Anthropic 发布 Claude Fable 5.2 与 Claude Mythos 5.2'],
  ['2119853591703998787', 'Meta 发布 Muse Ember 并公布 API 定价与云可用性'],
  ['2119813353363370134', 'Mistral Studio 扩展 Apps、Managed Agents 与 Workflows'],
  ['2119765512238637559', '百度发布 ERNIE Evolve 自动研究系统'],
]

test('已提交的公开 feed 只包含随附的 5 条已核验新闻', () => {
  const raw = readFileSync(new URL('../data/reader-feed.json', import.meta.url), 'utf8')
  const parsed = JSON.parse(raw)
  const result = validateFeed(parsed)
  assert.equal(result.ok, true, result.errors?.join('\n'))
  assert.deepEqual(
    parsed.items.map((item) => [item.id, item.title_zh]),
    expected,
  )
})
