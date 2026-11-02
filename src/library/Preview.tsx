import { useEffect, useState } from 'preact/hooks'
import { ExternalLink, FolderOpen, X } from 'lucide'
import { Icon } from '../ui/Icon'
import type { Preview as PreviewData } from '../fs/types'
import { previewOpen, problem, provider, rootOf, selectedItem } from '../state'
import { activate } from './Results'
import { dateText, iconFor, kindName, sizeText } from './icons'

/** The selected item, shown beside the results. Pages and SVGs are shown as text, never run. */
export function Preview() {
  const item = selectedItem.value
  const prov = provider.value
  const [data, setData] = useState<PreviewData | null>(null)

  useEffect(() => {
    setData(null)
    if (!item || item.kind !== 'file' || !prov.can('preview')) return
    const ctl = new AbortController()
    let url: string | undefined
    prov.preview(item, ctl.signal).then(
      (d) => {
        if ('url' in d) url = d.url
        if (ctl.signal.aborted) return url && URL.revokeObjectURL(url)
        setData(d)
      },
      (e) => ctl.signal.aborted || setData({ kind: 'none', note: (e as Error).message }),
    )
    // the decoded picture or video is let go as soon as another item is selected
    return () => {
      ctl.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [item?.root, item?.path.join('/'), item?.revision])

  return (
    <aside class="preview" aria-label="Preview">
      <div class="preview-head">
        <h2>{item ? item.name : 'Preview'}</h2>
        <button class="icon" aria-label="Close the preview" title="Close the preview" onClick={() => (previewOpen.value = false)}>
          <Icon node={X} size={14} />
        </button>
      </div>
      {!item && <p class="dim">Select a file to see it here. Space shows and hides this pane.</p>}
      {item && (
        <>
          <div class="preview-body">
            {item.kind !== 'file' && <Icon node={iconFor(item)} size={64} />}
            {data?.kind === 'image' && <img src={data.url} alt={`Preview of ${item.name}`} />}
            {data?.kind === 'video' && <video src={data.url} controls preload="metadata" />}
            {data?.kind === 'audio' && <audio src={data.url} controls preload="metadata" />}
            {data?.kind === 'text' && (
              <pre tabIndex={0} aria-label={`Text of ${item.name}`}>
                {data.text}
                {data.truncated && '\n…'}
              </pre>
            )}
            {data?.kind === 'none' && <p class="dim">{data.note}</p>}
            {item.kind === 'file' && !data && <p class="dim quiet">Loading…</p>}
          </div>
          <dl class="facts">
            <dt>Kind</dt>
            <dd>{kindName(item)}</dd>
            <dt>Size</dt>
            <dd>{sizeText(item.size)}</dd>
            <dt>Modified</dt>
            <dd>{dateText(item.modified)}</dd>
            <dt>Where</dt>
            <dd>{[rootOf(item.root)?.name, ...item.path.slice(0, -1)].filter(Boolean).join(' › ')}</dd>
            {item.originalName && item.originalName !== item.name && (
              <>
                <dt>{item.kind === 'tab' ? 'Address' : item.source === 'downloads' ? 'Downloaded as' : 'First named'}</dt>
                <dd>{item.originalName}</dd>
              </>
            )}
          </dl>
          <div class="preview-actions">
            {(item.kind === 'directory' || item.kind === 'tab' || prov.can('open')) && (
              <button onClick={() => activate(item)}>
                <Icon node={ExternalLink} size={14} /> {item.kind === 'tab' ? 'Open Again' : 'Open'}
              </button>
            )}
            {prov.can('reveal') && prov.reveal && item.kind !== 'tab' && (
              <button onClick={() => prov.reveal!(item).catch((e) => (problem.value = (e as Error).message))}>
                <Icon node={FolderOpen} size={14} /> Show in {navigator.platform.startsWith('Mac') ? 'Finder' : 'Files'}
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
