import { assessFreshness } from './feed/freshness.js'
import { filterItems } from './feed/filter.js'
import { renderReader } from './feed/render.js'
import { formatShanghai, shanghaiDate, sortForReading } from './feed/time.js'
import { loadFeed } from './load-feed.js'
import { loadReadIds, saveReadIds } from './read-state.js'
import './styles.css'

const app = document.querySelector('#app')
const state = {
  status: 'loading',
  errorMessage: '',
  feed: null,
  filters: { query: '', vendor: 'all', date: 'all', minStars: 1 },
  selectedId: '',
  readIds: loadReadIds(window.localStorage),
}

function selectedFromHash() {
  const match = /^#\/item\/([^/?#]+)$/.exec(window.location.hash)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch (error) {
    console.error('无法解析新闻地址', error)
    return ''
  }
}

function draw() {
  const active = document.activeElement
  const filterKey = active?.dataset?.filter || ''
  const caret = filterKey === 'query' ? active.selectionStart : null
  renderReader(app, viewModel())
  if (!filterKey) return
  const next = app.querySelector(`[data-filter="${filterKey}"]`)
  if (!next) return
  next.focus()
  if (caret !== null && next.setSelectionRange) next.setSelectionRange(caret, caret)
}

function onFilter(next) {
  state.filters = next
  draw()
}

function onSelect(id) {
  const hash = id ? `#/item/${encodeURIComponent(id)}` : '#/'
  if (window.location.hash === hash) {
    state.selectedId = id
    draw()
    return
  }
  window.location.hash = hash
}

function onToggleRead(id) {
  if (state.readIds.has(id)) state.readIds.delete(id)
  else state.readIds.add(id)
  state.readIds = new Set(state.readIds)
  saveReadIds(window.localStorage, state.readIds)
  draw()
}

function viewModel() {
  const base = {
    filters: state.filters,
    vendors: [],
    dates: [],
    items: [],
    selectedId: state.selectedId,
    readIds: state.readIds,
    onFilter,
    onSelect,
    onToggleRead,
  }
  if (state.status === 'loading') {
    return {
      ...base,
      status: 'loading',
      errorMessage: '',
      freshness: { state: 'fresh', label: '正在读取这份新闻' },
      generatedLabel: '未知',
    }
  }
  if (state.status === 'error' || !state.feed) {
    return {
      ...base,
      status: 'error',
      errorMessage: state.errorMessage || '无法加载新闻数据',
      freshness: { state: 'error', label: '无法确认更新时间' },
      generatedLabel: '未知',
    }
  }
  const sorted = sortForReading(state.feed.items)
  const freshness = assessFreshness(state.feed.generated_at, new Date())
  const generatedLabel = formatShanghai(state.feed.generated_at)
  if (freshness.state === 'error') {
    return {
      ...base,
      status: 'error',
      errorMessage: freshness.label,
      freshness,
      generatedLabel,
    }
  }
  return {
    ...base,
    status: sorted.length === 0 ? 'empty' : 'ready',
    errorMessage: '',
    freshness,
    generatedLabel,
    items: filterItems(sorted, state.filters),
    vendors: [...new Set(sorted.map((item) => item.vendor))].sort((left, right) => left.localeCompare(right, 'zh')),
    dates: [...new Set(sorted.filter((item) => item.published_at).map((item) => shanghaiDate(item.published_at)))].sort().reverse(),
  }
}

window.addEventListener('hashchange', () => {
  state.selectedId = selectedFromHash()
  draw()
})

state.selectedId = selectedFromHash()
draw()

async function start() {
  const loaded = await loadFeed(`${import.meta.env.BASE_URL}data/reader-feed.json`)
  if (!loaded.ok) {
    state.status = 'error'
    state.errorMessage = loaded.reason === 'schema' ? '新闻数据未通过校验' : '无法加载新闻数据'
    state.feed = null
  } else {
    state.status = 'ready'
    state.feed = loaded.feed
  }
  draw()
}

start()
