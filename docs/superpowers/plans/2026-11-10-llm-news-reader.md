# 大模型官方新闻阅读器实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在本仓库用 Vite 静态页替换旧技巧站，展示随附的 5 条已核验新闻，并提供父级可显式调用的合并入库命令。

**Architecture:** 纯函数处理校验、去重、时间、链接、筛选和新鲜度；DOM 渲染只使用 `textContent` 和经过检查的 `https` 链接。构建沿用现有 Pages 工作流，把 `data/reader-feed.json` 复制到 `dist/data/reader-feed.json`。

**Tech Stack:** Node 22 内置测试运行器、Vite 6、jsdom（仅渲染测试）、系统 Chrome（仅宽度检查）。

## Global Constraints

- 不 force push，不改写已推送历史，不合并，不改分支保护。
- 不新增托管、付费服务或密钥；不读取采集机磁盘，不调用未文档化的内部接口。
- 公开内容只有随附 `reader-feed.json` 的 5 条。不提交合同、证据、日志、绝对私有路径或秘密。
- 不编造新闻，不用猜测填补发布时间；null 显示「未知」。
- 不 impersonate 厂商。页头写明本站不是厂商官网。
- 新建 CSS 类名带秒级时间戳后缀，且不重复。不做单边色带。
- `schema_version` 只接受 `1.0.0`。过期阈值 30 分钟，超前超过 5 分钟视为时间错误。
- 省略的旧条目不删除。自动入库未接通，不能把脚本或阈值说成闭环。

---

### Task 1: 结构校验

**Files:**
- Create: `src/feed/schema.js`
- Test: `test/schema.test.mjs`

**Interfaces:**
- Produces: `validateFeed(data) -> { ok: true, feed } | { ok: false, errors: string[] }`
- Produces: `scanPublicText(raw) -> string[]`

- [ ] 写失败测试：合法条目、缺字段、星级越界、`published_at: null` 合法、非法时间、重复不在本层判失败、原始文本含 `/home/`、`raw-x`、`PRIVATE KEY` 时失败、`schema_version` 不是 `1.0.0` 失败。
- [ ] 运行 `node --test test/schema.test.mjs`，确认因模块不存在而失败。
- [ ] 实现最小校验。来源数组至少 1 条；每条来源先只要求 `url` 与 `type` 为非空字符串，URL 安全性由 Task 4 复用。
- [ ] 再跑该测试，确认通过。
- [ ] 提交 `test: 校验 reader feed 结构`。

### Task 2: 去重与修订

**Files:**
- Create: `src/feed/dedupe.js`
- Test: `test/dedupe.test.mjs`

**Interfaces:**
- Consumes: 已通过 `validateFeed` 的 feed 对象。
- Produces: `verificationScore(item) -> number`
- Produces: `dedupeFeed(feed) -> { feed, mergedCount }`
- Produces: `mergeFeeds(existing, incoming) -> { feed, mergedCount }`

- [ ] 写失败测试：相同 `id` 保留两边修订；相同 `event_key` 不同 `id` 时高分条目提供字段；分数相同取更新的 `collected_at`；旧 feed 独有条目仍在；字段变化才追加「合并更新（采集时间 …）」；无变化不追加。
- [ ] 运行测试确认失败。
- [ ] 实现合并。来源按 URL 并集。修订键为 `at`、`change`、`importance`、`summary_zh`。
- [ ] 运行测试确认通过并提交 `test: 按 id 与 event_key 合并修订`。

### Task 3: 上海时间与排序

**Files:**
- Create: `src/feed/time.js`
- Test: `test/time.test.mjs`

**Interfaces:**
- Produces: `formatShanghai(iso) -> string`，形如 `2026-11-10 06:01`
- Produces: `publicationLabel(value) -> string`，null 或缺失为 `未知`
- Produces: `shanghaiDate(iso) -> string`，`YYYY-MM-DD`
- Produces: `sortForReading(items) -> items`

- [ ] 写失败测试：`+08:00` 不二次偏移；null 为「未知」；有发布时间的条目排在 null 之前；null 之间按 `collected_at` 降序。
- [ ] 先看失败再实现，然后提交 `test: 用上海时区排列新闻`。

### Task 4: 来源 URL

**Files:**
- Create: `src/feed/urls.js`
- Modify: `src/feed/schema.js` 使用 `safeHttpsUrl`
- Test: `test/urls.test.mjs`

**Interfaces:**
- Produces: `safeHttpsUrl(value) -> string | null`

- [ ] 写失败测试：接受普通 https；拒绝 `javascript:`、`data:`、带用户信息的 URL、空主机、控制字符、非字符串。
- [ ] 先看失败再实现。校验来源时不安全 URL 让该条目失败。
- [ ] 提交 `test: 拒绝不安全来源链接`。

### Task 5: 搜索与筛选

**Files:**
- Create: `src/feed/filter.js`
- Test: `test/filter.test.mjs`

**Interfaces:**
- Consumes: `shanghaiDate`、`publicationLabel`
- Produces: `filterItems(items, { query, vendor, date, minStars }) -> items`
- `vendor` 默认 `all`，`date` 默认 `all`，`minStars` 默认 `1`。

- [ ] 写失败测试：标题子串；大小写不敏感的英文；厂商、日期、星级同时收紧；null 发布时间不进入具体日期，进入「未知」；空查询不过滤。
- [ ] 先看失败再实现，提交 `test: 组合搜索厂商日期和星级`。

