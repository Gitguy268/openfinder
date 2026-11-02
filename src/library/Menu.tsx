import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import type { Item } from '../fs/types'
import { addToCollection, collectionOf, collections, newCollection, place, previewOpen, problem, provider, removeFromCollection, setTags } from '../state'
import { renameItem, trashItem } from './actions'
import { reviewNames } from './Review'
import { askText } from './ask'
import { activate } from './Results'

/** The item menu: right click, the context-menu key or Shift+F10 on the selected item. */
export const menu = signal<{ x: number; y: number; item: Item } | null>(null)

export function Menu() {
  const m = menu.value
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!m) return
    box.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const close = (e: Event) => box.current?.contains(e.target as Node) || (menu.value = null)
    addEventListener('pointerdown', close, true)
    return () => removeEventListener('pointerdown', close, true)
  }, [m])
  if (!m) return null
  const { item } = m
  const prov = provider.value
  const done = () => {
    menu.value = null
    document.querySelector<HTMLElement>('.results')?.focus()
  }
  const run = (fn: () => unknown) => () => {
    done()
    Promise.resolve(fn()).catch((e) => (problem.value = (e as Error).message))
  }
  const here = place.value.view === 'collections' ? collectionOf(place.value.collection) : undefined
  const isCollection = item.source === 'collection'
  const lists = collections.value.filter((c) => !c.query)
  const onKeyDown = (e: KeyboardEvent) => {
    const buttons = [...box.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'Escape') done()
    else if (e.key === 'ArrowDown') buttons[(at + 1) % buttons.length]?.focus()
    else if (e.key === 'ArrowUp') buttons[(at - 1 + buttons.length) % buttons.length]?.focus()
    else return
    e.preventDefault()
  }
  return (
    <div ref={box} class="menu context" role="menu" aria-label={`Actions for ${item.name}`} style={{ left: `${m.x}px`, top: `${m.y}px` }} onKeyDown={onKeyDown}>
      <button role="menuitem" onClick={run(() => activate(item))}>
        Open
      </button>
      {prov.can('reveal') && prov.reveal && !isCollection && (
        <button role="menuitem" onClick={run(() => prov.reveal!(item))}>
          Show in {navigator.platform.startsWith('Mac') ? 'Finder' : 'Files'}
        </button>
      )}
      {prov.can('preview') && item.kind === 'file' && (
        <button role="menuitem" onClick={run(() => (previewOpen.value = true))}>
          Preview
        </button>
      )}
      {prov.can('rename') && !isCollection && item.path.length >= 0 && (
        <>
          <hr />
          <button role="menuitem" onClick={run(() => renameItem(item))}>
            Rename…
          </button>
          {item.kind === 'file' && prov.proposeNames && (
            <button role="menuitem" onClick={run(() => reviewNames([item]))}>
              Tidy Name…
            </button>
          )}
        </>
      )}
      {prov.can('trash') && !isCollection && (
        <button role="menuitem" onClick={run(() => trashItem(item))}>
          Move to Trash
        </button>
      )}
      {prov.can('tags') && !isCollection && (
        <>
          <hr />
          <button
            role="menuitem"
            onClick={run(async () => {
              const answer = await askText(`Tags for “${item.name}”`, 'Tags, separated by commas', (item.tags ?? []).join(', '))
              if (answer !== null) await setTags(item, [...new Set(answer.split(',').map((t) => t.trim()).filter(Boolean))])
            })}
          >
            Tags…
          </button>
        </>
      )}
      {prov.can('collections') && !isCollection && (
        <>
          <hr />
          {lists.map((c) => (
            <button key={c.id} role="menuitem" onClick={run(() => addToCollection(c.id, [item]))}>
              Add to “{c.name}”
            </button>
          ))}
          <button
            role="menuitem"
            onClick={run(async () => {
              const name = await askText('New collection', 'Name', '', 'Create')
              if (name) await newCollection(name, [item])
            })}
          >
            Add to New Collection…
          </button>
          {here && !here.query && (
            <button role="menuitem" onClick={run(() => removeFromCollection(here.id, [item]))}>
              Remove from “{here.name}”
            </button>
          )}
        </>
      )}
    </div>
  )
}
