import { render } from 'preact'
import '@fontsource-variable/inter'
import './glass/tokens.css'

const root = document.getElementById('app')!
root.replaceChildren()

// userAgentData exists in Chromium browsers only
if (!navigator.userAgentData) {
  render(
    <main class="notice">
      <h1>Please use a Chromium browser</h1>
      <p>
        OpenFinder works with the files and folders on your computer through browser features that only Chromium browsers offer. Open this page
        in Chrome, Edge, Brave, Opera or Arc.
      </p>
    </main>,
    root,
  )
} else {
  const [{ App }, state] = await Promise.all([import('./finder/App'), import('./state')])
  await state.init()

  // a folder dropped anywhere becomes a location; also stops the browser from navigating to dropped files
  addEventListener('dragover', (e) => e.dataTransfer?.types.includes('Files') && e.preventDefault())
  addEventListener('drop', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return
    e.preventDefault()
    state.addDropped(e.dataTransfer.items)
  })

  render(<App />, root)
}
