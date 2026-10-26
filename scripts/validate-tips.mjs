import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve(process.cwd(), 'data/tips.json')
const langs = new Set(['zh', 'en', 'other'])
const qualities = new Set(['值得一看', '备用', '一般'])
const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const authorPattern = /^[A-Za-z0-9_]{1,50}$/

const errors = []

function fail(message) {
  errors.push(message)
}

let raw
try {
  raw = readFileSync(file, 'utf8')
} catch (error) {
  console.error(`无法读取 data/tips.json：${error.message}`)
  process.exit(1)
}

let data
try {
  data = JSON.parse(raw)
} catch (error) {
  console.error(`data/tips.json 不是合法 JSON：${error.message}`)
  process.exit(1)
}

if (data === null || typeof data !== 'object' || Array.isArray(data)) {
  fail('根节点必须是对象')
} else {
  if (data.version !== 1) fail('version 必须为 1')
  if (!Array.isArray(data.tips)) fail('tips 必须是数组')
}

const tips = Array.isArray(data?.tips) ? data.tips : []
const seen = new Set()

tips.forEach((tip, index) => {
  const where = `tips[${index}]`
  if (tip === null || typeof tip !== 'object' || Array.isArray(tip)) {
    fail(`${where} 必须是对象`)
    return
  }

  const id = typeof tip.id === 'string' ? tip.id : ''
  const label = id ? `${where} (${id})` : where

  if (!idPattern.test(id)) {
    fail(`${label} 的 id 必须是 1–81 位字母、数字、点、下划线或连字符，且以字母或数字开头`)
  } else if (seen.has(id)) {
    fail(`${label} 的 id 重复`)
  } else {
    seen.add(id)
  }

  for (const field of ['title', 'summary', 'body']) {
    if (typeof tip[field] !== 'string' || tip[field].trim() === '') {
      fail(`${label} 的 ${field} 必须是非空字符串`)
    }
  }

  if (!Array.isArray(tip.tags) || tip.tags.length === 0) {
    fail(`${label} 的 tags 必须是非空数组`)
  } else if (tip.tags.length > 12) {
    fail(`${label} 的 tags 不能超过 12 个`)
  } else {
    const tagSeen = new Set()
    tip.tags.forEach((tag, tagIndex) => {
      if (typeof tag !== 'string' || tag.trim() === '' || tag.trim() !== tag || tag.length > 24) {
        fail(`${label} 的 tags[${tagIndex}] 必须是去掉首尾空白、不超过 24 字的非空字符串`)
        return
      }
      if (tagSeen.has(tag)) fail(`${label} 的标签「${tag}」重复`)
      tagSeen.add(tag)
    })
  }

  if (typeof tip.author !== 'string' || !authorPattern.test(tip.author)) {
    fail(`${label} 的 author 必须是不含 @ 的 X 用户名`)
  }

  if (typeof tip.sourceUrl !== 'string') {
    fail(`${label} 的 sourceUrl 必须是字符串`)
  } else {
    try {
      const url = new URL(tip.sourceUrl)
      if (url.protocol !== 'https:') fail(`${label} 的 sourceUrl 必须是 https 链接`)
    } catch {
      fail(`${label} 的 sourceUrl 不是合法 URL`)
    }
  }

  if (!langs.has(tip.lang)) fail(`${label} 的 lang 必须是 zh、en 或 other`)
  if (!qualities.has(tip.quality)) fail(`${label} 的 quality 必须是 值得一看、备用 或 一般`)

  if (typeof tip.collectedAt !== 'string' || !datePattern.test(tip.collectedAt)) {
    fail(`${label} 的 collectedAt 必须是 YYYY-MM-DD`)
  } else {
    const [year, month, day] = tip.collectedAt.split('-').map(Number)
    const parsed = new Date(Date.UTC(year, month - 1, day))
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      fail(`${label} 的 collectedAt 不是真实日期`)
    }
  }
})

if (errors.length > 0) {
  console.error(`data/tips.json 未通过校验（${errors.length} 个问题）：`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`data/tips.json 校验通过，共 ${tips.length} 条。`)
