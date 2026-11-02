import { batch, computed, effect, signal } from '@preact/signals'
import { goBack, goForward, visit, type History } from './library/history'
import { load, save } from './fs/store'
import { VIEW_NAMES } from './fs/views'
import { LibraryFailure, type Collection, type Item, type Outcome, type Provider, type Root, type View } from './fs/types'

/** Where the content area is: a part of the Library, or a folder inside a root. */
export interface Place {
  view: View | 'folder'
  root?: string
  path?: string[]
  /** In the Collections view: one collection or saved search. */
  collection?: string
}
export interface Pin {
  root: string
  path: string[]
  name: string
}
export type Listing =
  | { state: 'loading' }
  | { state: 'ready'; items: Item[]; total: number; next: number | null; warnings: string[]; searching: boolean }
  | { state: 'locked'; root: string }
  | { state: 'unavailable'; message: string }
  | { state: 'error'; message: string }

export const provider = signal<Provider>(null as unknown as Provider)
export const roots = signal<Root[]>([])
export const collections = signal<Collection[]>([])
export const pins = signal<Pin[]>([])
export const history = signal<History<Place>>({ back: [], current: { view: 'all' }, forward: [] })
export const place = computed(() => history.value.current)
export const query = signal('')
export const listing = signal<Listing>({ state: 'loading' })
export const selected = signal<number | null>(null)
export const problem = signal<string | null>(null)
export const layout = signal<'list' | 'grid'>(localStorage.getItem('layout') === 'grid' ? 'grid' : 'list')
export const previewOpen = signal(localStorage.getItem('preview') !== 'closed')
export const theme = signal(localStorage.getItem('theme') ?? 'auto')
/** Bumped when the provider reports a change, so the current listing loads again. */
const version = signal(0)

export const rootOf = (id?: string) => roots.value.find((r) => r.id === id)
/** The folders shown under Folders: chosen ones and the Sandbox, not single downloads or the notes folder. */
export const folders = computed(() => roots.value.filter((r) => r.kind !== 'file' && (r.source ?? 'files') === 'files'))
export const selectedItem = computed(() => {
  const l = listing.value
  return l.state === 'ready' && selected.value !== null ? (l.items[selected.value] ?? null) : null
})

export { VIEW_NAMES } from './fs/views'
export const collectionOf = (id?: string) => collections.value.find((c) => c.id === id)
export const title = computed(() => {
  const p = place.value
  if (p.view === 'collections' && p.collection) return collectionOf(p.collection)?.name ?? VIEW_NAMES.collections
  if (p.view !== 'folder') return VIEW_NAMES[p.view]
  return p.path?.at(-1) ?? rootOf(p.root)?.name ?? ''
})
/** What the search box searches, said in the box itself. */
export const scopeLabel = computed(() => {
  const p = place.value
  if (p.view === 'folder') return `Search “${rootOf(p.root)?.name ?? 'this folder'}”`
  if (p.view === 'all' || p.view === 'files') return provider.value?.name === 'xiao' ? 'Search the Library' : 'Search all folders'
  return `Search ${VIEW_NAMES[p.view]}`
})

export const samePlace = (a: Place, b: Place) =>
  a.view === b.view && a.root === b.root && a.collection === b.collection && (a.path ?? []).join('/') === (b.path ?? []).join('/')
export function go(to: Place) {
  if (samePlace(to, place.value)) return
  batch(() => {
    history.value = visit(history.value, to)
    query.value = ''
  })
}
export const back = () => (history.value = goBack(history.value))
export const forward = () => (history.value = goForward(history.value))
export const up = () => {
  const p = place.value
  if (p.view === 'folder' && p.path?.length) go({ ...p, path: p.path.slice(0, -1) })
}

export async function refreshRoots() {
  const prov = provider.value
  const [r, c] = await Promise.all([prov.roots(), prov.can('collections') && prov.collections ? prov.collections() : Promise.resolve([])])
  batch(() => {
    roots.value = r
    collections.value = c
  })
}

/** Runs a change through the provider and reports a failure in words, not a stack. */
async function attempt<T>(change: () => Promise<T>): Promise<T | undefined> {
  try {
    const result = await change()
    await refreshRoots()
    version.value++
    return result
  } catch (e) {
    problem.value = (e as Error).message
  }
}

