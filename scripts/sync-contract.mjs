// Copies the Library contract from Xiao (MPL-2.0): the protocol, the search language and the naming rules.
// Xiao owns these files; OpenFinder only ever copies them, so the two cannot drift apart unnoticed.
//   XIAO=/path/to/xiao node scripts/sync-contract.mjs            copy (default: ../xiao)
//   XIAO=/path/to/xiao node scripts/sync-contract.mjs --check    fail when a copy differs from Xiao's file
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const FILES = ['library-protocol.mjs', 'library.mjs', 'naming.mjs']
const xiao = resolve(process.env.XIAO ?? '../xiao')
const check = process.argv.includes('--check')
const sha = (text) => createHash('sha256').update(text).digest('hex')
const errors = []
for (const name of FILES) {
  const from = join(xiao, 'core/lib', name)
  if (!existsSync(from)) continue
  const text = readFileSync(from, 'utf8')
  const copy = `// Copied from Xiao core/lib/${name}, sha256 ${sha(text)}. Do not edit: run npm run contract.\n${text}`
  const to = join('src/fs/contract', name)
  if (check) {
    if (!existsSync(to) || readFileSync(to, 'utf8') !== copy) errors.push(`${to} differs from ${from}`)
  } else writeFileSync(to, copy)
}
if (errors.length) {
  console.error(`${errors.join('\n')}\nRun "npm run contract".`)
  process.exit(1)
}
console.log(check ? 'The Library contract matches Xiao.' : `Library contract copied from ${xiao}`)
