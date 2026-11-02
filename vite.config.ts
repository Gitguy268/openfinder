import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { PROTOCOL } from './src/fs/contract/library-protocol.mjs'

// SharedArrayBuffer (multithreaded ffmpeg.wasm) needs these; "credentialless" keeps cross-origin downloads working.
export const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

const policy = (rules: string[]) => rules.join('; ')
const csp = {
  // the standalone app, served by bin/openfinder.mjs
  standalone: policy([
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
  ]),
  // the Library inside Xiao: no frames at all, so no file's content can run as a page
  xiao: policy([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ]),
}

const sha = (text: string | Buffer) => createHash('sha256').update(text).digest('hex')

export default defineConfig(({ mode }) => {
  const xiao = mode === 'xiao'
  return {
    base: './',
    define: { 'import.meta.env.XIAO_BUILD': JSON.stringify(xiao) },
    // 4173 is taken by a cached service worker of another project on this machine
    server: { port: 4627, strictPort: true, headers: isolationHeaders },
    build: { target: 'esnext', modulePreload: { polyfill: false }, outDir: xiao ? 'dist-xiao' : 'dist' },
    plugins: [
      {
        // build only: the dev server injects styles with inline <style>, which this policy forbids
        name: 'csp-meta',
        apply: 'build',
        transformIndexHtml: (html: string) =>
          html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${xiao ? csp.xiao : csp.standalone}" />`),
      },
      {
        // the GPL asks that the license travels with the app; the About panel links to both files
        name: 'license-files',
        apply: 'build',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: readFileSync('LICENSE') })
          this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.md', source: readFileSync('THIRD_PARTY_NOTICES.md') })
          if (!xiao) return
          // what Xiao's pack builder checks before it takes this build: the protocol and the copied contract
          const contract = ['library-protocol.mjs', 'library.mjs', 'naming.mjs'].flatMap((name) => {
            try {
              return [[name, readFileSync(`src/fs/contract/${name}`, 'utf8').match(/sha256 ([0-9a-f]{64})/)![1]]]
            } catch {
              return []
            }
          })
          const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
          const tokens = readFileSync('src/theme/xiao-tokens.css', 'utf8').match(/sha256 ([0-9a-f]{64})/)![1]
          this.emitFile({
            type: 'asset',
            fileName: 'openfinder-build.json',
            source: JSON.stringify({ name: 'openfinder', version, protocol: PROTOCOL, contract: Object.fromEntries(contract), tokens, notices: sha(readFileSync('THIRD_PARTY_NOTICES.md')) }, null, 1),
          })
        },
      },
    ],
    test: { include: ['tests/unit/**/*.test.ts'] },
  }
})
