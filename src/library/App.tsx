import { useEffect } from 'preact/hooks'
import { go, previewOpen, provider } from '../state'
import { Activity } from './Activity'
import { Ask } from './ask'
import { Review } from './Review'
import { Dialogs } from './dialogs'
import { Menu } from './Menu'
import { Preview } from './Preview'
import { Results } from './Results'
import { Sidebar } from './Sidebar'
import { searchInput, Toolbar } from './Toolbar'

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement
  return e.isComposing || t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)
}

export function App() {
  // "/" finds, as on many sites; Cmd/Ctrl+F too, inside the Library. Cmd/Ctrl+Shift+F searches everything,
  // wherever the Library was left (as Finder's All My Files).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        go({ view: 'all' })
        searchInput.current?.focus()
        searchInput.current?.select()
        return
      }
      if (typing(e)) return
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'f')) {
        e.preventDefault()
        searchInput.current?.focus()
        searchInput.current?.select()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
  const withPreview = previewOpen.value && provider.value.can('preview')
  return (
    <div class={withPreview ? 'app with-preview' : 'app'}>
      <Sidebar />
      <main class="main">
        <Toolbar />
        <Results />
      </main>
      {withPreview && <Preview />}
      <Dialogs />
      <Ask />
      <Review />
      <Activity />
      <Menu />
    </div>
  )
}
