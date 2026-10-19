import { expect, test } from 'vitest'
import { displacementMap } from '../../src/glass/displacement'

const shape = { width: 120, height: 40, radius: 20, thickness: 10 }
const pixel = (data: Uint8ClampedArray, x: number, y: number) => [...data.slice((y * shape.width + x) * 4, (y * shape.width + x) * 4 + 4)]

test('the middle of the glass does not bend the backdrop', () => {
  expect(pixel(displacementMap(shape), 60, 20)).toEqual([128, 128, 128, 255])
})

test('edges pull the backdrop inward, mirrored on opposite sides', () => {
  const data = displacementMap(shape)
  const [, top] = pixel(data, 60, 0)
  const [, bottom] = pixel(data, 60, 39)
  expect(top).toBeGreaterThan(160) // top edge reads from below
  expect(top + bottom).toBe(256)
  const [left] = pixel(data, 0, 20)
  expect(left).toBeGreaterThan(160)
})

test('bending is strongest at the rim and fades toward the middle', () => {
  const data = displacementMap(shape)
  const strength = (y: number) => pixel(data, 60, y)[1] - 128
  expect(strength(0)).toBeGreaterThan(strength(4))
  expect(strength(4)).toBeGreaterThan(strength(9))
  expect(strength(12)).toBe(0)
})

test('pixels outside the rounded corner are left alone', () => {
  expect(pixel(displacementMap(shape), 0, 0)).toEqual([128, 128, 128, 255])
})
