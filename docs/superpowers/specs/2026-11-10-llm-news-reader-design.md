# 大模型官方新闻阅读器设计

日期：2026-11-10。仓库：`kylin30/x-ai-tips`。本文件只描述阅读器与入库桥，不包含新闻事实。

## 已确认的意图

用户要求在这个公开仓库里直接替换旧的「X · AI 技巧摘录」，保留 git 历史，用普通分支和 Pull Request 提交，不 force push，不改分支保护。线上 Pages 已开启，`build_type=workflow`，公开地址是 `https://kylin30.github.io/x-ai-tips/`。页面要展示随附的 5 条已核验新闻，不使用演示数据。

## 仓库事实

- 技术：Vite 6、无框架、`base` 为 `/x-ai-tips/`。构建命令是 `npm run build`，产物目录 `dist`。
- 部署：`.github/workflows/pages.yml` 在推送到 `main` 或手动 `workflow_dispatch` 时执行 `npm ci` 与 `npm run build`，再用 `actions/deploy-pages` 发布。最近一次成功部署由推送到 `main` 触发。
- 旧更新方式：人工改 `data/tips.json`，`scripts/validate-tips.mjs` 校验，提交后推 `main`。没有采集、调度、`repository_dispatch` 或外部 feed 地址。
- `main` 的 rulesets 列表为空。分支保护接口返回 403，不能当成「没有保护」。
- 采集端在另一台机器上每 10 分钟原子写入完整公开 JSON。GitHub Actions 和本云端代理都读不到那台机器的磁盘。没有可假定的公开 feed URL 或 API token。

## 方案

1. 继续用 Vite 静态站，把校验、去重、时间和筛选做成纯函数，页面只负责渲染。推荐。现有 Pages 工作流不用改权限，测试不依赖付费服务。
2. 换成前端框架。阅读、筛选和本地已读用不到，还会扩大依赖面。
3. 在 Actions 里轮询采集机或空密钥。采集机不可达，空密钥也不是闭环，明确不做。

## 架构

阅读器是只读静态页。唯一公开内容是 `data/reader-feed.json`。构建时把它原样复制到 `dist/data/reader-feed.json`，开发服务器提供同一路径。页面启动后请求该文件；失败或结构不合法时只显示错误，不渲染条目，也不回退到另一份内嵌数据。

展示排序与文件顺序分开。文件保持合并前的相对顺序，方便 diff。页面按 `published_at` 降序；`published_at` 为 null 的条目排在所有已知发布时间之后，再按 `collected_at` 降序。null 不换算成发布时间，界面写「未知」。

时间显示使用 `Asia/Shanghai`。`generated_at`、`published_at`、`collected_at` 都按此时区格式化。

新鲜度只描述已加载文件，不证明采集机在运行：

- 能解析且距离现在不超过 30 分钟：正常，并显示最近更新时间。
- 超过 30 分钟：仍显示条目，并标明可能过期。
- 比现在超前 5 分钟以上，或时间无法解析：结构错误，不渲染条目。
- 网络失败、非 JSON、结构校验失败：错误状态，不渲染条目。
- `items` 为空但结构合法：空状态，不是错误。

30 分钟阈值是显示启发式。采集周期是 10 分钟，阈值留出两次错过的余量；它不能被说成自动采集已接通。

筛选是「与」关系：全文子串（大小写不敏感）、厂商精确匹配、上海日历日、最低星级。日期来自 `published_at`；null 只在「全部」或「未知」下出现。星级是 `importance` 1 到 5，卡片同时显示理由。搜索范围是标题、摘要、正文、厂商、状态、星级理由、核验说明、id、event_key 和来源 URL。

已提交文件里的来源 URL 必须是不含用户信息的 `https`。`javascript:`、`data:`、空主机或控制字符让整份文件校验失败，阅读器只显示错误、不渲染条目。渲染器另外保持同一规则：即使调用方塞进不安全 URL，也不写入 `href`，只显示来源类型和「链接未通过安全检查」。文本全部用 `textContent` 写入。未知来源类型保留原字，不标成官网。

页头固定声明：本站整理已核验的厂商公开信息，不是任何厂商的官方网站。状态和核验说明在列表和详情都可见。修订按时间升序全部展示。

已读状态可选，只写 `localStorage` 键 `llm-news-read-ids-v1`。没有账号。`localStorage` 失败时在控制台记录，阅读功能继续，已读标记不可用。

桌面宽屏同时显示列表和详情。窄屏用 hash：`#/` 为列表，`#/item/<id>` 为详情。样式是浅色阅读页，四边完整边框，不做单边色带。新建 CSS 类名带写入时的秒级时间戳后缀。

## 去重与历史

主键是 `id`，其次是 `event_key`。同一文件或新旧文件冲突时合并为一条：

