# 大模型官方新闻

公开静态阅读页，只展示已经核验过的厂商公开新闻。本站整理这些信息，不是 OpenAI、Anthropic、Meta、Mistral、百度或任何其他厂商的官方网站。

线上地址仍是 <https://kylin30.github.io/x-ai-tips/>。这份阅读器要在变更进入 `main` 之后，才会替换现在的旧页面。

## 本地

```bash
npm ci
npm test
npm run dev
```

`npm run validate` 检查 `data/reader-feed.json`。`npm run build` 会先跑测试和校验，再把站点构建到 `dist/`。Vite 的 `base` 是 `/x-ai-tips/`。

## 页面

新闻按发布时间从新到旧排列。`published_at` 为 null 时显示「未知」，并排在所有已知发布时间之后。时间和「最近更新」都换算成上海时区。

可以按厂商、上海日历日和最低星级筛选，也可以搜索标题、摘要、正文、厂商、状态、理由、核验说明和来源。列表点进详情。已读标记只存在这台浏览器的 `localStorage`，没有账号。

最近更新超过 30 分钟会标明可能过期，条目仍在。更新时间超前超过 5 分钟、文件打不开或结构不合法时，只显示错误，不渲染新闻。

## 数据

`data/reader-feed.json` 是唯一公开内容。当前文件就是最初提供的 5 条已核验新闻。不要把合同、证据、日志、绝对路径或密钥放进这个文件。

## 入库

采集程序在另一台机器上写完整公开 JSON。本仓库和 GitHub Actions 都读不到那台机器。这里没有定时任务，也没有外部 feed 地址。

父级拿到新的脱敏公开 JSON 后，可以在仓库根目录运行：

```bash
node scripts/ingest-feed.mjs --input <公开 reader-feed.json 的路径>
```

命令会按 `id` 和 `event_key` 与现有文件合并，保留修订，并用临时文件原子替换 `data/reader-feed.json`。校验失败时不会改目标文件。`--output` 必须留在当前仓库内。

然后提交并推送到 `main`。现有 `.github/workflows/pages.yml` 会在推送到 `main` 时构建并发布到 GitHub Pages。按目前仓库历史，数据更新不需要为每一次单独走人工合并；如果 `main` 后来被保护规则拦住，推送会失败，那一次更新就得改走 Pull Request。

这条命令本身不会每 10 分钟运行。把调度或「文件已经写在采集机上」说成站点已经自动更新，是不成立的。
