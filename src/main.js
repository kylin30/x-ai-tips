import catalog from '../data/tips.json'
import './styles.css'

const langLabel = { zh: '中文', en: '英文', other: '其他' }

const app = document.querySelector('#app')

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function copyText(tip) {
  return `${tip.title}\n\n${tip.body}\n\n来源：@${tip.author}\n${tip.sourceUrl}`
}

function matches(tip, query, tag) {
  if (tag && !tip.tags.includes(tag)) return false
  if (!query) return true
  const haystack = [tip.title, tip.summary, tip.body, tip.author, tip.id, tip.quality, ...tip.tags]
    .join('\n')
    .toLowerCase()
  return haystack.includes(query)
}

function render(state) {
  app.replaceChildren()
  const page = el('main', 'page-20261026175950')
  const header = el('header', 'header-20261026175950')
  header.append(
    el('p', 'kicker-20261026175950', 'X · AI'),
    el('h1', 'title-20261026175950', '用法与提示词'),
    el('p', 'lede-20261026175950', '从 X 摘下来的短技巧。搜索标题、正文或作者，点标签筛选，复制时会带上来源。'),
  )

  const tips = Array.isArray(catalog.tips) ? catalog.tips : []
  const tags = [...new Set(tips.flatMap((tip) => tip.tags))]
  const query = state.query.trim().toLowerCase()
  const visible = tips.filter((tip) => matches(tip, query, state.tag))

  const toolbar = el('div', 'toolbar-20261026175950')
  const search = el('input', 'search-20261026175950')
  search.type = 'search'
  search.placeholder = '搜索标题、正文、作者或帖子 ID'
  search.value = state.query
  search.setAttribute('aria-label', '搜索技巧')
  let composing = false
  search.addEventListener('compositionstart', () => {
    composing = true
  })
  search.addEventListener('compositionend', () => {
    composing = false
    state.query = search.value
    const caret = search.selectionStart
    render(state)
    const next = app.querySelector('.search-20261026175950')
    next.focus()
    if (caret !== null) next.setSelectionRange(caret, caret)
  })
  search.addEventListener('input', () => {
    state.query = search.value
    if (composing) return
    const caret = search.selectionStart
    render(state)
    const next = app.querySelector('.search-20261026175950')
    next.focus()
    if (caret !== null) next.setSelectionRange(caret, caret)
  })

  const tagRow = el('div', 'tags-20261026175950')
  tagRow.setAttribute('role', 'group')
  tagRow.setAttribute('aria-label', '按标签筛选')
  const all = el('button', `tag-20261026175950${state.tag ? '' : ' tag-active-20261026175950'}`, '全部')
  all.type = 'button'
  all.setAttribute('aria-pressed', state.tag ? 'false' : 'true')
  all.addEventListener('click', () => {
    state.tag = ''
    render(state)
  })
  tagRow.append(all)
  for (const tag of tags) {
    const active = state.tag === tag
    const button = el('button', `tag-20261026175950${active ? ' tag-active-20261026175950' : ''}`, tag)
    button.type = 'button'
    button.setAttribute('aria-pressed', active ? 'true' : 'false')
    button.addEventListener('click', () => {
      state.tag = active ? '' : tag
      render(state)
    })
    tagRow.append(button)
  }
  toolbar.append(search, tagRow)

  const count = el('p', 'count-20261026175950', `共 ${tips.length} 条，显示 ${visible.length} 条`)
  const list = el('ul', 'list-20261026175950')

  for (const tip of visible) {
    const item = el('li', 'card-20261026175950')
    item.append(
      el('h2', 'card-title-20261026175950', tip.title),
      el(
        'p',
        'meta-20261026175950',
        `@${tip.author} · ${tip.collectedAt} · ${langLabel[tip.lang] ?? tip.lang} · ${tip.quality}`,
      ),
      el('p', 'summary-20261026175950', tip.summary),
      el('p', 'body-20261026175950', tip.body),
    )

    const cardTags = el('div', 'card-tags-20261026175950')
    for (const tag of tip.tags) cardTags.append(el('span', 'card-tag-20261026175950', tag))

    const actions = el('div', 'actions-20261026175950')
    const copy = el('button', 'copy-20261026175950', '复制')
    copy.type = 'button'
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyText(tip))
        copy.textContent = '已复制'
        copy.classList.add('copy-done-20261026175950')
      } catch (error) {
        console.error('复制失败', error)
        copy.textContent = '复制失败，请手动选择正文'
      }
    })
    const source = el('a', 'source-20261026175950', '打开原文')
    source.href = tip.sourceUrl
    source.target = '_blank'
    source.rel = 'noreferrer'
    actions.append(copy, source)
    item.append(cardTags, actions)
    list.append(item)
  }

  page.append(header, toolbar, count, list)
  if (visible.length === 0) {
    page.append(el('p', 'empty-20261026175950', tips.length === 0 ? '还没有收录。' : '没有匹配的条目。换个词，或点「全部」。'))
  }

  const footer = el('footer', 'footer-20261026175950')
  const dataLink = el('a', '', 'data/tips.json')
  dataLink.href = `${import.meta.env.BASE_URL}data/tips.json`
  footer.append('收录数据在 ', dataLink, '。改完跑 npm run validate，再推送到 main。')
  page.append(footer)
  app.append(page)
}

render({ query: '', tag: '' })
