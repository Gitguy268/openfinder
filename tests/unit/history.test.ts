import { expect, test } from 'vitest'
import { goBack, goForward, visit } from '../../src/library/history'

test('back and forward walk the visited places', () => {
  let h = visit(visit({ back: [], current: 'a', forward: [] }, 'b'), 'c')
  h = goBack(h)
  expect(h).toEqual({ back: ['a'], current: 'b', forward: ['c'] })
  expect(goForward(h).current).toBe('c')
})

test('visiting a new place drops the forward list', () => {
  const h = visit(goBack(visit({ back: [], current: 'a', forward: [] }, 'b')), 'c')
  expect(h).toEqual({ back: ['a'], current: 'c', forward: [] })
})

test('nothing happens at either end', () => {
  const h = { back: [], current: 'a', forward: [] }
  expect(goBack(h)).toBe(h)
  expect(goForward(h)).toBe(h)
})
