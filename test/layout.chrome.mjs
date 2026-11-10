import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import puppeteer from 'puppeteer-core'

const artifactDir = process.env.ARTIFACT_DIR || '/opt/cursor/artifacts'
const chromePath = process.env.CHROME_PATH || '/usr/local/bin/google-chrome'
const port = 4173
const origin = `http://127.0.0.1:${port}/x-ai-tips/`

function startPreview() {
  const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let logs = ''
  child.stdout.on('data', (chunk) => {
    logs += chunk
  })
  child.stderr.on('data', (chunk) => {
    logs += chunk
  })
  return {
    child,
    readLogs: () => logs,
    stop() {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch (error) {
        console.error('停止预览服务器失败', error)
        child.kill('SIGTERM')
      }
    },
  }
}

async function waitForPreview(readLogs) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin)
      if (response.ok) return
    } catch {
      // preview is still starting
    }
    await delay(200)
  }
  throw new Error(`预览服务器没有在 4173 端口就绪。\n${readLogs()}`)
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  if (overflow > 1) throw new Error(`${label} 出现横向溢出 ${overflow}px`)
}

async function openFirst(page) {
  await page.waitForSelector('button[class*="reader-open-"]')
  await page.click('button[class*="reader-open-"]')
  await page.waitForSelector('article[class*="reader-detail-"]')
}

const preview = startPreview()
mkdirSync(artifactDir, { recursive: true })
let browser
try {
  await waitForPreview(preview.readLogs)
  browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await page.goto(origin, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => document.body.textContent.includes('OpenAI 发布 Control Room'))
  const mobileTitles = await page.$$eval('button[class*="reader-open-"]', (nodes) => nodes.map((node) => node.textContent))
  if (mobileTitles.length !== 5) throw new Error(`移动列表应有 5 条，实际 ${mobileTitles.length}`)
  if (!mobileTitles[0].includes('Control Room')) throw new Error('移动列表第一条不是最新的 OpenAI 新闻')
  const mobileStatus = await page.$eval('[role="status"]', (node) => node.textContent)
  if (!mobileStatus.includes('2026-11-10 08:35')) throw new Error(`最近更新时间不正确：${mobileStatus}`)
  if (!mobileStatus.includes('可能过期') && !mobileStatus.includes('更新窗口')) {
    throw new Error(`缺少新鲜度说明：${mobileStatus}`)
  }
  await assertNoOverflow(page, '移动列表')
  await page.screenshot({ path: `${artifactDir}/reader_mobile_list.png`, fullPage: true })

  await openFirst(page)
  const listHidden = await page.$eval('[class*="reader-list-"]', (node) => getComputedStyle(node).display === 'none')
  if (!listHidden) throw new Error('窄屏打开详情后列表仍然占据版面')
  const detailText = await page.$eval('article[class*="reader-detail-"]', (node) => node.textContent)
  if (!detailText.includes('Control Room') || !detailText.includes('X 原文')) {
    throw new Error('移动详情缺少标题或来源')
  }
  await assertNoOverflow(page, '移动详情')
  await page.screenshot({ path: `${artifactDir}/reader_mobile_detail.png`, fullPage: true })

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`${origin}#/item/${encodeURIComponent('2119913172039868579')}`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('article[class*="reader-detail-"]')
  const desktop = await page.evaluate(() => ({
    list: getComputedStyle(document.querySelector('[class*="reader-list-"]')).display,
    detail: getComputedStyle(document.querySelector('article[class*="reader-detail-"]')).display,
    columns: getComputedStyle(document.querySelector('[class*="reader-layout-"]')).gridTemplateColumns,
  }))
  if (desktop.list === 'none' || desktop.detail === 'none') throw new Error(`桌面没有同时显示列表和详情：${JSON.stringify(desktop)}`)
  if (!desktop.columns.includes(' ')) throw new Error(`桌面布局不是两栏：${desktop.columns}`)
  await assertNoOverflow(page, '桌面')
  await page.screenshot({ path: `${artifactDir}/reader_desktop.png`, fullPage: true })

  await page.select('select[data-filter="vendor"]', 'Anthropic')
  await page.select('select[data-filter="stars"]', '5')
  await page.waitForFunction(() => document.querySelectorAll('button[class*="reader-open-"]').length === 1)
  const filtered = await page.$eval('button[class*="reader-open-"]', (node) => node.textContent)
  if (!filtered.includes('Claude Fable')) throw new Error(`筛选结果不正确：${filtered}`)
  const widths = await page.evaluate(() => {
    const layout = document.querySelector('[class*="reader-layout-"]').getBoundingClientRect().width
    const list = document.querySelector('[class*="reader-list-"]').getBoundingClientRect().width
    return { layout, list }
  })
  if (widths.list < widths.layout - 8) {
    throw new Error(`没有详情时列表仍留在窄栏：${JSON.stringify(widths)}`)
  }
  await page.$eval('input[data-filter="query"]', (node) => {
    node.value = '定价'
    node.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(
    () => document.querySelectorAll('button[class*="reader-open-"]').length === 1 &&
      document.querySelector('button[class*="reader-open-"]').textContent.includes('Claude Fable'),
  )
  await assertNoOverflow(page, '桌面筛选')
  await page.screenshot({ path: `${artifactDir}/reader_desktop_filtered.png`, fullPage: true })
  console.log('宽度检查通过：390 与 1440')
} finally {
  if (browser) {
    await Promise.race([browser.close(), delay(4000)])
    const chrome = browser.process()
    if (chrome && chrome.exitCode === null) chrome.kill('SIGKILL')
  }
  preview.stop()
}
