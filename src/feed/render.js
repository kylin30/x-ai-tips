import { formatShanghai, publicationLabel } from './time.js'
import { safeHttpsUrl } from './urls.js'

const SUFFIX = '20261110014211'

const sourceLabels = {
  x_post: 'X 原文',
  vendor_blog: '官网',
  pricing: '定价',
  docs: '文档',
  other: '来源',
}

function el(doc, tag, className, text) {
  const node = doc.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function stars(importance) {
  return `${'★'.repeat(importance)}${'☆'.repeat(5 - importance)} ${importance}/5`
}

function appendSources(doc, parent, sources) {
  const list = el(doc, 'ul', `reader-sources-${SUFFIX}`)
  for (const source of sources || []) {
    const item = el(doc, 'li', `reader-source-${SUFFIX}`)
    const label = sourceLabels[source.type] || source.type
    const href = safeHttpsUrl(source.url)
    if (!href) {
      item.append(el(doc, 'span', `reader-unsafe-${SUFFIX}`, `${label}：链接未通过安全检查`))
    } else {
      const link = el(doc, 'a', `reader-link-${SUFFIX}`, label)
      link.href = href
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      item.append(link)
    }
    list.append(item)
  }
  parent.append(list)
}

function appendDetail(doc, parent, item, model) {
  const detail = el(doc, 'article', `reader-detail-${SUFFIX}`)
  const back = el(doc, 'button', `reader-back-${SUFFIX}`, '返回列表')
  back.type = 'button'
  back.addEventListener('click', () => model.onSelect(''))
  const read = el(
    doc,
    'button',
    `reader-read-${SUFFIX}`,
    model.readIds.has(item.id) ? '标为未读' : '标为已读',
  )
  read.type = 'button'
  read.addEventListener('click', () => model.onToggleRead(item.id))
  detail.append(
    back,
    read,
    el(doc, 'p', `reader-meta-${SUFFIX}`, item.vendor),
    el(doc, 'h2', `reader-detail-title-${SUFFIX}`, item.title_zh),
    el(doc, 'p', `reader-stars-${SUFFIX}`, stars(item.importance)),
    el(doc, 'p', `reader-reason-${SUFFIX}`, item.importance_reason_zh),
    el(doc, 'p', `reader-meta-${SUFFIX}`, `状态：${item.status_release}`),
    el(doc, 'p', `reader-meta-${SUFFIX}`, `发布时间：${publicationLabel(item.published_at)}`),
    el(doc, 'p', `reader-meta-${SUFFIX}`, `采集时间：${formatShanghai(item.collected_at)}`),
    el(doc, 'p', `reader-body-${SUFFIX}`, item.body_zh || item.summary_zh),
    el(doc, 'p', `reader-reason-${SUFFIX}`, item.verification_note || '无额外核验说明'),
  )
  appendSources(doc, detail, item.sources)
  const revisions = el(doc, 'section', `reader-revisions-${SUFFIX}`)
  revisions.append(el(doc, 'h3', `reader-revisions-title-${SUFFIX}`, '修订记录'))
  if (!item.revisions || item.revisions.length === 0) {
    revisions.append(el(doc, 'p', `reader-meta-${SUFFIX}`, '无修订记录'))
  } else {
    const list = el(doc, 'ol', `reader-revision-list-${SUFFIX}`)
    for (const revision of item.revisions) {
      const line = `${formatShanghai(revision.at)} ${revision.change}`
      const extra = [revision.importance ? `星级 ${revision.importance}` : '', revision.summary_zh || '']
        .filter(Boolean)
        .join(' ')
      list.append(el(doc, 'li', `reader-revision-${SUFFIX}`, extra ? `${line} ${extra}` : line))
    }
    revisions.append(list)
  }
  detail.append(revisions)
  parent.append(detail)
}

export function renderReader(root, model) {
  const doc = root.ownerDocument
  root.replaceChildren()
  const page = el(doc, 'main', `reader-page-${SUFFIX}`)
  const header = el(doc, 'header', `reader-header-${SUFFIX}`)
  header.append(
    el(doc, 'p', `reader-kicker-${SUFFIX}`, '大模型官方新闻'),
    el(doc, 'h1', `reader-title-${SUFFIX}`, '已核验公开动态'),
    el(doc, 'p', `reader-disclaimer-${SUFFIX}`, '本站整理已核验的厂商公开信息，不是任何厂商的官方网站。'),
  )
  const statusClass =
    model.freshness?.state === 'stale'
      ? `reader-status-${SUFFIX} reader-status-stale-${SUFFIX}`
      : `reader-status-${SUFFIX}`
  header.append(
    el(doc, 'p', statusClass, `最近更新 ${model.generatedLabel || '未知'}。${model.freshness?.label || ''}`),
  )
  page.append(header)

  const form = el(doc, 'form', `reader-tools-${SUFFIX}`)
  const search = el(doc, 'input', `reader-search-${SUFFIX}`)
  search.type = 'search'
  search.name = 'query'
  search.value = model.filters.query
  search.setAttribute('aria-label', '搜索新闻')
  search.dataset.filter = 'query'
  const vendor = el(doc, 'select', `reader-select-${SUFFIX}`)
  vendor.name = 'vendor'
  vendor.setAttribute('aria-label', '厂商')
  vendor.dataset.filter = 'vendor'
  vendor.append(new doc.defaultView.Option('全部厂商', 'all'))
  for (const name of model.vendors) vendor.append(new doc.defaultView.Option(name, name))
  vendor.value = model.filters.vendor
  const date = el(doc, 'select', `reader-select-${SUFFIX}`)
  date.name = 'date'
  date.setAttribute('aria-label', '日期')
  date.dataset.filter = 'date'
  date.append(new doc.defaultView.Option('全部日期', 'all'))
  for (const day of model.dates) date.append(new doc.defaultView.Option(day, day))
  date.append(new doc.defaultView.Option('未知', 'unknown'))
  date.value = model.filters.date
  const starsSelect = el(doc, 'select', `reader-select-${SUFFIX}`)
  starsSelect.name = 'stars'
  starsSelect.setAttribute('aria-label', '最低星级')
  starsSelect.dataset.filter = 'stars'
  for (let value = 1; value <= 5; value += 1) {
    starsSelect.append(new doc.defaultView.Option(`至少 ${value} 星`, String(value)))
  }
  starsSelect.value = String(model.filters.minStars)
  form.append(search, vendor, date, starsSelect)
  form.addEventListener('submit', (event) => event.preventDefault())
  const notify = () => {
    model.onFilter({
      query: search.value,
      vendor: vendor.value,
      date: date.value,
      minStars: Number(starsSelect.value),
    })
  }
  let composing = false
  search.addEventListener('compositionstart', () => {
    composing = true
  })
  search.addEventListener('compositionend', () => {
    composing = false
    notify()
  })
  form.addEventListener('change', notify)
  form.addEventListener('input', (event) => {
    if (event.target === search && composing) return
    notify()
  })
  search.placeholder = '搜索标题、摘要、厂商或来源'
  page.append(form)
  header.querySelector(`.reader-status-${SUFFIX}`).setAttribute('role', 'status')

  if (model.status === 'loading') {
    page.append(el(doc, 'p', `reader-empty-${SUFFIX}`, '正在加载新闻'))
    root.append(page)
    return
  }

  if (model.status === 'error') {
    const alert = el(doc, 'p', `reader-alert-${SUFFIX}`, model.errorMessage || '无法加载新闻数据')
    alert.setAttribute('role', 'alert')
    page.append(alert)
    root.append(page)
    return
  }

  const layout = el(doc, 'div', `reader-layout-${SUFFIX}`)
  const list = el(doc, 'div', `reader-list-${SUFFIX}`)
  if (model.status === 'empty') {
    list.append(el(doc, 'p', `reader-empty-${SUFFIX}`, '暂无已核验新闻'))
  } else if (model.items.length === 0) {
    list.append(el(doc, 'p', `reader-empty-${SUFFIX}`, '没有符合条件的新闻'))
  } else {
    for (const item of model.items) {
      const card = el(doc, 'article', `reader-card-${SUFFIX}`)
      if (item.id === model.selectedId) card.classList.add(`reader-card-active-${SUFFIX}`)
      if (model.readIds.has(item.id)) card.classList.add(`reader-card-read-${SUFFIX}`)
      const open = el(doc, 'button', `reader-open-${SUFFIX}`, item.title_zh)
      open.type = 'button'
      open.addEventListener('click', () => model.onSelect(item.id))
      card.append(
        el(doc, 'p', `reader-meta-${SUFFIX}`, item.vendor),
        open,
        el(doc, 'p', `reader-stars-${SUFFIX}`, stars(item.importance)),
        el(doc, 'p', `reader-reason-${SUFFIX}`, item.importance_reason_zh),
        el(doc, 'p', `reader-meta-${SUFFIX}`, `状态：${item.status_release}`),
        el(doc, 'p', `reader-meta-${SUFFIX}`, `发布时间：${publicationLabel(item.published_at)}`),
        el(doc, 'p', `reader-summary-${SUFFIX}`, item.summary_zh),
      )
      list.append(card)
    }
  }
  layout.append(list)
  const selected = model.items.find((item) => item.id === model.selectedId)
  if (selected) appendDetail(doc, layout, selected, model)
  page.append(layout)
  root.append(page)
}
