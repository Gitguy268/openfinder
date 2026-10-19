import { h } from 'preact'
import type { IconNode } from 'lucide'

/** Renders a Lucide icon (ISC License, https://lucide.dev). */
export function Icon({ node, size = 16 }: { node: IconNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {node.map(([tag, attrs]) => h(tag, attrs as Record<string, string>))}
    </svg>
  )
}
