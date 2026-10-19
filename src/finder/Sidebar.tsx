import type { ComponentChildren } from 'preact'
import type { IconNode } from 'lucide'
import { Box, Folder, HardDrive, Lock, Plus, X } from 'lucide'
import { Icon } from '../ui/Icon'
import { addFavorite, favorites, go, locations, locked, place, removeFavorite, removeLocation, samePlace, SANDBOX, zoomed, type Place } from '../state'
import { addFolder } from './dialogs'

/** Drag type for a folder dragged out of the file area. */
export const PLACE_TYPE = 'application/x-openfinder-place'

const tags = [
  ['Red', '#ff5a52'],
  ['Orange', '#ff9d2e'],
  ['Yellow', '#f5cb2f'],
  ['Green', '#43c659'],
  ['Blue', '#3a8dff'],
  ['Purple', '#b56ae8'],
  ['Gray', '#9a9aa2'],
]

function Section({ id, title, children }: { id: string; title: string; children: ComponentChildren }) {
  const key = `section-${id}`
  return (
    <details open={localStorage.getItem(key) !== 'closed'} onToggle={(e) => localStorage.setItem(key, e.currentTarget.open ? 'open' : 'closed')}>
      <summary>{title}</summary>
      {children}
    </details>
  )
}

function Row({ icon, label, to, onRemove }: { icon: IconNode; label: string; to: Place; onRemove?: () => void }) {
  return (
    <div class="row">
      <button class="row-main" aria-current={samePlace(to, place.value) ? 'page' : undefined} onClick={() => go(to)}>
        <Icon node={icon} />
        <span>{label}</span>
      </button>
      {onRemove && (
        <button class="row-remove" aria-label={`Remove ${label} from the sidebar`} onClick={onRemove}>
          <Icon node={X} size={12} />
        </button>
      )}
    </div>
  )
}

export function Sidebar() {
  return (
    <nav class="sidebar glass-flat" aria-label="Sidebar">
      <div class="lights">
        {/* a page cannot close or minimise its tab, so these two are decoration */}
        <span class="light close" aria-hidden="true" />
        <span class="light minimise" aria-hidden="true" />
        <button class="light zoom" aria-label="Fill the tab" aria-pressed={zoomed.value} onClick={() => (zoomed.value = !zoomed.value)} />
      </div>
      <div class="sidebar-scroll">
        <Section id="favorites" title="Favorites">
          <div
            class="drop-zone"
            onDragOver={(e) => e.dataTransfer!.types.includes(PLACE_TYPE) && e.preventDefault()}
            onDrop={(e) => addFavorite(JSON.parse(e.dataTransfer!.getData(PLACE_TYPE)))}
          >
            {favorites.value.map((f) => (
              <Row key={f.loc + f.path.join('/')} icon={Folder} label={f.name} to={f} onRemove={() => removeFavorite(f)} />
            ))}
            {favorites.value.length === 0 && <p class="hint">Drag a folder here</p>}
          </div>
        </Section>
        <Section id="locations" title="Locations">
          {locations.value.map((l) => (
            <Row
              key={l.id}
              icon={l.id === SANDBOX ? Box : locked.value.has(l.id) ? Lock : HardDrive}
              label={l.name}
              to={{ loc: l.id, path: [] }}
              onRemove={l.id === SANDBOX ? undefined : () => removeLocation(l.id)}
            />
          ))}
          <div class="row">
            <button class="row-main" onClick={addFolder}>
              <Icon node={Plus} />
              <span>Add Folder…</span>
            </button>
          </div>
        </Section>
        <Section id="tags" title="Tags">
          {tags.map(([name, color]) => (
            // tagging arrives with Get Info in milestone 2
            <div class="row tag" key={name}>
              <span class="dot" style={{ background: color }} />
              <span>{name}</span>
            </div>
          ))}
        </Section>
      </div>
    </nav>
  )
}
