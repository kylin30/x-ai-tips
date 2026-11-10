const STORAGE_KEY = 'llm-news-read-ids-v1'

export function loadReadIds(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id) => typeof id === 'string' && id.length > 0))
  } catch (error) {
    console.error('无法读取本地已读状态', error)
    return new Set()
  }
}

export function saveReadIds(storage, ids) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch (error) {
    console.error('无法保存本地已读状态', error)
  }
}
