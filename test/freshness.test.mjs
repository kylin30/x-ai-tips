import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assessFreshness } from '../src/feed/freshness.js'

const generated = '2026-11-10T08:35:56+08:00'

test('30 分钟内为最新，超过则过期，明显超前为错误', () => {
  const base = Date.parse(generated)
  assert.equal(assessFreshness(generated, new Date(base + 29 * 60 * 1000)).state, 'fresh')
  assert.equal(assessFreshness(generated, new Date(base + 31 * 60 * 1000)).state, 'stale')
  assert.equal(assessFreshness(generated, new Date(base - 6 * 60 * 1000)).state, 'error')
  assert.match(assessFreshness('not-a-time', new Date(base)).label, /无法读取/)
})
