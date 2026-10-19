#!/usr/bin/env node
// Serves the built app on localhost with the headers that SharedArrayBuffer needs.
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const dist = resolve(fileURLToPath(import.meta.url), '../../dist')
const args = process.argv.slice(2)
const portArg = args.indexOf('--port')
const port = Number(portArg >= 0 ? args[portArg + 1] : process.env.PORT) || 4627

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8',
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('No build found. Run "npm install" and "npm run build" first.')
  process.exit(1)
}

createServer((req, res) => {
  let file
  try {
    file = join(dist, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)))
  } catch {
    return res.writeHead(400).end('Bad request')
  }
  // never serve anything outside dist/
  if (file !== dist && !file.startsWith(dist + sep)) return res.writeHead(403).end()
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) return res.writeHead(404).end('Not found')
  res.writeHead(200, {
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache',
  })
  // the file can vanish while a rebuild is running
  createReadStream(file).on('error', () => res.destroy()).pipe(res)
}).listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`
  console.log(`OpenFinder is running at ${url} (Ctrl+C to stop). Open it in a Chromium browser.`)
  if (args.includes('--open')) {
    const opener = { darwin: 'open', win32: 'explorer' }[process.platform] ?? 'xdg-open'
    spawn(opener, [url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref()
  }
})
