const FORBIDDEN_TEXT = ['raw-x', '/home/', '/agent/', 'x-access-token', 'PRIVATE KEY', 'cursor/stores']

export function scanPublicText(raw) {
  if (typeof raw !== 'string') return ['原始内容必须是字符串']
  return FORBIDDEN_TEXT.filter((token) => raw.includes(token)).map((token) => `公开文本含禁止片段 ${token}`)
}

export function isIsoWithOffset(value) {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return false
  let offsetMinutes = 0
  if (match[8] !== 'Z') {
    const sign = match[8].startsWith('-') ? -1 : 1
    const [offsetHour, offsetMinute] = match[8].slice(1).split(':').map(Number)
    if (offsetHour > 23 || offsetMinute > 59) return false
    offsetMinutes = sign * (offsetHour * 60 + offsetMinute)
  }
  const shifted = new Date(parsed + offsetMinutes * 60000)
  return (
    shifted.getUTCFullYear() === year &&
    shifted.getUTCMonth() + 1 === month &&
    shifted.getUTCDate() === day &&
    shifted.getUTCHours() === hour &&
    shifted.getUTCMinutes() === minute &&
    shifted.getUTCSeconds() === second
  )
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function nonEmpty(value, max) {
  return typeof value === 'string' && value.trim() !== '' && value.length <= max
}

export function validateFeed(data) {
  const errors = []
  if (!isPlainObject(data)) {
    return { ok: false, errors: ['根节点必须是对象'] }
  }
  if (data.schema_version !== '1.0.0') errors.push('schema_version 必须是 1.0.0')
  if (!isIsoWithOffset(data.generated_at)) errors.push('generated_at 必须是带时区偏移的 ISO 时间')
  if (!Array.isArray(data.items)) errors.push('items 必须是数组')

  const items = Array.isArray(data.items) ? data.items : []
  items.forEach((item, index) => {
    const where = `items[${index}]`
    if (!isPlainObject(item)) {
      errors.push(`${where} 必须是对象`)
      return
    }
    if (!nonEmpty(item.id, 80)) errors.push(`${where} 的 id 必须是非空字符串`)
    if (!nonEmpty(item.event_key, 120)) errors.push(`${where} 的 event_key 必须是非空字符串`)
    if (!nonEmpty(item.vendor, 80)) errors.push(`${where} 的 vendor 必须是非空字符串`)
    if (!nonEmpty(item.title_zh, 200)) errors.push(`${where} 的 title_zh 必须是非空字符串`)
    if (!nonEmpty(item.summary_zh, 4000)) errors.push(`${where} 的 summary_zh 必须是非空字符串`)
    if (!Number.isInteger(item.importance) || item.importance < 1 || item.importance > 5) {
      errors.push(`${where} 的 importance 必须是 1 到 5 的整数`)
    }
    if (!nonEmpty(item.importance_reason_zh, 1000)) {
      errors.push(`${where} 的 importance_reason_zh 必须是非空字符串`)
    }
    if (!nonEmpty(item.status_release, 40)) errors.push(`${where} 的 status_release 必须是非空字符串`)
    if (!Object.hasOwn(item, 'published_at')) errors.push(`${where} 缺少 published_at`)
    else if (item.published_at !== null && !isIsoWithOffset(item.published_at)) {
      errors.push(`${where} 的 published_at 必须是 null 或带时区偏移的 ISO 时间`)
    }
    if (!isIsoWithOffset(item.collected_at)) errors.push(`${where} 的 collected_at 必须是带时区偏移的 ISO 时间`)
    if (item.body_zh !== undefined && !nonEmpty(item.body_zh, 20000)) {
      errors.push(`${where} 的 body_zh 必须是非空字符串`)
    }
    if (item.verification_note !== undefined && !nonEmpty(item.verification_note, 2000)) {
      errors.push(`${where} 的 verification_note 必须是非空字符串`)
    }
    if (!Array.isArray(item.sources) || item.sources.length < 1 || item.sources.length > 20) {
      errors.push(`${where} 的 sources 必须是 1 到 20 条来源`)
    } else {
      item.sources.forEach((source, sourceIndex) => {
        if (!isPlainObject(source) || !nonEmpty(source.url, 2000) || !nonEmpty(source.type, 40)) {
          errors.push(`${where} 的 sources[${sourceIndex}] 必须包含非空 url 和 type`)
        }
      })
    }
    if (item.revisions !== undefined) {
      if (!Array.isArray(item.revisions)) {
        errors.push(`${where} 的 revisions 必须是数组`)
      } else {
        item.revisions.forEach((revision, revisionIndex) => {
          if (!isPlainObject(revision) || !isIsoWithOffset(revision.at) || !nonEmpty(revision.change, 500)) {
            errors.push(`${where} 的 revisions[${revisionIndex}] 必须包含时间和变更说明`)
          } else if (
            revision.importance !== undefined &&
            (!Number.isInteger(revision.importance) || revision.importance < 1 || revision.importance > 5)
          ) {
            errors.push(`${where} 的 revisions[${revisionIndex}].importance 必须是 1 到 5 的整数`)
          }
        })
      }
    }
  })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, feed: data }
}
