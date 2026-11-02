// OpenFinder on its own, in a Chromium browser: folders the browser grants this page (File System Access API)
// and the Sandbox, the browser's private storage (OPFS). The handles stay in here; the rest of the app only
// sees root ids and names. Saved under the same IndexedDB keys as before, so granted folders survive updates.
import { kindOf, MEDIA, prepare, previewKind, search } from './contract/library.mjs'
import { load, save } from './store'
import { checkName } from './contract/naming.mjs'
import { LibraryFailure, type Item, type Outcome, type Page, type Preview, type Provider, type Root } from './types'

export const SANDBOX = 'sandbox'
const PAGE = 200
const PREVIEW_TEXT = 256 * 1024
const PREVIEW_MEDIA = 64 * 1024 * 1024
/** Folders a search does not walk into: dependencies and build output are rarely what anyone looks for. */
const SKIP = new Set(['node_modules', 'dist', 'build', 'target', '__pycache__'])
const WALK_LIMIT = 10_000

interface Saved {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
}

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
export const mimeOf = (name: string): string | undefined => (MEDIA as Record<string, string>)[name.slice(name.lastIndexOf('.') + 1).toLowerCase()]

export async function previewFile(file: File): Promise<Preview> {
  const mime = mimeOf(file.name)
  if (mime && file.size <= PREVIEW_MEDIA) return { kind: mime.split('/')[0] as 'image' | 'audio' | 'video', mime, url: URL.createObjectURL(file.slice(0, file.size, mime)) }
  if (previewKind(file.name).kind === 'text') {
    const text = await file.slice(0, PREVIEW_TEXT).text()
    return { kind: 'text', text, truncated: file.size > PREVIEW_TEXT }
  }
  return { kind: 'none', note: mime ? 'This file is too large to preview.' : 'There is no preview for this kind of file.' }
}

