import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatShanghai, publicationLabel, shanghaiDate, sortForReading } from '../src/feed/time.js'
import { validItem } from './fixtures.mjs'

test('上海时区显示不把 +08:00 再偏移一次', () => {
  assert.equal(formatShanghai('2026-11-10T06:01:00+08:00'), '2026-11-10 06:01')
  assert.equal(shanghaiDate('2026-11-09T23:24:22+08:00'), '2026-11-09')
})

test('缺失或 null 的发布时间显示未知，排序时垫后', () => {
  assert.equal(publicationLabel(null), '未知')
  assert.equal(publicationLabel(undefined), '未知')
  const early = validItem({ id: 'early', published_at: '2026-11-09T20:14:16+08:00' })
  const later = validItem({ id: 'later', published_at: '2026-11-10T06:01:00+08:00' })
  const unknownOlder = validItem({
    id: 'unknown-older',
    published_at: null,
    collected_at: '2026-11-10T08:00:00+08:00',
  })
  const unknownNewer = validItem({
    id: 'unknown-newer',
    published_at: null,
    collected_at: '2026-11-10T09:00:00+08:00',
  })
  const sorted = sortForReading([unknownOlder, early, unknownNewer, later])
  assert.deepEqual(
    sorted.map((item) => item.id),
    ['later', 'early', 'unknown-newer', 'unknown-older'],
  )
})
