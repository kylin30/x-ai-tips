import { mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, resolve, sep } from 'node:path'
import { dedupeFeed, mergeFeeds } from '../src/feed/dedupe.js'
import { scanPublicText, validateFeed } from '../src/feed/schema.js'

function fail(message) {
  console.error(message)
  process.exit(1)
}

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index < 0) return ''
  return process.argv[index + 1] || ''
}

const input = argument('--input')
const outputArg = argument('--output') || 'data/reader-feed.json'
if (!input) fail('缺少 --input')

const root = realpathSync(process.cwd())
const output = resolve(root, outputArg)
if (!output.endsWith('.json')) fail('输出文件必须是 .json')
const parent = dirname(output)
if (parent !== root && !parent.startsWith(`${root}${sep}`)) fail('输出路径必须在当前仓库内')
let parentReal
try {
  parentReal = realpathSync(parent)
} catch (error) {
  if (error.code !== 'ENOENT') fail(`无法确认输出目录：${error.message}`)
  mkdirSync(parent, { recursive: false })
  parentReal = realpathSync(parent)
}
if (parentReal !== root && !parentReal.startsWith(`${root}${sep}`)) {
  fail('输出路径必须在当前仓库内')
}

let raw
try {
  raw = readFileSync(input, 'utf8')
} catch (error) {
  fail(`无法读取输入：${error.message}`)
}
const scanned = scanPublicText(raw)
if (scanned.length > 0) fail(scanned.join('\n'))

let incomingData
try {
  incomingData = JSON.parse(raw)
} catch (error) {
  fail(`输入不是合法 JSON：${error.message}`)
}
const incoming = validateFeed(incomingData)
if (!incoming.ok) fail(incoming.errors.join('\n'))

let next
try {
  const existingRaw = readFileSync(output, 'utf8')
  const existingScan = scanPublicText(existingRaw)
  if (existingScan.length > 0) fail(existingScan.join('\n'))
  let existingData
  try {
    existingData = JSON.parse(existingRaw)
  } catch (error) {
    fail(`现有 feed 不是合法 JSON，已停止写入：${error.message}`)
  }
  const existing = validateFeed(existingData)
  if (!existing.ok) fail(`现有 feed 无法校验，已停止写入：\n${existing.errors.join('\n')}`)
  next = mergeFeeds(existing.feed, incoming.feed).feed
} catch (error) {
  if (error.code !== 'ENOENT') throw error
  next = dedupeFeed(incoming.feed).feed
}

const json = `${JSON.stringify(next, null, 2)}\n`
const temporary = resolve(parentReal, `.${basename(output)}.${process.pid}.tmp`)
try {
  writeFileSync(temporary, json)
  renameSync(temporary, output)
} catch (error) {
  try {
    unlinkSync(temporary)
  } catch (cleanupError) {
    console.error('无法清理临时文件', cleanupError)
  }
  fail(`写入失败：${error.message}`)
}
console.log(`已写入 ${output}，共 ${next.items.length} 条。`)
