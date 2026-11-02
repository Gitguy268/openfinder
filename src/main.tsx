import { render } from 'preact'
import '@fontsource-variable/bricolage-grotesque'
import './theme/theme.css'

const root = document.getElementById('app')!
root.replaceChildren()

function notice(heading: string, text: string) {
  render(
    <main class="notice">
      <h1>{heading}</h1>
      <p>{text}</p>
    </main>,
    root,
  )
}

// What this page can reach decides what it shows: Xiao's Library bridge, or what the browser itself offers.
async function start() {
  const state = await import('./state')
  if (window.xiao?.request) {
    const { xiaoProvider } = await import('./fs/xiao')
    await state.init(await xiaoProvider())
  } else if ('getDirectory' in (navigator.storage ?? {})) {
    const { browserProvider } = await import('./fs/handles')
    const provider = await browserProvider()
    await state.init(provider)
    // a folder dropped anywhere becomes a folder in the sidebar; also stops the browser from opening dropped files
    addEventListener('dragover', (e) => e.dataTransfer?.types.includes('Files') && e.preventDefault())
    addEventListener('drop', async (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return
      e.preventDefault()
      // all handles must be requested before the first await: the browser empties the list afterwards
      const pending = [...e.dataTransfer.items].map((item) => item.getAsFileSystemHandle?.())
      for (const handle of await Promise.all(pending)) {
        if (handle?.kind !== 'directory') continue
        const added = await provider.addHandle(handle as FileSystemDirectoryHandle)
        await state.refreshRoots()
        state.go({ view: 'folder', root: added.id, path: [] })
      }
    })
  } else {
    return notice('This browser has no room for OpenFinder', 'OpenFinder keeps files in the browser’s private storage or in folders you choose. This browser offers neither. Try a current version of Chrome, Edge, Firefox or Xiao.')
  }
  const { App } = await import('./library/App')
  render(<App />, root)
}

start().catch((e) => notice('OpenFinder could not start', (e as Error).message))
