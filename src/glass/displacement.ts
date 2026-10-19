/*
 * The edge refraction profile (incidence angle from the squared distance ratio, Snell's law,
 * tangent of the angle difference) is adapted from liquid-glass-studio by Charles Yin, MIT License:
 * https://github.com/iyinchao/liquid-glass-studio/blob/main/src/shaders/fragment-main.glsl
 * The original computes it per pixel in a WebGL shader; here it fills an SVG displacement map.
 */

export interface GlassShape {
  width: number
  height: number
  radius: number
  /** How far the bending reaches in from the edge, in pixels. */
  thickness: number
  /** Index of refraction; 1.5 is window glass. */
  ior?: number
}

/**
 * RGBA pixels for an SVG feDisplacementMap over a rounded rectangle.
 * Red is the horizontal offset and green the vertical one; 128 means no offset.
 */
export function displacementMap({ width, height, radius, thickness, ior = 1.5 }: GlassShape): Uint8ClampedArray<ArrayBuffer> {
  const data = new Uint8ClampedArray(width * height * 4)
  const hx = width / 2
  const hy = height / 2
  const r = Math.min(radius, hx, hy)
  // the profile's value at the very rim, used to scale it to 0..1
  const rim = Math.tan(Math.PI / 2 - Math.asin(1 / ior))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - hx
      const py = y + 0.5 - hy
      // signed distance to the rounded rectangle and its outward normal
      const qx = Math.abs(px) - (hx - r)
      const qy = Math.abs(py) - (hy - r)
      let distance: number, nx: number, ny: number
      if (qx > 0 && qy > 0) {
        const length = Math.hypot(qx, qy)
        distance = length - r
        nx = (qx / length) * Math.sign(px)
        ny = (qy / length) * Math.sign(py)
      } else if (qx > qy) {
        distance = qx - r
        nx = Math.sign(px)
        ny = 0
      } else {
        distance = qy - r
        nx = 0
        ny = Math.sign(py)
      }

      const depth = -distance
      let bend = 0
      if (depth >= 0 && depth < thickness) {
        const ratio = 1 - depth / thickness
        const incidence = Math.asin(ratio ** 2)
        const refracted = Math.asin(Math.sin(incidence) / ior)
        bend = -Math.tan(refracted - incidence) / rim
      }

      // the filter reads the backdrop at (position + offset): pull from the inside, as a lens rim does
      const i = (y * width + x) * 4
      data[i] = 128 - nx * bend * 127
      data[i + 1] = 128 - ny * bend * 127
      data[i + 2] = 128
      data[i + 3] = 255
    }
  }
  return data
}