### Task 6: 新鲜度与加载

**Files:**
- Create: `src/feed/freshness.js`
- Create: `src/load-feed.js`
- Test: `test/freshness.test.mjs`
- Test: `test/load-feed.test.mjs`

**Interfaces:**
- Produces: `STALE_AFTER_MS = 1800000`，`FUTURE_SKEW_MS = 300000`
- Produces: `assessFreshness(generatedAt, now) -> { state: 'fresh' | 'stale' | 'error', label }`
- Produces: `loadFeed(url, fetchImpl) -> Promise<{ ok: true, feed } | { ok: false, reason }>`

- [ ] 写失败测试：29 分钟为 fresh，31 分钟为 stale，超前 6 分钟为 error；HTTP 非 200、非法 JSON、结构错误均为失败且不含条目。
- [ ] 加载成功后的 feed 必须经过 `dedupeFeed`。
- [ ] 先看失败再实现，提交 `test: 区分加载失败与过期`。

### Task 7: 渲染、已读与 XSS

**Files:**
- Create: `src/feed/render.js`
- Create: `src/read-state.js`
- Test: `test/render.test.mjs`
- Dev dependency: `jsdom`

**Interfaces:**
- Produces: `loadReadIds(storage) -> Set<string>`，`saveReadIds(storage, ids) -> void`
- Produces: `renderReader(root, model) -> void`
- `model` 含 `status`（`ready`、`empty`、`error`）、`freshness`、`items`、`selectedId`、`filters`、`readIds`、`onFilter`、`onSelect`、`onToggleRead`。

- [ ] 写失败测试：标题中的 `<script>` 不成为元素；不安全 URL 没有 `href`；星级和理由可见；null 时间为「未知」；组合筛选由调用方传入已过滤条目后只渲染这些条目；错误状态不渲染文章；修订全部可见；`localStorage` 抛错时返回空集合并调用 `console.error`。
- [ ] 先看失败再实现。类名后缀使用写文件时的 `YYYYMMDDHHmmss`。
- [ ] 提交 `test: 渲染新闻并挡住脚本`。

### Task 8: 入库命令与真实 feed

**Files:**
- Create: `scripts/ingest-feed.mjs`
- Create: `scripts/validate-feed.mjs`
- Create: `data/reader-feed.json`（只复制随附公开文件）
- Delete: `data/tips.json`、`scripts/validate-tips.mjs`
- Test: `test/ingest.test.mjs`
- Test: `test/public-feed.test.mjs`

**Interfaces:**
- `node scripts/ingest-feed.mjs --input <file> [--output data/reader-feed.json]`
- 失败退出码 1，且目标文件字节不变。

- [ ] 写失败测试：临时目录中合并新增 id；非法输入不改输出；输出路径逃出仓库被拒绝；已提交 feed 含且仅含这 5 个 id 与对应标题。
- [ ] 先看失败再实现。校验脚本读取 `data/reader-feed.json`，失败时非 0。
- [ ] 提交 `test: 原子合并公开 feed`。

### Task 9: 页面、构建与说明

**Files:**
- Modify: `src/main.js`、`src/styles.css`、`index.html`、`vite.config.js`、`package.json`、`README.md`、`public/favicon.svg`

**Interfaces:**
- `npm run validate` 改为 feed 校验。
- `npm test` 为 `node --test test/*.test.mjs`。
- `npm run build` 为 `npm test && npm run validate && vite build`。测试因此成为 Pages 构建门禁。宽度检查不在此列。

- [ ] 开发服务器和 `generateBundle` 都提供 `/data/reader-feed.json`（考虑 base `/x-ai-tips/`）。
- [ ] `main.js` 请求 `${import.meta.env.BASE_URL}data/reader-feed.json`，处理 hash、中文组字和筛选控件。
- [ ] 浅色阅读布局：窄屏一次只看列表或详情；宽度至少 960px 时两栏。页头声明非官网。
- [ ] README 写明本地命令、Pages 仍由推 `main` 触发，以及入库命令不是自动闭环。
- [ ] 运行 `npm test` 与 `npm run build`。
- [ ] 提交 `feat: 替换为官方新闻阅读器`。

### Task 10: 宽度与线上事实

**Files:**
- Create: `test/layout.chrome.mjs`
- Artifacts: `/opt/cursor/artifacts/reader_mobile_list.png`、`reader_mobile_detail.png`、`reader_desktop.png`

- [ ] 用系统 Chrome 打开预览，视口 390 和 1440。等待真实标题出现。断言无横向溢出，移动详情可打开，桌面列表与详情同时在。
- [ ] 保存截图。记录 `https://kylin30.github.io/x-ai-tips/` 的 HTTP 响应。合并前把它标为旧站，不把它写成新阅读器已上线。

## 自检

- 规格里的列表、详情、星级理由、三种筛选、全文搜索、来源、上海时间、未知时间、状态与核验、修订、本地已读、更新/过期/错误、真实 5 条、入库限制，分别落在 Task 3 到 Task 10。
- 无「待定」或「类似上一任务」。签名在各任务间一致：`validateFeed`、`dedupeFeed`、`mergeFeeds`、`sortForReading`、`safeHttpsUrl`、`filterItems`、`assessFreshness`、`loadFeed`、`renderReader`。
- 本会话按请求直接实现，不把计划停在等待选择执行方式。
