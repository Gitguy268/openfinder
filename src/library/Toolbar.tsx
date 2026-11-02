import { ChevronLeft, ChevronRight, Ellipsis, LayoutGrid, List, PanelRight, Search } from 'lucide'
import { Icon } from '../ui/Icon'
import { back, forward, history, isPinned, layout, listing, pin, place, previewOpen, problem, provider, query, refreshRoots, scopeLabel, selected, theme, title } from '../state'
import { showActivity } from './Activity'
import { reviewNames } from './Review'
import { askConfirm } from './ask'
import { addFolder, showAbout } from './dialogs'

export const searchInput = { current: null as HTMLInputElement | null }

export function Toolbar() {
  const prov = provider.value
  const inFolder = place.value.view === 'folder'
  return (
    <header class="toolbar">
      <div class="group">
        <button class="icon" aria-label="Back" title="Back" disabled={!history.value.back.length} onClick={back}>
          <Icon node={ChevronLeft} size={18} />
        </button>
        <button class="icon" aria-label="Forward" title="Forward" disabled={!history.value.forward.length} onClick={forward}>
          <Icon node={ChevronRight} size={18} />
        </button>
      </div>
      <h1 class="title">{title}</h1>
      <form class="search" role="search" onSubmit={(e) => e.preventDefault()}>
        <Icon node={Search} size={15} />
        <input
          ref={(el) => void (searchInput.current = el)}
          type="search"
          placeholder={scopeLabel.value}
          aria-label={scopeLabel.value}
          value={query.value}
          onInput={(e) => (query.value = e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query.value) {
              e.preventDefault()
              query.value = ''
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              const l = listing.value
              if (selected.value === null && l.state === 'ready' && l.items.length) selected.value = 0
              document.querySelector<HTMLElement>('.results')?.focus()
            }
          }}
          spellcheck={false}
          autocomplete="off"
        />
      </form>
      <div class="group" role="radiogroup" aria-label="Show as">
        {(
          [
            ['list', 'List', List],
            ['grid', 'Grid', LayoutGrid],
          ] as const
        ).map(([value, label, icon]) => (
          <button key={value} class="icon" role="radio" aria-label={label} title={label} aria-checked={layout.value === value} onClick={() => (layout.value = value)}>
            <Icon node={icon} />
          </button>
        ))}
      </div>
      {prov.can('preview') && (
        <button class="icon" aria-label="Preview" title="Preview (Space)" aria-pressed={previewOpen.value} onClick={() => (previewOpen.value = !previewOpen.value)}>
          <Icon node={PanelRight} />
        </button>
      )}
      <button id="action-button" class="icon" aria-label="Actions" title="Actions" popovertarget="action-menu">
        <Icon node={Ellipsis} />
      </button>

      <div id="action-menu" class="menu" popover="auto">
        <button popovertarget="action-menu" popovertargetaction="hide" onClick={addFolder}>
          Add Folder…
        </button>
        {inFolder && (
          <button popovertarget="action-menu" popovertargetaction="hide" disabled={isPinned(place.value)} onClick={() => pin(place.value)}>
            Pin This Folder
          </button>
        )}
        {prov.proposeNames && prov.can('rename') && (
          <button
            popovertarget="action-menu"
            popovertargetaction="hide"
            disabled={listing.value.state !== 'ready' || !listing.value.items.some((i) => i.kind === 'file')}
            onClick={() => listing.value.state === 'ready' && reviewNames(listing.value.items)}
          >
            Tidy Names Here…
          </button>
        )}
        {place.value.view === 'archive' && prov.clearArchive && (
          <button
            popovertarget="action-menu"
            popovertargetaction="hide"
            onClick={async () => {
              if (!(await askConfirm('Clear the Archive?', 'The archived tabs are forgotten. Pages you visited stay in your history.', 'Clear Archive'))) return
              await prov.clearArchive!().catch((e) => (problem.value = (e as Error).message))
              await refreshRoots()
            }}
          >
            Clear the Archive…
          </button>
        )}
        {prov.operations && (
          <button popovertarget="action-menu" popovertargetaction="hide" onClick={showActivity}>
            Activity…
          </button>
        )}
        {prov.name === 'browser' && (
          <>
            <hr />
            <fieldset class="choice">
              <legend>Appearance</legend>
              {(
                [
                  ['auto', 'Like the system'],
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input type="radio" name="theme" value={value} checked={theme.value === value} onChange={() => (theme.value = value)} /> {label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        <hr />
        <button popovertarget="action-menu" popovertargetaction="hide" onClick={showAbout}>
          About OpenFinder
        </button>
      </div>
    </header>
  )
}
