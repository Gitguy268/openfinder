/** Back/forward history, as in a browser: visiting a new place drops the forward list. */
export interface History<T> {
  back: T[]
  current: T
  forward: T[]
}

export const visit = <T>(h: History<T>, to: T): History<T> => ({ back: [...h.back, h.current], current: to, forward: [] })

export const goBack = <T>(h: History<T>): History<T> =>
  h.back.length ? { back: h.back.slice(0, -1), current: h.back.at(-1)!, forward: [h.current, ...h.forward] } : h

export const goForward = <T>(h: History<T>): History<T> =>
  h.forward.length ? { back: [...h.back, h.current], current: h.forward[0], forward: h.forward.slice(1) } : h
