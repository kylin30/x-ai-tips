import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { renderReader } from '../src/feed/render.js'
import { loadReadIds, saveReadIds } from '../src/read-state.js'
import { validItem } from './fixtures.mjs'

function mount(overrides = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>')
  const root = dom.window.document.getElementById('app')
  const model = {
    status: 'ready',
    errorMessage: '',
    freshness: { state: 'fresh', label: '数据在更新窗口内' },
    generatedLabel: '2026-11-10 08:35',
    items: [validItem()],
    selectedId: '',
    filters: { query: '', vendor: 'all', date: 'all', minStars: 1 },
    vendors: ['OpenAI'],
    dates: ['2026-11-10'],
    readIds: new Set(),
    onFilter() {},
    onSelect() {},
    onToggleRead() {},
    ...overrides,
  }
  renderReader(root, model)
  return { document: dom.window.document, window: dom.window }
}

test('标题中的脚本只作为文本，不安全链接没有 href', () => {
  const { document } = mount({
    items: [
      validItem({
        title_zh: '<script>alert(1)</script>',
        sources: [{ url: 'javascript:alert(1)', type: 'x_post' }],
      }),
    ],
    selectedId: '2119913172039868579',
  })
  assert.equal(document.querySelector('script'), null)
  assert.match(document.body.textContent, /<script>alert\(1\)<\/script>/)
  assert.equal(document.querySelector('a'), null)
  assert.match(document.body.textContent, /链接未通过安全检查/)
})

test('展示星级、理由、未知发布时间和全部修订', () => {
  const { document } = mount({
    items: [
      validItem({
        published_at: null,
        importance: 4,
        importance_reason_zh: '重要平台更新',
        revisions: [
          { at: '2026-11-10T08:00:00+08:00', change: '初版' },
          { at: '2026-11-10T09:00:00+08:00', change: '补充来源' },
        ],
      }),
    ],
    selectedId: '2119913172039868579',
  })
  const text = document.body.textContent
  assert.match(text, /★★★★☆/)
  assert.match(text, /4\/5/)
  assert.match(text, /重要平台更新/)
  assert.match(text, /未知/)
  assert.match(text, /初版/)
  assert.match(text, /补充来源/)
  assert.match(text, /不是任何厂商的官方网站/)
})

test('错误状态不渲染文章，筛选回调带上组合条件', () => {
  const hidden = mount({
    status: 'error',
    errorMessage: '无法加载新闻数据',
    items: [validItem({ title_zh: '不该出现的标题' })],
  })
  assert.equal(hidden.document.querySelector('article'), null)
  assert.match(hidden.document.body.textContent, /无法加载新闻数据/)
  assert.equal(hidden.document.body.textContent.includes('不该出现的标题'), false)

  let received
  const { document, window } = mount({
    items: [validItem({ title_zh: '只剩这一条' })],
    onFilter(next) {
      received = next
    },
  })
  assert.match(document.body.textContent, /只剩这一条/)
  document.querySelector('[data-filter="vendor"]').value = 'OpenAI'
  document.querySelector('[data-filter="vendor"]').dispatchEvent(new window.Event('change', { bubbles: true }))
  document.querySelector('[data-filter="date"]').value = '2026-11-10'
  document.querySelector('[data-filter="date"]').dispatchEvent(new window.Event('change', { bubbles: true }))
  document.querySelector('[data-filter="stars"]').value = '4'
  document.querySelector('[data-filter="stars"]').dispatchEvent(new window.Event('change', { bubbles: true }))
  assert.equal(received.vendor, 'OpenAI')
  assert.equal(received.date, '2026-11-10')
  assert.equal(received.minStars, 4)
})

test('过期提示和安全官网链接同时出现', () => {
  const { document } = mount({
    freshness: { state: 'stale', label: '数据可能过期' },
    selectedId: '2119913172039868579',
  })
  const link = document.querySelector('a')
  assert.match(document.body.textContent, /数据可能过期/)
  assert.match(document.body.textContent, /2026-11-10 08:35/)
  const links = [...document.querySelectorAll('a')]
  assert.equal(links[0].getAttribute('href'), 'https://x.com/OpenAI/status/2119913172039868579')
  assert.equal(links[0].getAttribute('rel'), 'noopener noreferrer')
  assert.match(links[0].textContent, /X 原文/)
  assert.equal(links.some((node) => node.getAttribute('href') === 'https://openai.com/index/control-room/'), true)
  assert.match(links.find((node) => node.getAttribute('href') === 'https://openai.com/index/control-room/').textContent, /官网/)
})

test('加载中不把空列表说成没有新闻', () => {
  const { document } = mount({ status: 'loading', items: [] })
  assert.match(document.body.textContent, /正在加载新闻/)
  assert.equal(document.body.textContent.includes('没有符合条件的新闻'), false)
  assert.equal(document.querySelector('article'), null)
})

test('localStorage 失败时已读集合为空并记录错误', () => {
  const errors = []
  const original = console.error
  console.error = (...args) => {
    errors.push(args.join(' '))
  }
  const storage = {
    getItem() {
      throw new Error('denied')
    },
    setItem() {
      throw new Error('denied')
    },
  }
  try {
    assert.equal(loadReadIds(storage).size, 0)
    saveReadIds(storage, new Set(['2119913172039868579']))
    assert.equal(errors.length, 2)
  } finally {
    console.error = original
  }
})
