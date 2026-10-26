import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const tipsPath = resolve('data/tips.json')

function publishTipsJson() {
  return {
    name: 'publish-tips-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'data/tips.json',
        source: readFileSync(tipsPath, 'utf8'),
      })
    },
  }
}

export default defineConfig({
  base: '/x-ai-tips/',
  plugins: [publishTipsJson()],
})
