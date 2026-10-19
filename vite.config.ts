import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

// SharedArrayBuffer (multithreaded ffmpeg.wasm) needs these; "credentialless" keeps cross-origin downloads working.
export const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

export default defineConfig({
  base: './',
  // 4173 is taken by a cached service worker of another project on this machine
  server: { port: 4627, strictPort: true, headers: isolationHeaders },
  build: { target: 'esnext', modulePreload: { polyfill: false } },
  plugins: [
    {
      // build only: the dev server injects styles with inline <style>, which this policy forbids
      name: 'csp-meta',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`),
    },
    {
      // the GPL asks that the license travels with the app; the About panel links to both files
      name: 'license-files',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: readFileSync('LICENSE') })
        this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.md', source: readFileSync('THIRD_PARTY_NOTICES.md') })
      },
    },
  ],
  test: { include: ['tests/unit/**/*.test.ts'] },
})
