// Original drawings for OpenFinder. Colours come from tokens.css.

export const FolderIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M6 16a5 5 0 0 1 5-5h13.2a5 5 0 0 1 3.7 1.6l2.6 2.8a2 2 0 0 0 1.5.6H53a5 5 0 0 1 5 5v6H6z" fill="var(--folder-back)" />
    <rect x="6" y="20" width="52" height="34" rx="5" fill="var(--folder-front)" />
    <rect x="6" y="20" width="52" height="1.5" rx=".75" fill="#fff" fill-opacity=".45" />
  </svg>
)

export function FileIcon({ name }: { name: string }) {
  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot + 1).toUpperCase() : ''
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M15 9a4 4 0 0 1 4-4h19l11 11v39a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z" fill="var(--page)" stroke="var(--page-edge)" />
      <path d="M38 5v8a3 3 0 0 0 3 3h8z" fill="var(--page-edge)" fill-opacity=".45" />
      {extension.length > 0 && extension.length <= 4 && (
        <text x="32" y="46" text-anchor="middle" font-size="9" font-weight="700" fill="var(--page-edge)">
          {extension}
        </text>
      )}
    </svg>
  )
}
