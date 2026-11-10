import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const feedPath = resolve('data/reader-feed.json')

function readerFeed() {
  const serve = (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url !== '/data/reader-feed.json' && url !== '/x-ai-tips/data/reader-feed.json') {
      next()
      return
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(readFileSync(feedPath))
  }
  return {
    name: 'reader-feed',
    configureServer(server) {
      server.middlewares.use(serve)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'data/reader-feed.json',
        source: readFileSync(feedPath, 'utf8'),
      })
    },
  }
}

export default defineConfig({
  base: '/x-ai-tips/',
  plugins: [readerFeed()],
})
