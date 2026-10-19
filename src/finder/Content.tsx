import type { Entry } from '../fs/adapter'
import { canPickFolders, go, listing, locationOf, locations, place, problem, selected, title, unlock } from '../state'
import { addFolder } from './dialogs'
import { FileIcon, FolderIcon } from './icons'
import { PLACE_TYPE } from './Sidebar'

function Item({ entry }: { entry: Entry }) {
  const { loc, path } = place.value
  const target = { loc, path: [...path, entry.name] }
  const open = () => entry.kind === 'directory' && go(target)
  return (
    <li
      class="item"
      role="option"
      tabIndex={0}
      aria-selected={selected.value === entry.name}
      draggable={entry.kind === 'directory'}
      onDragStart={(e) => e.dataTransfer!.setData(PLACE_TYPE, JSON.stringify(target))}
      onClick={(e) => {
        e.stopPropagation()
        selected.value = entry.name
      }}
      onDblClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
    >
      <span class="thumb">{entry.kind === 'directory' ? <FolderIcon /> : <FileIcon name={entry.name} />}</span>
      <span class="name">{entry.name}</span>
    </li>
  )
}

function Welcome() {
  return (
    <div class="welcome">
      <div>
        <h2>Welcome to OpenFinder</h2>
        <p>
          Choose a folder to work with. Your files stay on this computer. Browsers do not allow the Home, Desktop, Documents or Downloads folder
          itself, so pick a folder inside one of them.
        </p>
      </div>
      <button class="push" onClick={addFolder}>
        Allow File Access…
      </button>
    </div>
  )
}

export function Content() {
  const state = listing.value
  const name = locationOf(place.value.loc)?.name
  return (
    <section class="content" aria-label={title} onClick={() => (selected.value = null)}>
      {/* until a real folder is added, the first screen offers to add one */}
      {locations.value.length === 1 && place.value.path.length === 0 && <Welcome />}
      {state.state === 'locked' && (
        <div class="empty">
          <p>The browser asks for permission again after a restart.</p>
          <button class="push" onClick={() => unlock(place.value.loc)}>
            Allow Access to “{name}”
          </button>
        </div>
      )}
      {state.state === 'error' && <p class="empty">{state.message}</p>}
      {state.state === 'ready' && state.entries.length === 0 && <p class="empty">This folder is empty.</p>}
      {state.state === 'ready' && state.entries.length > 0 && (
        <ul class="icons" role="listbox" aria-label={`Items in ${title.value}`}>
          {state.entries.map((entry) => (
            <Item key={entry.name} entry={entry} />
          ))}
        </ul>
      )}
      {!canPickFolders && place.value.path.length === 0 && (
        <p class="footnote">Local folders are switched off in this browser. Choose Add Folder to see how to switch them on.</p>
      )}
      {problem.value && (
        <p class="alert" role="alert">
          {problem.value} <button onClick={() => (problem.value = null)}>Dismiss</button>
        </p>
      )}
    </section>
  )
}
