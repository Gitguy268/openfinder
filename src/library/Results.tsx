import { useEffect, useRef, useState } from 'preact/hooks'
import { Icon } from '../ui/Icon'
import type { Item } from '../fs/types'
import {
  chooseFolder,
  go,
  layout,
  listing,
  more,
  place,
  previewOpen,
  problem,
  provider,
  query,
  folders,
  rootOf,
  saveSearch,
  selected,
  title,
  toast,
  unlock,
  up,
} from '../state'
import { addFolder } from './dialogs'
import { dateText, iconFor, kindName, sizeText } from './icons'
import { PLACE_TYPE } from './Sidebar'
import { askText } from './ask'
import { menu } from './Menu'
import { renameItem, trashItem } from './actions'

const ROW = 32
const CELL_W = 132
const CELL_H = 124

/** Opens a folder, or a file with the provider's safe opener; a file that cannot be opened is previewed. */
export async function activate(item: Item) {
  if (item.source === 'collection') return go({ view: 'collections', collection: item.root })
  if (item.kind === 'tab') {
    try {
      await provider.value.restoreTab!(item.root)
    } catch (e) {
      problem.value = (e as Error).message
    }
    return
  }
  if (item.kind === 'directory') return go({ view: 'folder', root: item.root, path: item.path })
  const prov = provider.value
  if (prov.can('open') && prov.open) {
    try {
      await prov.open(item)
      return
    } catch (e) {
      problem.value = (e as Error).message
    }
  }
  previewOpen.value = true
}

function Crumbs() {
  const p = place.value
  if (p.view !== 'folder') return null
  const root = rootOf(p.root)
  const path = p.path ?? []
  return (
    <nav class="crumbs" aria-label="Location">
      <button onClick={() => go({ ...p, path: [] })}>{root?.name}</button>
      {path.map((name, i) => (
        <span key={i}>
          <span aria-hidden="true">›</span>
          <button aria-current={i === path.length - 1 ? 'location' : undefined} onClick={() => go({ ...p, path: path.slice(0, i + 1) })}>
            {name}
          </button>
        </span>
      ))}
    </nav>
  )
}

function Empty() {
  const l = listing.value
  const p = place.value
  const q = query.value.trim()
  if (l.state === 'loading') return <p class="empty quiet">Loading…</p>
  if (l.state === 'locked') {
    return (
      <div class="empty">
        <p>The browser asks for permission again after a restart.</p>
        <button class="push" onClick={() => unlock(l.root)}>
          Allow Access to “{rootOf(l.root)?.name}”
        </button>
      </div>
    )
  }
  if (l.state === 'unavailable' || l.state === 'error') return <p class="empty">{l.message}</p>
  if (l.state !== 'ready' || l.items.length) return null
  if (q) {
    return (
      <div class="empty">
        <p>Nothing matches “{q}”{p.view === 'folder' ? ` in ${title.value}` : ''}.</p>
        <button onClick={() => (query.value = '')}>Clear the search</button>
      </div>
    )
  }
  if (p.view === 'folder') return <p class="empty">This folder is empty.</p>
  if (noFolders()) return null // the welcome says what to do
  return <p class="empty">Nothing here yet.</p>
}

/** No folder of the reader's own yet: the overview leads with how to add one. */
const noFolders = () => !folders.value.some((r) => r.kind !== 'sandbox')

function Welcome() {
  const xiao = provider.value.name === 'xiao'
  return (
    <div class="welcome">
      <h2>Your files, where they are</h2>
      <p>
        {xiao
          ? 'Choose a folder to see and search it here. The Library looks only at folders you give it, and nothing leaves this computer.'
          : 'Choose a folder to work with. Your files stay on this computer. Browsers do not allow the Home, Desktop, Documents or Downloads folder itself, so pick a folder inside one of them.'}
      </p>
      <button class="push" onClick={xiao ? chooseFolder : addFolder}>
        {xiao ? 'Choose a Folder…' : 'Allow File Access…'}
      </button>
    </div>
  )
}

