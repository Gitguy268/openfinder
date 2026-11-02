import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'

/** One small dialog for every question that needs a few words: a name, tags. */
const asking = signal<{ title: string; label: string; value: string; action: string; confirm?: boolean; resolve: (answer: string | null) => void } | null>(null)

export const askText = (title: string, label: string, value = '', action = 'Save') =>
  new Promise<string | null>((resolve) => (asking.value = { title, label, value, action, resolve }))

/** A yes or no about something that cannot be taken back; `label` says exactly what it changes. */
export const askConfirm = (title: string, label: string, action: string) =>
  new Promise<boolean>((resolve) => (asking.value = { title, label, value: '', action, confirm: true, resolve: (a) => resolve(a !== null) }))

export function Ask() {
  const a = asking.value
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const back = useRef<Element | null>(null)
  useEffect(() => {
    if (!a) return
    back.current = document.activeElement
    dialog.current?.showModal()
    input.current?.select()
    if (a.confirm) dialog.current?.querySelector<HTMLButtonElement>('.push')?.focus()
  }, [a])
  if (!a) return null
  const finish = (answer: string | null) => {
    asking.value = null
    dialog.current?.close()
    ;(back.current as HTMLElement | null)?.focus?.()
    a.resolve(answer)
  }
  return (
    <dialog ref={dialog} class="panel ask" aria-labelledby="ask-title" onCancel={() => finish(null)}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          finish(a.confirm ? 'yes' : input.current!.value.trim() || null)
        }}
      >
        <h2 id="ask-title">{a.title}</h2>
        {a.confirm ? (
          <p>{a.label}</p>
        ) : (
          <label>
            {a.label}
            <input ref={input} value={a.value} autocomplete="off" spellcheck={false} />
          </label>
        )}
        <p class="dialog-actions">
          <button type="button" onClick={() => finish(null)}>
            Cancel
          </button>
          <button class="push">{a.action}</button>
        </p>
      </form>
    </dialog>
  )
}