- 字段采用核验完整度更高的一条；分数相同则采用 `collected_at` 更新的一条；仍相同则保留先出现的字段。
- 完整度 = 非空核验说明 2 分 + 非空正文 1 分 + 非空发布时间 1 分 + 来源条数。
- 来源按 URL 取并集。修订按 `at`、`change`、可选 `importance`、可选 `summary_zh` 取并集，再按 `at` 升序稳定排列。
- 只在实际字段变化、且传入修订里没有同一条说明时，追加一条合并审计修订。审计句子固定为「合并更新（采集时间 <collected_at>）」，不新写新闻事实。
- 传入快照没有、但仓库里已有的条目保留。因此漏写一条不会删除历史；当前合同也没有撤回字段，省略不能当撤回。
- 不创造条目，不改写已有事实来填空。

`schema_version` 必须是 `1.0.0`，否则整份文件失败。

公开安全扫描在原始 JSON 文本上拒绝：`raw-x`、`/home/`、`/agent/`、`x-access-token`、`PRIVATE KEY`、`cursor/stores`。这只挡住明确的内部残留，不负责发现一切秘密。

## 入库桥

父级拥有调度。本仓库提供的命令：

```bash
node scripts/ingest-feed.mjs --input <公开 reader-feed.json 的路径>
```

默认原子写入 `data/reader-feed.json`（同目录临时文件后 `rename`）。`--output` 必须落在当前仓库内且以 `.json` 结尾。输入可以在仓库外。校验或扫描失败时退出码为 1，且不替换目标文件。

这不是闭环。没有进程会每 10 分钟自己拿到采集机上的新文件。父级若要更新站点，必须先取得采集端已经写好的脱敏公开 JSON，再运行上述命令，把结果提交并推送到 `main`。推到 `main` 后，现有 Pages 工作流会构建并部署，按仓库历史不需要为每次数据更新单独人工合并；若 `main` 实际受到本接口看不到的保护，推送会被拒绝，那时每次更新都要走 PR。向本代理回复附件只能在本对话还在时处理，不能当成 10 分钟调度。

本变更的站点 PR 与自动入库分开。PR 合并前，公开 URL 仍是旧站。不从功能分支对生产 Pages 执行 `workflow_dispatch`，避免未审阅的构建覆盖线上站点。不合并，不改保护规则。

## 文件归属

| 文件 | 职责 |
| --- | --- |
| `data/reader-feed.json` | 唯一公开新闻内容，初始为随附的 5 条 |
| `src/feed/schema.js` | 结构校验与公开安全扫描 |
| `src/feed/dedupe.js` | `id` 与 `event_key` 合并 |
| `src/feed/time.js` | 上海时区、未知时间、排序 |
| `src/feed/urls.js` | https 来源判断 |
| `src/feed/filter.js` | 搜索与厂商、日期、星级组合 |
| `src/feed/freshness.js` | 更新、过期、错误判断 |
| `src/feed/render.js` | DOM 渲染 |
| `src/read-state.js` | 本地已读 |
| `src/load-feed.js` | 拉取与失败分类 |
| `src/main.js` | 启动、hash、输入法组字、接线 |
| `src/styles.css` | 浅色阅读样式 |
| `scripts/validate-feed.mjs` | 构建前校验已提交的 feed |
| `scripts/ingest-feed.mjs` | 父级调用的合并写入命令 |
| `vite.config.js` | 保持 `/x-ai-tips/`，开发与构建都提供 feed |
| `test/*.test.mjs` | 纯逻辑与渲染行为 |
| `test/layout.chrome.mjs` | 本机 Chrome 的 390 与 1440 宽度检查，不进入 `npm test` |
| `index.html`、`public/favicon.svg`、`README.md` | 入口、中性图标、使用说明与入库限制 |

删除旧的 `data/tips.json` 与 `scripts/validate-tips.mjs`。历史仍在 git 中。不提交 feed 合同、证据、日志或绝对私有路径。

## 测试

`node --test test/*.test.mjs` 覆盖：合法与非法结构、重复 `id` 与 `event_key`、修订保留、null 发布时间显示为未知且排序垫后、来源 URL 与 XSS 文本、搜索和三种筛选的组合、加载失败与过期、已读存储失败。真实 5 条只用于「提交文件含这些 id 和标题」的测试，缺口用夹具，不改真实新闻。

`npm run build` 仍先跑校验。GitHub Actions 不假设有 Chrome，所以宽度检查用单独命令，在本环境用系统 Chrome 跑。

## 自检

- 无待定项。schema 只接受 `1.0.0`；更新阈值定为 30 分钟与超前 5 分钟；省略条目不删除；这些都已写死。
- 展示排序与合并顺序不矛盾：文件顺序服务 diff，页面另排。
- 范围停在静态阅读器和一个显式入库命令。调度、撤回字段、账号、新托管都不做。
- 「直接覆盖旧站」指本 PR 的内容替换。公开 URL 在合并到 `main` 之前不会变成新站。
