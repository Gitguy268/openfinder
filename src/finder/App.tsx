import { zoomed } from '../state'
import { Content } from './Content'
import { Dialogs } from './dialogs'
import { Sidebar } from './Sidebar'
import { Toolbar } from './Toolbar'
import './finder.css'

export function App() {
  return (
    <div class={zoomed.value ? 'window zoomed' : 'window'}>
      <Sidebar />
      <main class="main">
        <Content />
        <Toolbar />
      </main>
      <Dialogs />
    </div>
  )
}
