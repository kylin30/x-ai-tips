import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dedupeFeed } from '../src/feed/dedupe.js'
import { scanPublicText, validateFeed } from '../src/feed/schema.js'

const file = resolve(process.cwd(), 'data/reader-feed.json')
let raw
try {
  raw = readFileSync(file, 'utf8')
} catch (error) {
  console.error(`无法读取 data/reader-feed.json：${error.message}`)
  process.exit(1)
}

const scanned = scanPublicText(raw)
if (scanned.length > 0) {
  console.error(scanned.join('\n'))
  process.exit(1)
}

let data
try {
  data = JSON.parse(raw)
} catch (error) {
  console.error(`data/reader-feed.json 不是合法 JSON：${error.message}`)
  process.exit(1)
}

const result = validateFeed(data)
if (!result.ok) {
  console.error(`data/reader-feed.json 未通过校验（${result.errors.length} 个问题）：`)
  for (const error of result.errors) console.error(`- ${error}`)
  process.exit(1)
}

const deduped = dedupeFeed(result.feed)
if (deduped.mergedCount > 0) {
  console.error('data/reader-feed.json 含有重复 id 或 event_key，请先运行 scripts/ingest-feed.mjs')
  process.exit(1)
}

console.log(`data/reader-feed.json 校验通过，共 ${result.feed.items.length} 条。`)
