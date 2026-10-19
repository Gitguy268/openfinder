import type { ComponentProps } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { displacementMap } from './displacement'
import './glass.css'

const SVG = 'http://www.w3.org/2000/svg'
const EDGE = 14 // px the bending reaches inward
const STRENGTH = 80 // feDisplacementMap scale; the profile peaks near half, so the rim shifts about 19px

let filters: SVGSVGElement | undefined
let count = 0
const canvas = document.createElement('canvas')

function svg(name: string, attrs: Record<string, string>) {
  const el = document.createElementNS(SVG, name)
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  return el
}

/** Gives an element a refraction filter that follows its size. Returns a cleanup function. */
function refract(el: HTMLElement) {
  if (!filters) {
    filters = svg('svg', { width: '0', height: '0', 'aria-hidden': 'true' }) as SVGSVGElement
    filters.style.position = 'absolute'
    document.body.append(filters)
  }
  const id = `glass-${count++}`
  const filter = svg('filter', { id, x: '0', y: '0', width: '100%', height: '100%', 'color-interpolation-filters': 'sRGB' })
  const image = svg('feImage', { x: '0', y: '0', result: 'map', preserveAspectRatio: 'none' })
  const displace = svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: String(STRENGTH), xChannelSelector: 'R', yChannelSelector: 'G' })
  filter.append(image, displace)
  filters.append(filter)

  const observer = new ResizeObserver(() => {
    const width = el.offsetWidth
    const height = el.offsetHeight
    if (!width || !height) return
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
    canvas.width = width
    canvas.height = height
    const pixels = displacementMap({ width, height, radius, thickness: EDGE })
    canvas.getContext('2d')!.putImageData(new ImageData(pixels, width, height), 0, 0)
    image.setAttribute('href', canvas.toDataURL())
    image.setAttribute('width', String(width))
    image.setAttribute('height', String(height))
    el.style.setProperty('--refract', `url(#${id})`)
  })
  observer.observe(el)
  return () => {
    observer.disconnect()
    filter.remove()
  }
}

/** A Liquid Glass surface: blurred, tinted backdrop with the edges bent like a lens. */
export function Glass({ class: className, children, ...rest }: ComponentProps<'div'>) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => refract(ref.current!), [])
  return (
    <div ref={ref} class={`glass ${className ?? ''}`} {...rest}>
      {children}
    </div>
  )
}
