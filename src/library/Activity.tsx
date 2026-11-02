import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import type { Operation } from '../fs/types'
import { problem, provider, say } from '../state'
import { dateText } from './icons'

/** Every change the Library made to files, newest first, with undo where it is still safe. */
const activity = signal<Operation[] | null>(null)

export async function showActivity() {
  try {
    activity.value = await provider.value.operations!()
  } catch (e) {
    problem.value = (e as Error).message
  }
}

const STATE: Record<string, string> = {
  committed: 'Done',
  undone: 'Undone',
  failed: 'Not done',
  review: 'Interrupted: check both names',
  prepared: 'Starting',
  applied: 'Finishing',
  undoing: 'Undoing',
}

export function Activity() {
  const ops = activity.value
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (ops) dialog.current?.showModal()
  }, [ops !== null])
  if (!ops) return null
  const close = () => {
    activity.value = null
    dialog.current?.close()
  }
  return (
    <dialog ref={dialog} class="panel activity" aria-labelledby="activity-title" onCancel={close}>
      <h2 id="activity-title">Activity</h2>
      {ops.length === 0 && <p class="dim">The Library has not changed any files yet.</p>}
      <ol class="operations">
        {ops.map((op) => (
          <li key={op.id}>
            <div>
              <p>{op.kind === 'trash' ? `Moved “${op.before}” to the Trash` : `“${op.before}” → “${op.after}”`}</p>
              <p class="dim">
                {op.where} · {dateText(op.at)} · {STATE[op.state] ?? op.state}
              </p>
            </div>
            {op.canUndo && (
              <button
                onClick={async () => {
                  try {
                    await provider.value.undo!(op.id)
                    say(`“${op.after}” is “${op.before}” again.`)
                  } catch (e) {
                    problem.value = (e as Error).message
                  }
                  activity.value = await provider.value.operations!()
                }}
              >
                Undo
              </button>
            )}
          </li>
        ))}
      </ol>
      <p class="dialog-actions">
        <button class="push" onClick={close}>
          Done
        </button>
      </p>
    </dialog>
  )
}
