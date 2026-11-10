import assert from 'node:assert/strict'
import { test } from 'node:test'
import { safeHttpsUrl } from '../src/feed/urls.js'

test('只接受没有用户信息的 https 链接', () => {
  assert.equal(safeHttpsUrl('https://openai.com/index/control-room/'), 'https://openai.com/index/control-room/')
  assert.equal(safeHttpsUrl('javascript:alert(1)'), null)
  assert.equal(safeHttpsUrl('data:text/html,hi'), null)
  assert.equal(safeHttpsUrl('https://user:secret@example.com/a'), null)
  assert.equal(safeHttpsUrl('https://user@example.com/a'), null)
  assert.equal(safeHttpsUrl('http://example.com/a'), null)
  assert.equal(safeHttpsUrl('https:///no-host'), null)
  assert.equal(safeHttpsUrl('https://example.com/\u0000'), null)
  assert.equal(safeHttpsUrl(null), null)
})
