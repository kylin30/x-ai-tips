export function validItem(overrides = {}) {
  return {
    id: '2119913172039868579',
    event_key: 'openai-control-room-safety',
    vendor: 'OpenAI',
    title_zh: 'OpenAI 发布 Control Room 研究侧安全停机系统',
    summary_zh: 'Control Room 用于统一跟踪研究基础设施中的模型负载。',
    importance: 3,
    importance_reason_zh: '实质安全基础设施更新，非新旗舰模型发布。',
    status_release: '已发布',
    sources: [
      { url: 'https://x.com/OpenAI/status/2119913172039868579', type: 'x_post' },
      { url: 'https://openai.com/index/control-room/', type: 'vendor_blog' },
    ],
    published_at: '2026-11-10T06:01:00+08:00',
    collected_at: '2026-11-10T08:22:35+08:00',
    verification_note: '已对照公开页复核。',
    revisions: [{ at: '2026-11-10T08:35:56+08:00', change: '初版写入公开 reader-feed v1' }],
    ...overrides,
  }
}

export function validFeed(items = [validItem()], overrides = {}) {
  return {
    schema_version: '1.0.0',
    generated_at: '2026-11-10T08:35:56+08:00',
    items,
    ...overrides,
  }
}
