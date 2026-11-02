import type { IconNode } from 'lucide'
import { File, FileArchive, FileCode, FileImage, FileMusic, FileSpreadsheet, FileText, FileVideoCamera, Folder, FolderSymlink, Globe } from 'lucide'
import { kindOf } from '../fs/contract/library.mjs'
import type { Item } from '../fs/types'

const BY_KIND: Record<string, IconNode> = {
  image: FileImage,
  video: FileVideoCamera,
  audio: FileMusic,
  document: FileText,
  text: FileText,
  code: FileCode,
  archive: FileArchive,
}

export function iconFor(item: Pick<Item, 'name' | 'kind'>): IconNode {
  if (item.kind === 'directory') return Folder
  if (item.kind === 'link') return FolderSymlink
  if (item.kind === 'tab') return Globe
  if (/\.(csv|tsv|xlsx?|ods|numbers)$/i.test(item.name)) return FileSpreadsheet
  return BY_KIND[kindOf(item.name)] ?? File
}

const KIND_NAMES: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  text: 'Text',
  code: 'Code',
  archive: 'Archive',
}
export function kindName(item: Pick<Item, 'name' | 'kind'>) {
  if (item.kind === 'directory') return 'Folder'
  if (item.kind === 'link') return 'Link'
  if (item.kind === 'tab') return 'Archived tab'
  const ext = item.name.includes('.') ? item.name.slice(item.name.lastIndexOf('.') + 1).toUpperCase() : ''
  const kind = KIND_NAMES[kindOf(item.name)]
  return kind && ext ? `${ext} ${kind.toLowerCase()}` : ext ? `${ext} file` : 'File'
}

const bytes = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
export function sizeText(size: number | null) {
  if (size === null) return '—'
  if (size < 1000) return `${size} bytes`
  const [n, unit] = size < 1e6 ? [size / 1e3, 'KB'] : size < 1e9 ? [size / 1e6, 'MB'] : [size / 1e9, 'GB']
  return `${bytes.format(n)} ${unit}`
}

const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })
export function dateText(ms: number) {
  if (!ms) return '—'
  const d = new Date(ms)
  const today = new Date()
  return d.toDateString() === today.toDateString() ? `Today, ${time.format(d)}` : day.format(d)
}