export async function browserProvider() {
  const sandbox: Saved = { id: SANDBOX, name: 'Sandbox', handle: await navigator.storage.getDirectory() }
  await seedSandbox(sandbox.handle)
  // best effort: asks the browser not to evict the sandbox when the disk runs low
  navigator.storage.persist()
  let saved: Saved[] = (await load<Saved[]>('locations')) ?? []
  const locked = new Set<string>()
  for (const l of saved) if ((await l.handle.queryPermission({ mode: 'readwrite' })) !== 'granted') locked.add(l.id)
  const listeners = new Set<() => void>()
  const changed = () => listeners.forEach((l) => l())
  const persist = () => save('locations', saved)

  const all = () => [sandbox, ...saved]
  const find = (id: string) => {
    const s = all().find((l) => l.id === id)
    if (!s) throw new LibraryFailure('PERMISSION_REVOKED', 'This folder was removed from OpenFinder.')
    if (locked.has(id)) throw new LibraryFailure('PERMISSION_REVOKED', 'The browser asks for permission again after a restart.')
    return s
  }
  const dirAt = async (root: string, path: string[]) => {
    let dir = find(root).handle
    try {
      for (const name of path) dir = await dir.getDirectoryHandle(name)
    } catch (e) {
      throw new LibraryFailure('NOT_FOUND', (e as Error).name === 'NotFoundError' ? 'This folder no longer exists.' : (e as Error).message)
    }
    return dir
  }
  const fileAt = async (item: Item) => (await dirAt(item.root, item.path.slice(0, -1))).getFileHandle(item.name)
  const describe = async (handle: FileSystemHandle, root: string, path: string[]): Promise<Item> => {
    const file = handle.kind === 'file' ? await (handle as FileSystemFileHandle).getFile() : null
    return { root, path, name: handle.name, kind: handle.kind, size: file?.size ?? null, modified: file?.lastModified ?? 0, revision: file ? `${file.size}-${file.lastModified}` : undefined }
  }
  const rootInfo = (s: Saved): Root => ({ id: s.id, kind: s.id === SANDBOX ? 'sandbox' : 'folder', name: s.name, canWrite: true, available: true, locked: locked.has(s.id) })

  async function add(handle: FileSystemDirectoryHandle): Promise<Root> {
    for (const known of all()) if (await known.handle.isSameEntry(handle)) return rootInfo(known)
    const s = { id: crypto.randomUUID(), name: handle.name, handle }
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') locked.add(s.id)
    saved = [...saved, s]
    await persist()
    changed()
    return rootInfo(s)
  }

  // Every file name under the roots, walked on demand: the browser offers no index or change events.
  async function walk(roots: Saved[], signal?: AbortSignal) {
    const records: (Item & { id: string })[] = []
    const visit = async (dir: FileSystemDirectoryHandle, root: string, path: string[]): Promise<void> => {
      for await (const handle of dir.values()) {
        if (signal?.aborted || records.length >= WALK_LIMIT) return
        if (handle.name.startsWith('.')) continue
        const at = [...path, handle.name]
        const item = await describe(handle, root, at)
        records.push({ ...item, id: `${root}/${at.join('/')}`, place: path.join('/') })
        if (handle.kind === 'directory' && !SKIP.has(handle.name) && at.length < 8) await visit(handle as FileSystemDirectoryHandle, root, at)
      }
    }
    for (const r of roots) if (!locked.has(r.id)) await visit(r.handle, r.id, [])
    return records
  }

  const provider: Provider & { addHandle: typeof add; canPick: boolean } = {
    name: 'browser',
    /** False in Brave until its File System Access flag is switched on. */
    canPick: 'showDirectoryPicker' in window,
    can: (ability) =>
      ['revoke', 'search', 'preview', 'open'].includes(ability) ||
      (ability === 'choose' && 'showDirectoryPicker' in window) ||
      // Chromium renames in place with move(); without a journal there is no undo here, and the page says so
      (ability === 'rename' && 'move' in FileSystemHandle.prototype),
    views: ['all', 'files'],
    roots: async () => all().map(rootInfo),
    async chooseRoot() {
      try {
        return await add(await window.showDirectoryPicker!({ mode: 'readwrite' }))
      } catch (error) {
        // AbortError: the picker was closed without choosing
        if ((error as Error).name === 'AbortError') return null
        throw error
      }
    },
    async revokeRoot(id) {
      saved = saved.filter((l) => l.id !== id)
      locked.delete(id)
      await persist()
      changed()
    },
    /** Asks for permission again. Must run inside a click handler. */
    async unlock(id) {
      const s = all().find((l) => l.id === id)
      if (!s || (await s.handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return false
      locked.delete(id)
      changed()
      return true
    },
    async list(root, path, cursor = 0) {
      const dir = await dirAt(root, path)
      const handles: FileSystemHandle[] = []
      // names starting with a dot stay hidden, as in Finder
      for await (const handle of dir.values()) if (!handle.name.startsWith('.')) handles.push(handle)
      handles.sort((a, b) => byName.compare(a.name, b.name))
      const slice = handles.slice(cursor, cursor + PAGE)
      const items = await Promise.all(slice.map((h) => describe(h, root, [...path, h.name])))
      return { items, total: handles.length, next: cursor + slice.length < handles.length ? cursor + slice.length : null }
    },
    async search(q, _view, scope, cursor = 0, signal): Promise<Page<Item>> {
      const roots = scope ? [find(scope)] : all()
      const records = await walk(roots, signal)
      const found = search(
        records.map((r) => prepare({ ...r, kind: r.kind === 'directory' ? 'folder' : kindOf(r.name) })),
        q,
        { offset: cursor, limit: 100 },
      )
      const items = found.items as unknown as Item[]
      return { items, total: found.total, warnings: found.warnings, next: cursor + items.length < found.total ? cursor + items.length : null }
    },
    async preview(item) {
      if (item.kind !== 'file') return { kind: 'none', note: 'Folders have no preview.' }
      return previewFile(await (await fileAt(item)).getFile())
    },
    async open(item) {
      // images, sound, video, PDFs and plain text only: a page or an SVG opened from here could run script as OpenFinder
      const file = await (await fileAt(item)).getFile()
      const type = mimeOf(file.name) ?? (/\.pdf$/i.test(file.name) ? 'application/pdf' : /\.(txt|md|log|csv)$/i.test(file.name) ? 'text/plain' : null)
      if (!type) throw new LibraryFailure('UNSUPPORTED', 'OpenFinder can only open pictures, sound, video, PDFs and text in the browser.')
      const url = URL.createObjectURL(file.slice(0, file.size, type))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    async rename(renames) {
      const outcomes: Outcome[] = []
      for (const { item, name } of renames) {
        try {
          const why = checkName(item.name, name)
          if (why) throw new LibraryFailure('INVALID', why)
          const dir = await dirAt(item.root, item.path.slice(0, -1))
          const taken = await dir.getFileHandle(name).then(() => true, () => dir.getDirectoryHandle(name).then(() => true, () => false))
          if (taken && name.toLowerCase() !== item.name.toLowerCase()) throw new LibraryFailure('CONFLICT', `“${name}” already exists here. Choose another name.`)
          const handle = item.kind === 'directory' ? await dir.getDirectoryHandle(item.name) : await dir.getFileHandle(item.name)
          await (handle as unknown as { move(name: string): Promise<void> }).move(name)
          outcomes.push({ ok: true, item: { ...item, name, path: [...item.path.slice(0, -1), name] }, name })
        } catch (e) {
          outcomes.push({ ok: false, item, code: (e as LibraryFailure).code ?? 'IO_ERROR', message: (e as Error).message })
        }
      }
      changed()
      return outcomes
    },
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addHandle: add,
  }
  return provider
}

async function seedSandbox(root: FileSystemDirectoryHandle) {
  if (localStorage.getItem('sandbox-seeded')) return
  localStorage.setItem('sandbox-seeded', '1')
  for (const name of ['Documents', 'Pictures']) await root.getDirectoryHandle(name, { create: true })
  const file = await root.getFileHandle('Welcome to OpenFinder.txt', { create: true })
  const writer = await file.createWritable()
  await writer.write('The Sandbox is private storage inside this browser. Nothing here is on your disk.\nUse "Add Folder" to work with real folders.\n')
  await writer.close()
}
