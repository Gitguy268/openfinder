// Key-value storage in IndexedDB. Unlike localStorage it can hold folder handles.
let db: Promise<IDBDatabase> | undefined

function open() {
  return (db ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('openfinder', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('kv')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }))
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const store = (await open()).transaction('kv', mode).objectStore('kv')
  return new Promise<T>((resolve, reject) => {
    const request = action(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const load = <T>(key: string) => run<T | undefined>('readonly', (store) => store.get(key))
export const save = (key: string, value: unknown) => run('readwrite', (store) => store.put(value, key))
