import { signal } from '@preact/signals'
import { useEffect, useRef, useState } from 'preact/hooks'
import { checkName } from '../fs/contract/naming.mjs'
import type { Item, Proposal } from '../fs/types'
import { problem, provider, rename } from '../state'

/** Tidy Names: what each file could be called, for the reader to accept, edit or skip, one by one. */
const reviewing = signal<Proposal[] | null>(null)

let lastFiles: Item[] = []
const asking = signal(false)

export async function reviewNames(items: Item[], ai = false) {
  const files = items.filter((i) => i.kind === 'file').slice(0, 200)
  if (!files.length) return (problem.value = 'There are no files here to tidy.')
  lastFiles = files
  try {
    const found = await provider.value.proposeNames!(files, { ai })
    // the files with a better name first; the rest can still be edited by hand
    reviewing.value = [...found.filter((p) => p.proposedName), ...found.filter((p) => !p.proposedName)]
  } catch (e) {
    problem.value = (e as Error).message
  }
}

export function Review() {
  const list = reviewing.value
  const dialog = useRef<HTMLDialogElement>(null)
  const [names, setNames] = useState<string[]>([])
  const [chosen, setChosen] = useState<boolean[]>([])
  useEffect(() => {
    if (!list) return
    setNames(list.map((p) => p.proposedName ?? p.originalName))
    setChosen(list.map((p) => !!p.proposedName))
    dialog.current?.showModal()
  }, [list])
  if (!list) return null
  const close = () => {
    reviewing.value = null
    dialog.current?.close()
  }
  const errors = list.map((p, i) => (names[i] && names[i] !== p.originalName ? checkName(p.originalName, names[i]) : null))
  const picked = list.map((p, i) => ({ item: p.item, name: names[i] })).filter((r, i) => chosen[i] && r.name && r.name !== list[i].originalName && !errors[i])
  const withIdeas = list.filter((p) => p.proposedName).length
  return (
    <dialog ref={dialog} class="panel review" aria-labelledby="review-title" onCancel={close}>
      <h2 id="review-title">Tidy names</h2>
      <p class="dim">
        {withIdeas
          ? `Tidier names for ${withIdeas} of ${list.length} files. Edit any of them, untick what should stay. Nothing changes until you choose Rename, and every rename can be undone.`
          : 'These names are already as tidy as the rules can make them without guessing. You can still edit any of them.'}
      </p>
      <ol class="proposals">
        {list.map((p, i) => (
          <li key={`${p.item.root}/${p.item.path.join('/')}`}>
            <label class="pick">
              <input
                type="checkbox"
                checked={chosen[i]}
                aria-label={`Rename ${p.originalName}`}
                onChange={(e) => setChosen(chosen.map((c, j) => (j === i ? e.currentTarget.checked : c)))}
              />
            </label>
            <div>
              <p class="was">{p.originalName}</p>
              <input
                value={names[i]}
                aria-label={`New name for ${p.originalName}`}
                aria-invalid={!!errors[i]}
                spellcheck={false}
                onInput={(e) => {
                  const value = e.currentTarget.value
                  setNames(names.map((n, j) => (j === i ? value : n)))
                  setChosen(chosen.map((c, j) => (j === i ? value !== p.originalName : c)))
                }}
              />
              {errors[i] && <p class="why error">{errors[i]}</p>}
              {!errors[i] && (p.reasons.length > 0 || p.warnings.length > 0) && <p class="why">{[...p.reasons, ...p.warnings].join('; ')}</p>}
            </div>
          </li>
        ))}
      </ol>
      <p class="dialog-actions">
        {provider.value.assist && (
          <button
            class="left"
            disabled={asking.value}
            onClick={async () => {
              asking.value = true
              await reviewNames(lastFiles, true)
              asking.value = false
            }}
          >
            {asking.value ? 'The local AI is thinking…' : 'Ask the Local AI'}
          </button>
        )}
        <button onClick={close}>Cancel</button>
        <button
          class="push"
          disabled={!picked.length}
          onClick={async () => {
            close()
            await rename(picked)
          }}
        >
          Rename {picked.length || ''}
        </button>
      </p>
    </dialog>
  )
}
