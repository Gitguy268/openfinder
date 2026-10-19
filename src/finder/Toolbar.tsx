import { ArrowDownUp, ChevronLeft, ChevronRight, Columns3, Ellipsis, GalleryHorizontalEnd, LayoutGrid, List, Search, Share, Tag } from 'lucide'
import { Glass } from '../glass/Glass'
import { Icon } from '../ui/Icon'
import { addFavorite, back, forward, glassTint, history, isFavorite, place, title } from '../state'
import { addFolder, showAbout } from './dialogs'

const views = [
  ['Icons', LayoutGrid],
  ['List', List],
  ['Columns', Columns3],
  ['Gallery', GalleryHorizontalEnd],
] as const

const LATER = 'Arrives in a later milestone'

export function Toolbar() {
  return (
    <header class="toolbar">
      <Glass class="group">
        <button aria-label="Back" disabled={!history.value.back.length} onClick={back}>
          <Icon node={ChevronLeft} size={18} />
        </button>
        <button aria-label="Forward" disabled={!history.value.forward.length} onClick={forward}>
          <Icon node={ChevronRight} size={18} />
        </button>
      </Glass>
      <h1 class="title">{title}</h1>
      <div class="spacer" />
      <Glass class="group" role="radiogroup" aria-label="View">
        {views.map(([name, icon], index) => (
          <button key={name} role="radio" aria-label={name} aria-checked={index === 0} disabled={index > 0} title={index > 0 ? LATER : undefined}>
            <Icon node={icon} />
          </button>
        ))}
      </Glass>
      <Glass class="group optional">
        <button aria-label="Sort" disabled title={LATER}>
          <Icon node={ArrowDownUp} />
        </button>
      </Glass>
      <Glass class="group">
        <button class="optional" aria-label="Share" disabled title={LATER}>
          <Icon node={Share} />
        </button>
        <button class="optional" aria-label="Tags" disabled title={LATER}>
          <Icon node={Tag} />
        </button>
        <button id="action-button" aria-label="Actions" popovertarget="action-menu">
          <Icon node={Ellipsis} />
        </button>
      </Glass>
      <Glass class="group search optional">
        <Icon node={Search} size={14} />
        <input type="search" placeholder="Search" aria-label="Search" disabled title={LATER} />
      </Glass>

      <Glass id="action-menu" class="menu" popover="auto">
        <button popovertarget="action-menu" popovertargetaction="hide" onClick={addFolder}>
          Add Folder…
        </button>
        <button popovertarget="action-menu" popovertargetaction="hide" disabled={isFavorite(place.value)} onClick={() => addFavorite(place.value)}>
          Add to Favorites
        </button>
        <hr />
        <label class="slider">
          Glass
          <input type="range" min="0.2" max="1" step="0.02" value={glassTint} onInput={(e) => (glassTint.value = Number(e.currentTarget.value))} />
          <span class="dim">Clear</span>
          <span class="dim">Tinted</span>
        </label>
        <hr />
        <button popovertarget="action-menu" popovertargetaction="hide" onClick={showAbout}>
          About OpenFinder
        </button>
      </Glass>
    </header>
  )
}
