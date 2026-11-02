// The Library inside Xiao. Xiao gives this page one function, window.xiao.request(), and checks every
// request again on its side (see the copied contract in ./contract/library-protocol.mjs). The page names
// folders by the ids Xiao handed out and files by plain names below them; it never sees or sends a full path.
import { PROTOCOL } from './contract/library-protocol.mjs'
import { LibraryFailure, type Ability, type Collection, type Item, type Operation, type Outcome, type Page, type Preview, type Proposal, type Provider, type Root, type View } from './types'

type Reply = { requestId: string; ok: true; revision: number; data: unknown } | { requestId: string; ok: false; code: string; message: string; retryable: boolean }

declare global {
  interface Window {
    xiao?: { request(request: unknown): Promise<Reply> }
  }
}

let count = 0
const newId = () => `r${Date.now().toString(36)}${(++count).toString(36)}`

export async function call<T>(method: string, payload: object = {}, { signal, key }: { signal?: AbortSignal; key?: string } = {}): Promise<T> {
  const requestId = newId()
  const cancel = () => window.xiao!.request({ protocol: PROTOCOL, requestId: newId(), method: 'request.cancel', payload: { request: requestId } }).catch(() => {})
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    const reply = await window.xiao!.request({ protocol: PROTOCOL, requestId, method, payload, ...(key && { key }) })
    if (signal?.aborted) throw new DOMException('The request was replaced by a newer one.', 'AbortError')
    if (!reply.ok) throw new LibraryFailure(reply.code, reply.message, reply.retryable)
    return reply.data as T
  } finally {
    signal?.removeEventListener('abort', cancel)
  }
}

const ABILITY: Record<Ability, string> = {
  choose: 'roots.choose',
  revoke: 'roots.revoke',
  search: 'search.query',
  preview: 'preview.open',
  open: 'items.open',
  reveal: 'items.reveal',
  rename: 'rename.apply',
  trash: 'trash',
  tags: 'tags.set',
  collections: 'collections.update',
  stopScan: 'roots.stopScan',
}

const ref = (item: Item) => ({ root: item.root, path: item.path, revision: item.revision })

type RawPreview = { kind: 'image' | 'audio' | 'video'; bytes: ArrayBuffer; mime: string } | { kind: 'text'; text: string; truncated: boolean } | { kind: 'none'; note: string }

export async function xiaoProvider(): Promise<Provider> {
  const caps = await call<{ protocol: number; methods: string[]; views?: View[]; theme?: string; assist?: boolean }>('capabilities')
  const methods = new Set(caps.methods)
  let generation = 0
  return {
    name: 'xiao',
    can: (ability) => methods.has(ABILITY[ability]),
    views: caps.views ?? ['all', 'files'],
    theme: caps.theme,
    assist: caps.assist === true,
    roots: () => call<Root[]>('roots.list'),
    chooseRoot: () => call<Root | null>('roots.choose'),
    async revokeRoot(id) {
      await call('roots.revoke', { root: id }, { key: newId() })
    },
    async stopScan(id) {
      await call('roots.stopScan', { root: id })
    },
    async list(root, path, cursor = 0, signal) {
      const page = await call<Page<Omit<Item, 'root' | 'path'>>>('items.list', { root, path, cursor }, { signal })
      return { ...page, items: page.items.map((i) => ({ ...i, root, path: [...path, i.name] })) }
    },
    search: (q, view, scope, cursor = 0, signal) =>
      call<Page<Item>>('search.query', { q, view, ...(scope && { scope }), cursor, generation: ++generation }, { signal }),
    async preview(item, signal) {
      const raw = await call<RawPreview>('preview.open', { item: ref(item) }, { signal })
      if (raw.kind === 'text' || raw.kind === 'none') return raw
      return { kind: raw.kind, mime: raw.mime, url: URL.createObjectURL(new Blob([raw.bytes], { type: raw.mime })) } satisfies Preview
    },
    open: async (item) => void (await call('items.open', { item: ref(item) })),
    reveal: async (item) => void (await call('items.reveal', { item: ref(item) })),
    async setTags(item, tags) {
      await call('tags.set', { item: ref(item), tags }, { key: newId() })
    },
    collections: () => call<Collection[]>('collections.list'),
    async updateCollection(op, { collection, name, items }) {
      const r = await call<{ id: string }>('collections.update', { op, collection, name, items: items?.map(ref) }, { key: newId() })
      return r.id
    },
    async saveSearch(name, q) {
      return (await call<{ id: string }>('searches.save', { name, q }, { key: newId() })).id
    },
    async proposeNames(items, { ai = false } = {}) {
      const found = await call<(Omit<Proposal, 'item'> & { item: { root: string; path: string[]; revision: string } })[]>('rename.preview', { items: items.map(ref), ai })
      return found.map((p, i) => ({ ...p, item: { ...items[i], revision: p.item.revision } }))
    },
    async rename(renames) {
      const r = await call<{ results: (Outcome & { item: { root: string; path: string[] } })[] }>(
        'rename.apply',
        { renames: renames.map(({ item, name }) => ({ item: ref(item), name })) },
        { key: newId() },
      )
      return r.results.map((o, i) => ({ ...o, item: { ...renames[i].item, ...(o.ok && { path: o.item.path, name: o.name! }) } }))
    },
    async undo(operation) {
      await call('operations.undo', { operation }, { key: newId() })
    },
    operations: () => call<Operation[]>('operations.list'),
    async trash(items) {
      const r = await call<{ results: Outcome[] }>('trash', { items: items.map(ref) }, { key: newId() })
      return r.results.map((o, i) => ({ ...o, item: items[i] }))
    },
    async restoreTab(entry) {
      await call('archive.restore', { entry }, { key: newId() })
    },
    async clearArchive() {
      await call('archive.clear', {}, { key: newId() })
    },
    onChange(listener) {
      addEventListener('xiao-library-changed', listener)
      return () => removeEventListener('xiao-library-changed', listener)
    },
  }
}
