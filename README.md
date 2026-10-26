# X · AI 技巧摘录

公开静态站，收录从 X 摘下来的 AI 用法、提示词和工作流。页面支持搜索、按标签筛选，以及一键复制（复制内容带标题、正文和来源链接）。

线上地址：<https://kylin30.github.io/x-ai-tips/>

## 本地

```bash
npm ci
npm run dev
```

`npm run validate` 检查 `data/tips.json`。`npm run build` 会先校验，再把站点构建到 `dist/`。Vite 的 `base` 是 `/x-ai-tips/`，对应 GitHub Pages 的项目站点路径。

## 数据

`data/tips.json` 是唯一数据源。`version` 固定为 `1`。每条 `tips` 记录：

| 字段 | 说明 |
| --- | --- |
| `id` | 稳定标识，用 X 帖子 ID。提交信息里的 `<id>` 就是它 |
| `title` | 标题 |
| `summary` | 一两句中文摘要，显示在卡片上 |
| `body` | 可复制的要点原文 |
| `tags` | 类型和工具/模型，至少 1 个，条内不重复 |
| `author` | X 用户名，不带 `@` |
| `sourceUrl` | 原文 `https` 链接 |
| `lang` | `zh`、`en` 或 `other` |
| `quality` | `值得一看`、`备用` 或 `一般` |
| `collectedAt` | 收录日期，`YYYY-MM-DD` |

## 收录推送

1. 编辑 `data/tips.json`。新帖用帖子 ID 作为 `id`；改已有条目时保持原来的 `id`。
2. 运行 `npm run validate`。校验失败会列出每条问题，通过后才会允许构建。
3. 提交。新收录用 `收录 <id>`，修改已有条目用 `更新 <id>`。一次只放一条时，`<id>` 就是该条的 `id`。
4. 推送到 `main`：`git push origin main`。

推送后，`.github/workflows/pages.yml` 在 GitHub Actions 里安装依赖、执行 `npm run build`，并把 `dist` 发布到 GitHub Pages。Pages 的 Source 需要是 **GitHub Actions**。
