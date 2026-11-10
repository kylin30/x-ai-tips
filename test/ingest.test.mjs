import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { validFeed, validItem } from './fixtures.mjs'

const script = fileURLToPath(new URL('../scripts/ingest-feed.mjs', import.meta.url))

function run(cwd, args) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' })
}

test('合并新增条目并保留仓库里已有的新闻', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'reader-ingest-'))
  mkdirSync(join(cwd, 'data'))
  const output = join(cwd, 'data', 'reader-feed.json')
  const existing = validFeed([validItem({ id: 'existing', event_key: 'existing-event', title_zh: '已有新闻' })])
  writeFileSync(output, JSON.stringify(existing))
  const input = join(cwd, 'incoming.json')
  writeFileSync(
    input,
    JSON.stringify(
      validFeed(
        [validItem({ id: 'fresh', event_key: 'fresh-event', title_zh: '新新闻' })],
        { generated_at: '2026-11-10T09:00:00+08:00' },
      ),
    ),
  )
  const result = run(cwd, ['--input', input, '--output', output])
  assert.equal(result.status, 0, result.stderr)
  const merged = JSON.parse(readFileSync(output, 'utf8'))
  assert.deepEqual(
    merged.items.map((item) => item.title_zh),
    ['已有新闻', '新新闻'],
  )
  assert.equal(merged.generated_at, '2026-11-10T09:00:00+08:00')
})

test('非法输入不改动已有文件', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'reader-ingest-'))
  mkdirSync(join(cwd, 'data'))
  const output = join(cwd, 'data', 'reader-feed.json')
  const original = `${JSON.stringify(validFeed())}\n`
  writeFileSync(output, original)
  const input = join(cwd, 'broken.json')
  writeFileSync(input, '{"schema_version":"1.0.0"}')
  const result = run(cwd, ['--input', input, '--output', output])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /generated_at|items/)
  assert.equal(readFileSync(output, 'utf8'), original)
})

test('拒绝的输出路径不会在仓库外创建目录', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'reader-ingest-'))
  const outsideDir = join(tmpdir(), `reader-no-such-${Date.now()}`)
  const input = join(cwd, 'incoming.json')
  writeFileSync(input, JSON.stringify(validFeed()))
  const result = run(cwd, ['--input', input, '--output', join(outsideDir, 'feed.json')])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /仓库/)
  assert.equal(existsSync(outsideDir), false)
})

test('拒绝把 feed 写到仓库目录之外', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'reader-ingest-'))
  const outside = join(tmpdir(), `reader-outside-${Date.now()}.json`)
  const input = join(cwd, 'incoming.json')
  writeFileSync(input, JSON.stringify(validFeed()))
  const result = run(cwd, ['--input', input, '--output', outside])
  assert.equal(result.status, 1)
  assert.match(result.stderr, /仓库/)
  assert.throws(() => readFileSync(outside, 'utf8'))
})