export function Results() {
  const l = listing.value
  const items = l.state === 'ready' ? l.items : []
  const box = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ top: 0, height: 600, width: 800 })
  const grid = layout.value === 'grid'
  const columns = grid ? Math.max(1, Math.floor(view.width / CELL_W)) : 1
  const rowHeight = grid ? CELL_H : ROW
  const rows = Math.ceil(items.length / columns)

  useEffect(() => {
    const el = box.current!
    const measure = () => setView({ top: el.scrollTop, height: el.clientHeight, width: el.clientWidth })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    measure()
    return () => observer.disconnect()
  }, [])

  // keep the selected item on screen
  useEffect(() => {
    const el = box.current
    if (!el || selected.value === null) return
    const top = Math.floor(selected.value / columns) * rowHeight
    if (top < el.scrollTop) el.scrollTop = top
    else if (top + rowHeight > el.scrollTop + el.clientHeight) el.scrollTop = top + rowHeight - el.clientHeight
  }, [selected.value, columns, rowHeight])

  const first = Math.max(0, Math.floor(view.top / rowHeight) - 4)
  const last = Math.min(rows, Math.ceil((view.top + view.height) / rowHeight) + 4)
  const shown = items.slice(first * columns, last * columns)
  const searching = l.state === 'ready' && l.searching

  const onScroll = () => {
    const el = box.current!
    setView((v) => ({ ...v, top: el.scrollTop }))
    if (el.scrollTop + el.clientHeight > el.scrollHeight - rowHeight * 10) more()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.target !== e.currentTarget) return
    const n = items.length
    const at = selected.value
    const move = (to: number) => {
      e.preventDefault()
      if (n) selected.value = Math.max(0, Math.min(n - 1, to))
    }
    const mod = e.metaKey || e.ctrlKey
    if (e.key === 'ArrowDown') move(at === null ? 0 : mod ? n - 1 : at + columns)
    else if (e.key === 'ArrowUp' && mod) {
      e.preventDefault()
      up()
    } else if (e.key === 'ArrowUp') move(at === null ? 0 : at - columns)
    else if (e.key === 'ArrowRight' && grid) move(at === null ? 0 : at + 1)
    else if (e.key === 'ArrowLeft' && grid) move(at === null ? 0 : at - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(n - 1)
    else if (e.key === 'PageDown') move((at ?? 0) + columns * Math.floor(view.height / rowHeight))
    else if (e.key === 'PageUp') move((at ?? 0) - columns * Math.floor(view.height / rowHeight))
    else if (e.key === 'Enter' && at !== null) {
      e.preventDefault()
      activate(items[at])
    } else if (e.key === ' ' && provider.value.can('preview')) {
      e.preventDefault()
      previewOpen.value = !previewOpen.value
    } else if (e.key === 'F2' && at !== null) {
      e.preventDefault()
      renameItem(items[at])
    } else if ((e.key === 'Delete' || (e.key === 'Backspace' && mod)) && at !== null) {
      e.preventDefault()
      trashItem(items[at])
    } else if ((e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) && at !== null) {
      e.preventDefault()
      const row = document.getElementById(`item-${at}`)!.getBoundingClientRect()
      menu.value = { x: row.left + 24, y: row.bottom, item: items[at] }
    } else if (e.key === 'Backspace' && !query.value) {
      e.preventDefault()
      up()
    }
  }

  const count = l.state === 'ready' ? `${l.total.toLocaleString()} ${l.total === 1 ? 'item' : 'items'}${searching ? ' found' : ''}` : ''
  return (
    <section class="content" aria-label={title.value}>
      <div class="content-head">
        <Crumbs />
        <span class="count" aria-live="polite">
          {count}
        </span>
        {searching && provider.value.saveSearch && provider.value.can('collections') && place.value.view !== 'collections' && (
          <button
            class="small"
            onClick={async () => {
              const name = await askText('Save this search', 'Name', query.value.trim())
              if (name) await saveSearch(name)
            }}
          >
            Save Search
          </button>
        )}
      </div>
      {l.state === 'ready' && l.warnings.length > 0 && (
        <p class="warning" role="status">
          {l.warnings.join(' · ')}. Those words were searched as text.
        </p>
      )}
      {!grid && items.length > 0 && (
        <div class={searching ? 'columns searching' : 'columns'} aria-hidden="true">
          <span />
          <span>Name</span>
          {searching && <span>Where</span>}
          <span>Kind</span>
          <span class="num">Size</span>
          <span>Modified</span>
        </div>
      )}
      <div
        ref={box}
        class={grid ? 'results grid' : 'results'}
        role="listbox"
        tabIndex={0}
        aria-label={`Items in ${title.value}`}
        aria-activedescendant={selected.value !== null && items[selected.value] ? `item-${selected.value}` : undefined}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onClick={(e) => e.target === e.currentTarget && (selected.value = null)}
      >
        {(place.value.view === 'all' || place.value.view === 'files') && !query.value.trim() && noFolders() && l.state === 'ready' && <Welcome />}
        <Empty />
        {items.length > 0 && (
          <div class="spacer" style={{ height: `${rows * rowHeight}px` }}>
            {shown.map((item, i) => {
              const index = first * columns + i
              const style = grid
                ? { top: `${Math.floor(index / columns) * CELL_H}px`, left: `${(index % columns) * CELL_W}px`, width: `${CELL_W}px` }
                : { top: `${index * ROW}px` }
              return (
                <div
                  key={`${item.root}/${item.path.join('/')}`}
                  id={`item-${index}`}
                  class={item.missing ? 'item missing' : 'item'}
                  role="option"
                  aria-selected={selected.value === index}
                  aria-label={item.name}
                  style={style}
                  draggable={item.kind === 'directory'}
                  onDragStart={(e) => e.dataTransfer!.setData(PLACE_TYPE, JSON.stringify({ view: 'folder', root: item.root, path: item.path }))}
                  onClick={() => {
                    selected.value = index
                    box.current?.focus()
                  }}
                  onDblClick={() => activate(item)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    selected.value = index
                    menu.value = { x: e.clientX, y: e.clientY, item }
                  }}
                >
                  <span class="thumb">
                    <Icon node={iconFor(item)} size={grid ? 40 : 16} />
                  </span>
                  <span class="name">
                    {item.name}
                    {item.reason && item.reason !== 'name' && searching && <span class="reason"> · {item.reason}</span>}
                    {!grid && item.tags?.map((t) => (
                      <span key={t} class="tag">
                        {t}
                      </span>
                    ))}
                  </span>
                  {!grid && (
                    <>
                      {searching && <span class="dim where">{[rootOf(item.root)?.name, ...item.path.slice(0, -1)].filter(Boolean).join(' › ')}</span>}
                      <span class="dim">{item.missing ? 'Missing' : kindName(item)}</span>
                      <span class="dim num">{sizeText(item.size)}</span>
                      <span class="dim">{dateText(item.modified)}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {toast.value && (
        <p class="alert toast" role="status">
          {toast.value.text}
          {toast.value.undo && <button onClick={toast.value.undo}>Undo</button>}
          <button class="icon" aria-label="Dismiss" onClick={() => (toast.value = null)}>
            ×
          </button>
        </p>
      )}
      {problem.value && (
        <p class="alert" role="alert">
          {problem.value} <button onClick={() => (problem.value = null)}>Dismiss</button>
        </p>
      )}
    </section>
  )
}
