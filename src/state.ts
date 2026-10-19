import { computed, effect, signal } from '@preact/signals'
import { handleFs, type Entry } from './fs/adapter'
import { load, save } from './fs/store'
import { goBack, goForward, visit, type History } from './finder/history'

export interface Location {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
}
export interface Place {
  loc: string
  path: string[]
}
export interface Favorite extends Place {
  name: string
}
type Listing = { state: 'loading' } | { state: 'ready'; entries: Entry[] } | { state: 'locked' } | { state: 'error'; message: string }

export const SANDBOX = 'sandbox'
/** False in Brave until its File System Access flag is switched on. */
export const canPickFolders = 'showDirectoryPicker' in window

export const locations = signal<Location[]>([])
/** Locations whose permission has to be granted again, which browsers require after a restart. */
export const locked = signal<ReadonlySet<string>>(new Set())
export const favorites = signal<Favorite[]>([])
export const history = signal<History<Place>>({ back: [], current: { loc: SANDBOX, path: [] }, forward: [] })
export const place = computed(() => history.value.current)
export const listing = signal<Listing>({ state: 'loading' })
export const selected = signal<string | null>(null)
export const problem = signal<string | null>(null)

export const locationOf = (id: string) => locations.value.find((l) => l.id === id)
export const title = computed(() => place.value.path.at(-1) ?? locationOf(place.value.loc)?.name ?? '')
export const samePlace = (a: Place, b: Place) => a.loc === b.loc && a.path.join('/') === b.path.join('/')

export function go(to: Place) {
  if (!samePlace(to, place.value)) history.value = visit(history.value, to)
}
export const back = () => (history.value = goBack(history.value))
export const forward = () => (history.value = goForward(history.value))

const persistLocations = () => save('locations', locations.value.filter((l) => l.id !== SANDBOX))
const persistFavorites = () => save('favorites', favorites.value)

async function addLocation(handle: FileSystemDirectoryHandle) {
  for (const known of locations.value) if (await known.handle.isSameEntry(handle)) return go({ loc: known.id, path: [] })
  const location = { id: crypto.randomUUID(), name: handle.name, handle }
  if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') locked.value = new Set([...locked.value, location.id])
  locations.value = [...locations.value, location]
  await persistLocations()
  go({ loc: location.id, path: [] })
}

/** Opens the browser's folder picker. Only call when canPickFolders is true. */
export async function pickFolder() {
  try {
    await addLocation(await window.showDirectoryPicker!({ mode: 'readwrite' }))
  } catch (error) {
    // AbortError: the picker was closed without choosing
    if ((error as Error).name !== 'AbortError') problem.value = (error as Error).message
  }
}

/** Folders dropped from the operating system become locations. */
export async function addDropped(items: DataTransferItemList) {
  // all handles must be requested before the first await: the browser empties the list afterwards
  const pending = [...items].map((item) => item.getAsFileSystemHandle?.())
  for (const handle of await Promise.all(pending)) if (handle?.kind === 'directory') await addLocation(handle as FileSystemDirectoryHandle)
}

/** Asks for permission again. Must run inside a click handler. */
export async function unlock(id: string) {
  const state = await locationOf(id)!.handle.requestPermission({ mode: 'readwrite' })
  if (state === 'granted') locked.value = new Set([...locked.value].filter((other) => other !== id))
}

export function removeLocation(id: string) {
  locations.value = locations.value.filter((l) => l.id !== id)
  favorites.value = favorites.value.filter((f) => f.loc !== id)
  const { back, current, forward } = history.value
  const keep = (p: Place) => p.loc !== id
  history.value = { back: back.filter(keep), current: keep(current) ? current : { loc: SANDBOX, path: [] }, forward: forward.filter(keep) }
  persistLocations()
  persistFavorites()
}

export const isFavorite = (p: Place) => favorites.value.some((f) => samePlace(f, p))

export function addFavorite(p: Place) {
  if (isFavorite(p)) return
  favorites.value = [...favorites.value, { ...p, name: p.path.at(-1) ?? locationOf(p.loc)?.name ?? '' }]
  persistFavorites()
}

export function removeFavorite(p: Place) {
  favorites.value = favorites.value.filter((f) => !samePlace(f, p))
  persistFavorites()
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

export async function init() {
  const last: Place | null = JSON.parse(localStorage.getItem('place') ?? 'null')
  const sandbox = { id: SANDBOX, name: 'Sandbox', handle: await navigator.storage.getDirectory() }
  await seedSandbox(sandbox.handle)
  // best effort: asks the browser not to evict the sandbox when the disk runs low
  navigator.storage.persist()
  const saved = (await load<Location[]>('locations')) ?? []
  const needGrant = new Set<string>()
  for (const l of saved) if ((await l.handle.queryPermission({ mode: 'readwrite' })) !== 'granted') needGrant.add(l.id)
  favorites.value = (await load<Favorite[]>('favorites')) ?? []
  locked.value = needGrant
  locations.value = [sandbox, ...saved]
  const start = last && locationOf(last.loc) ? last : { loc: saved[0]?.id ?? SANDBOX, path: [] }
  history.value = { back: [], current: start, forward: [] }

  effect(() => localStorage.setItem('place', JSON.stringify(place.value)))

  // load the folder whenever the place, its location or its permission changes
  effect(() => {
    const { loc, path } = place.value
    const location = locationOf(loc)
    selected.value = null
    if (!location) return
    if (locked.value.has(loc)) {
      listing.value = { state: 'locked' }
      return
    }
    listing.value = { state: 'loading' }
    let stale = false
    handleFs(location.handle)
      .list(path)
      .then(
        (entries) => stale || (listing.value = { state: 'ready', entries }),
        (error: Error) =>
          stale || (listing.value = { state: 'error', message: error.name === 'NotFoundError' ? 'This folder no longer exists.' : error.message }),
      )
    return () => {
      stale = true
    }
  })
}

/** Glass slider, as in macOS 27: 0.2 is clear, 1 is fully tinted. */
export const glassTint = signal(Number(localStorage.getItem('glass-tint')) || 0.62)
effect(() => {
  document.documentElement.style.setProperty('--glass-tint', String(glassTint.value))
  localStorage.setItem('glass-tint', String(glassTint.value))
})

/** True when the window fills the tab instead of floating. */
export const zoomed = signal(localStorage.getItem('zoomed') === '1')
effect(() => localStorage.setItem('zoomed', zoomed.value ? '1' : '0'))
