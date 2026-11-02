import { expect, test } from 'vitest'
import { VIEWS } from '../../src/fs/contract/library-protocol.mjs'
import protocol from '../../src/fs/contract/library-protocol.mjs?raw'
import library from '../../src/fs/contract/library.mjs?raw'
import naming from '../../src/fs/contract/naming.mjs?raw'
import { VIEW_NAMES } from '../../src/fs/views'

const sha256 = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('')

// The contract is copied from Xiao (npm run contract); a copy edited by hand would quietly disagree with Xiao.
test('the copied contract is unchanged since it was copied', async () => {
  for (const text of [protocol, library, naming]) {
    const [header, ...rest] = text.split('\n')
    expect(await sha256(rest.join('\n'))).toBe(header.match(/sha256 ([0-9a-f]{64})/)![1])
  }
})

test('every sidebar section is a part of the Library Xiao can search', () => {
  expect(Object.keys(VIEW_NAMES).sort()).toEqual([...VIEWS].sort())
})
