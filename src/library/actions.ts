import { checkName } from '../fs/contract/naming.mjs'
import type { Item } from '../fs/types'
import { problem, provider, rename, trash } from '../state'
import { askText } from './ask'

/** Asks for a new name, checks it the way Xiao will, then renames. */
export async function renameItem(item: Item) {
  if (!provider.value.can('rename') || item.source === 'collection') return
  const name = await askText(`Rename “${item.name}”`, 'New name', item.name, 'Rename')
  if (!name || name === item.name) return
  const why = checkName(item.name, name)
  if (why) return (problem.value = why)
  await rename([{ item, name }])
}

export async function trashItem(item: Item) {
  if (provider.value.can('trash') && item.source !== 'collection') await trash([item])
}
