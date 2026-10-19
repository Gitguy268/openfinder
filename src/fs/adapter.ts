export interface Entry {
  name: string
  kind: 'file' | 'directory'
}

/** A place files can live: a granted folder, the browser sandbox, later an opened archive. */
export interface Fs {
  list(path: string[]): Promise<Entry[]>
}

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Granted local folders and the sandbox (OPFS) are both directory handles. */
export function handleFs(root: FileSystemDirectoryHandle): Fs {
  return {
    async list(path) {
      let dir = root
      for (const name of path) dir = await dir.getDirectoryHandle(name)
      const entries: Entry[] = []
      // names starting with a dot stay hidden, as in Finder
      for await (const handle of dir.values()) if (!handle.name.startsWith('.')) entries.push({ name: handle.name, kind: handle.kind })
      return entries.sort((a, b) => byName.compare(a.name, b.name))
    },
  }
}
