// What OpenFinder can ask of the place its files come from. Two providers implement it:
// - handles.ts: the folders a Chromium browser grants a web page, and the browser's private storage;
// - xiao.ts: the Library inside Xiao, which reaches files through Xiao itself.
// A provider says what it can do; the interface shows only those actions, never a control that fakes success.

/** The parts of the Library a provider can show in the sidebar. */
export type View = 'all' | 'downloads' | 'files' | 'notes' | 'tabs' | 'archive' | 'collections'

export interface Root {
  id: string
  kind: 'folder' | 'file' | 'sandbox'
  name: string
  /** Where it is, for people: "~/Documents/Taxes". Not used to find files. */
  place?: string
  canWrite: boolean
  available: boolean
  /** What the root holds: 'files' for a chosen folder, 'downloads' for one downloaded file, 'notes' for the notes folder. */
  source?: string
  /** The browser asks again after a restart; one click in the page brings access back. */
  locked?: boolean
  /** Xiao is reading this folder into the Library now. */
  scanning?: boolean
}

export interface Item {
  root: string
  path: string[]
  name: string
  /** 'tab': an archived tab (Xiao); opening it restores the tab. */
  kind: 'file' | 'directory' | 'link' | 'tab'
  size: number | null
  modified: number
  /** What the item looked like when listed, so a change made since is caught before acting on it. */
  revision?: string
  source?: string
  originalName?: string
  tags?: string[]
  /** Why a search found it: "name", "earlier name or title", "tag", "text". */
  reason?: string
  /** Where it is, shown in search results. */
  place?: string
  missing?: boolean
}

export interface Page<T> {
  items: T[]
  total: number
  next: number | null
  warnings?: string[]
}

export type Preview =
  | { kind: 'image' | 'audio' | 'video'; url: string; mime: string }
  | { kind: 'text'; text: string; truncated: boolean }
  | { kind: 'none'; note: string }

export interface Collection {
  id: string
  name: string
  /** A saved search: the collection is whatever matches it now. */
  query: string | null
  size: number
}

export interface Proposal {
  item: Item
  originalName: string
  /** null: the rules found nothing better to call it. */
  proposedName: string | null
  reasons: string[]
  warnings: string[]
  /** 'local-model' when Xiao's local AI suggested it. */
  source?: string
}

export interface Outcome {
  ok: boolean
  item: Item
  name?: string
  operation?: string
  code?: string
  message?: string
}

export interface Operation {
  id: string
  kind: 'rename' | 'trash'
  state: string
  at: number
  before: string
  after: string
  where: string
  canUndo: boolean
  error?: string | null
}

export type Ability = 'choose' | 'revoke' | 'search' | 'preview' | 'open' | 'reveal' | 'rename' | 'trash' | 'tags' | 'collections' | 'stopScan'

export interface Provider {
  readonly name: 'xiao' | 'browser'
  can(ability: Ability): boolean
  /** Library sections this provider has content for, besides its folders. */
  readonly views: View[]
  /** 'light' | 'dark' | 'auto', when the provider has an opinion (Xiao's own setting). */
  readonly theme?: string
  roots(): Promise<Root[]>
  chooseRoot(): Promise<Root | null>
  revokeRoot(id: string): Promise<void>
  unlock?(id: string): Promise<boolean>
  /** Stops reading a folder into the index; what was found so far stays. */
  stopScan?(id: string): Promise<void>
  list(root: string, path: string[], cursor?: number, signal?: AbortSignal): Promise<Page<Item>>
  search(q: string, view: View, scope: string | null, cursor?: number, signal?: AbortSignal): Promise<Page<Item>>
  preview(item: Item, signal?: AbortSignal): Promise<Preview>
  open?(item: Item): Promise<void>
  reveal?(item: Item): Promise<void>
  setTags?(item: Item, tags: string[]): Promise<void>
  collections?(): Promise<Collection[]>
  updateCollection?(op: 'create' | 'rename' | 'delete' | 'add' | 'remove', change: { collection?: string; name?: string; items?: Item[] }): Promise<string>
  saveSearch?(name: string, q: string): Promise<string>
  proposeNames?(items: Item[], options?: { ai?: boolean }): Promise<Proposal[]>
  /** Xiao's local AI is on, so name suggestions can be asked of it. */
  readonly assist?: boolean
  rename?(renames: { item: Item; name: string }[]): Promise<Outcome[]>
  undo?(operation: string): Promise<void>
  operations?(): Promise<Operation[]>
  trash?(items: Item[]): Promise<Outcome[]>
  restoreTab?(entry: string): Promise<void>
  clearArchive?(): Promise<void>
  /** Called when something changed elsewhere (another window, a finished download); returns a stop function. */
  onChange(listener: () => void): () => void
}

/** An error a provider reports in words a person can act on. `code` is one of the protocol's error codes. */
export class LibraryFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message)
  }
}