export const setTags = (item: Item, tags: string[]) => attempt(() => provider.value.setTags!(item, tags))
export const newCollection = (name: string, items: Item[] = []) => attempt(() => provider.value.updateCollection!('create', { name, items }))
export const addToCollection = (collection: string, items: Item[]) => attempt(() => provider.value.updateCollection!('add', { collection, items }))
export const removeFromCollection = (collection: string, items: Item[]) => attempt(() => provider.value.updateCollection!('remove', { collection, items }))
export async function deleteCollection(collection: string) {
  await attempt(() => provider.value.updateCollection!('delete', { collection }))
  if (place.value.collection === collection) go({ view: 'collections' })
}
/** The last change, with a way to take it back, shown at the foot of the window. */
export const toast = signal<{ text: string; undo?: () => Promise<void> } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined
export function say(text: string, undo?: () => Promise<void>) {
  clearTimeout(toastTimer)
  toast.value = { text, undo }
  toastTimer = setTimeout(() => (toast.value = null), 10_000)
}

const undoAll = (outcomes: Outcome[]) => async () => {
  toast.value = null
  for (const o of [...outcomes].reverse()) if (o.ok && o.operation) await attempt(() => provider.value.undo!(o.operation!))
  say(outcomes.length === 1 ? 'Undone.' : 'All undone.')
}

/** Renames, then says what happened to each file, with undo for those that changed. */
export async function rename(renames: { item: Item; name: string }[]) {
  const outcomes = await attempt(() => provider.value.rename!(renames))
  if (!outcomes) return
  const done = outcomes.filter((o) => o.ok)
  const failed = outcomes.filter((o) => !o.ok)
  const undo = done.length && provider.value.undo ? undoAll(done) : undefined
  if (renames.length === 1) {
    if (failed.length) problem.value = failed[0].message ?? 'The file could not be renamed.'
    else say(`Renamed to “${done[0].name}”.`, undo)
  } else {
    say(`${done.length} renamed${failed.length ? `, ${failed.length} left as they were (${failed[0].message})` : ''}.`, undo)
  }
  return outcomes
}

export async function trash(items: Item[]) {
  const outcomes = await attempt(() => provider.value.trash!(items))
  if (!outcomes) return
  const failed = outcomes.filter((o) => !o.ok)
  if (failed.length) problem.value = failed[0].message ?? 'The file could not be moved to the Trash.'
  const done = outcomes.length - failed.length
  if (done) say(`${done === 1 ? `“${items[0].name}”` : `${done} items`} moved to the Trash. Put ${done === 1 ? 'it' : 'them'} back from the Trash if you change your mind.`)
}

export async function saveSearch(name: string) {
  const id = await attempt(() => provider.value.saveSearch!(name, query.value.trim()))
  if (id) go({ view: 'collections', collection: id })
}

export async function chooseFolder() {
  try {
    const root = await provider.value.chooseRoot()
    if (!root) return
    await refreshRoots()
    go({ view: 'folder', root: root.id, path: [] })
  } catch (e) {
    problem.value = (e as Error).message
  }
}

export async function removeRoot(id: string) {
  await provider.value.revokeRoot(id)
  pins.value = pins.value.filter((p) => p.root !== id)
  savePins()
  const keep = (p: Place) => p.root !== id
  const { back, current, forward } = history.value
  history.value = { back: back.filter(keep), current: keep(current) ? current : { view: 'all' }, forward: forward.filter(keep) }
  await refreshRoots()
}

/** Asks for a folder's permission again. Must run inside a click handler. */
export async function unlock(id: string) {
  if (await provider.value.unlock?.(id)) {
    await refreshRoots()
    version.value++
  }
}

const savePins = () => save('favorites', pins.value)
export const isPinned = (p: Place) => pins.value.some((f) => f.root === p.root && f.path.join('/') === (p.path ?? []).join('/'))
export function pin(p: Place) {
  if (p.view !== 'folder' || !p.root || isPinned(p)) return
  pins.value = [...pins.value, { root: p.root, path: p.path ?? [], name: p.path?.at(-1) ?? rootOf(p.root)?.name ?? '' }]
  savePins()
}
export function unpin(p: Pin) {
  pins.value = pins.value.filter((f) => !(f.root === p.root && f.path.join('/') === p.path.join('/')))
  savePins()
}

/** A collection shown as an item in the Collections view; opening it shows its members. */
const collectionItem = (c: Collection): Item => ({ root: c.id, path: [], name: c.name, kind: 'directory', size: null, modified: 0, source: 'collection' })

/** A root shown as an item, for the overview of all folders. */
const rootItem = (r: Root): Item => ({ root: r.id, path: [], name: r.name, kind: r.kind === 'file' ? 'file' : 'directory', size: null, modified: 0, place: r.place })

