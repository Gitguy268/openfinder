import type { IconNode } from 'lucide'
import { Archive, Bookmark, Box, CircleStop, Download, HardDrive, Layers, Library, Lock, Pin, Plus, Search, StickyNote, X, Folder, FileText } from 'lucide'
import { Icon } from '../ui/Icon'
import type { View } from '../fs/types'
import { collections, deleteCollection, folders, go, pin, pins, place, provider, removeRoot, samePlace, unpin, VIEW_NAMES, type Place } from '../state'
import { addFolder } from './dialogs'

/** Drag type for a folder dragged out of the results. */
export const PLACE_TYPE = 'application/x-openfinder-place'

const VIEW_ICONS: Record<View, IconNode> = {
  all: Library,
  downloads: Download,
  files: FileText,
  notes: StickyNote,
  tabs: Bookmark,
  archive: Archive,
  collections: Layers,
}

type RowProps = { icon: IconNode; label: string; to: Place; onRemove?: () => void; removeLabel?: string; indent?: boolean; onStop?: () => void }

// A folder being scanned shows it, with a way to stop, in place of the remove button.
function Row({ icon, label, to, onRemove, removeLabel, indent, onStop }: RowProps) {
  return (
    <li class={indent ? 'row indent' : 'row'}>
      <button class="row-main" aria-current={samePlace(to, place.value) ? 'page' : undefined} onClick={() => go(to)}>
        <Icon node={icon} />
        <span>{label}</span>
        {onStop && <span class="row-note">scanning</span>}
      </button>
      {onStop ? (
        <button class="row-stop" aria-label={`Stop scanning ${label}`} title={`Stop scanning ${label}`} onClick={onStop}>
          <Icon node={CircleStop} size={13} />
        </button>
      ) : onRemove && (
        <button class="row-remove" aria-label={removeLabel} title={removeLabel} onClick={onRemove}>
          <Icon node={X} size={13} />
        </button>
      )}
    </li>
  )
}

export function Sidebar() {
  const prov = provider.value
  return (
    <nav class="sidebar" aria-label="Sidebar">
      <ul class="rows" aria-label="Library">
        {prov.views.map((v) => (
          <Row key={v} icon={VIEW_ICONS[v]} label={VIEW_NAMES[v]} to={{ view: v }} />
        ))}
      </ul>
      <h2 id="folders-heading">Folders</h2>
      <ul
        class="rows drop-zone"
        aria-labelledby="folders-heading"
        onDragOver={(e) => e.dataTransfer!.types.includes(PLACE_TYPE) && e.preventDefault()}
        onDrop={(e) => pin(JSON.parse(e.dataTransfer!.getData(PLACE_TYPE)))}
      >
        {folders.value.map((r) => [
          <Row
            key={r.id}
            icon={r.kind === 'sandbox' ? Box : r.locked ? Lock : r.available ? HardDrive : Folder}
            label={r.name}
            to={{ view: 'folder', root: r.id, path: [] }}
            removeLabel={`Remove ${r.name} from the sidebar`}
            onRemove={r.kind === 'sandbox' || !prov.can('revoke') ? undefined : () => removeRoot(r.id)}
            onStop={r.scanning && prov.can('stopScan') ? () => void prov.stopScan?.(r.id) : undefined}
          />,
          ...pins.value
            .filter((p) => p.root === r.id)
            .map((p) => (
              <Row
                key={`${p.root}/${p.path.join('/')}`}
                indent
                icon={Pin}
                label={p.name}
                to={{ view: 'folder', root: p.root, path: p.path }}
                removeLabel={`Unpin ${p.name}`}
                onRemove={() => unpin(p)}
              />
            )),
        ])}
        {(prov.can('choose') || prov.name === 'browser') && (
          <li class="row">
            <button class="row-main" onClick={addFolder}>
              <Icon node={Plus} />
              <span>Add Folder…</span>
            </button>
          </li>
        )}
      </ul>
      {folders.value.length > 0 && pins.value.length === 0 && <p class="hint">Drag a folder here to pin it</p>}
      {prov.can('collections') && collections.value.length > 0 && (
        <>
          <h2 id="collections-heading">Collections</h2>
          <ul class="rows" aria-labelledby="collections-heading">
            {collections.value.map((c) => (
              <Row
                key={c.id}
                icon={c.query ? Search : Layers}
                label={c.name}
                to={{ view: 'collections', collection: c.id }}
                removeLabel={`Delete the collection ${c.name} (the files stay)`}
                onRemove={() => deleteCollection(c.id)}
              />
            ))}
          </ul>
        </>
      )}
      {prov.name === 'browser' && <p class="footnote">In Xiao, downloads, notes and saved tabs join your folders here.</p>}
    </nav>
  )
}
