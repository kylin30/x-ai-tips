const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partsOf(iso) {
  return Object.fromEntries(
    formatter.formatToParts(new Date(iso)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )
}

export function formatShanghai(iso) {
  const parts = partsOf(iso)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

export function shanghaiDate(iso) {
  const parts = partsOf(iso)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function publicationLabel(value) {
  if (value == null || value === '') return '未知'
  return formatShanghai(value)
}

export function sortForReading(items) {
  return [...items].sort((left, right) => {
    if (left.published_at && right.published_at) {
      return Date.parse(right.published_at) - Date.parse(left.published_at)
    }
    if (left.published_at) return -1
    if (right.published_at) return 1
    return Date.parse(right.collected_at) - Date.parse(left.collected_at)
  })
}