let loader: AbortController | null = null

async function load_(p: Place, q: string, cursor: number, signal: AbortSignal) {
  const prov = provider.value
  if (q && prov.can('search') && p.view !== 'collections') return { ...(await prov.search(q, p.view === 'folder' ? 'files' : p.view, p.view === 'folder' ? (p.root ?? null) : null, cursor, signal)), searching: true }
  if (p.view === 'folder') return { ...(await prov.list(p.root!, p.path ?? [], cursor, signal)), warnings: [], searching: false }
  if (p.view === 'collections') {
    // one collection: its members, or for a saved search what matches it now
    if (p.collection) return { ...(await prov.search(q, 'collections', p.collection, cursor, signal)), searching: !!q }
    const items = collections.value.map(collectionItem)
    return { items, total: items.length, next: null, warnings: [], searching: false }
  }
  // a part of the Library: what the provider indexes, or else the folders themselves
  if (prov.name === 'xiao' && prov.can('search') && p.view !== 'files') return { ...(await prov.search('', p.view, null, cursor, signal)), searching: false }
  const items = folders.value.map(rootItem)
  return { items, total: items.length, next: null, warnings: [], searching: false }
}

function failed(e: unknown, p: Place): Listing {
  const error = e as LibraryFailure
  if (error.code === 'PERMISSION_REVOKED' && rootOf(p.root)?.locked) return { state: 'locked', root: p.root! }
  if (error.code === 'UNAVAILABLE') return { state: 'unavailable', message: error.message }
  return { state: 'error', message: error.message || 'This could not be shown.' }
}

/** The next page of results, when the list is scrolled to its end. */
export async function more() {
  const l = listing.value
  if (l.state !== 'ready' || l.next === null || !loader) return
  const signal = loader.signal
  const p = place.value
  try {
    const page = await load_(p, query.value.trim(), l.next, signal)
    if (signal.aborted || listing.value !== l) return
    listing.value = { ...l, items: [...l.items, ...page.items], next: page.next }
  } catch (e) {
    if ((e as Error).name !== 'AbortError') problem.value = (e as Error).message
  }
}

export async function init(prov: Provider) {
  provider.value = prov
  await refreshRoots()
  pins.value = (await load<Pin[]>('favorites'))?.filter((p) => 'root' in p) ?? []
  const last: Place | null = JSON.parse(localStorage.getItem('place') ?? 'null')
  const start: Place = last && (last.view !== 'folder' || rootOf(last.root)) ? last : { view: 'all' }
  history.value = { back: [], current: start, forward: [] }
  prov.onChange(() => refreshRoots().then(() => version.value++))

  effect(() => localStorage.setItem('place', JSON.stringify(place.value)))
  effect(() => localStorage.setItem('layout', layout.value))
  effect(() => localStorage.setItem('preview', previewOpen.value ? 'open' : 'closed'))
  effect(() => {
    localStorage.setItem('theme', theme.value)
    const t = prov.theme && prov.theme !== 'auto' ? prov.theme : theme.value
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
    else delete document.documentElement.dataset.theme
  })

  // Loads the place or the search whenever either changes. A newer request cancels the older one, and a
  // late answer to an old request is dropped, so typing fast never shows the results of an earlier word.
  // A new place or search clears the selection. A background change that reloads the same list keeps the
  // selected item (found again by root and path, never by row number) or clears it when the item is gone.
  let shown = ''
  effect(() => {
    const p = place.value
    const q = query.value.trim()
    void version.value
    void roots.value
    const key = JSON.stringify([p, q])
    const keep = key === shown ? selectedItem.peek() : null
    if (!keep) selected.value = null
    shown = key
    loader?.abort()
    const ctl = (loader = new AbortController())
    if (!q) listing.value = { state: 'loading' }
    const timer = setTimeout(
      () =>
        load_(p, q, 0, ctl.signal).then(
          (page) => {
            if (ctl.signal.aborted) return
            listing.value = { state: 'ready', warnings: [], ...page }
            if (keep) {
              const at = page.items.findIndex((i) => i.root === keep.root && i.path.join('/') === keep.path.join('/'))
              selected.value = at < 0 ? null : at
            }
          },
          (e) => ctl.signal.aborted || (e as Error).name === 'AbortError' || (listing.value = failed(e, p)),
        ),
      q ? 120 : 0,
    )
    return () => clearTimeout(timer)
  })
}
