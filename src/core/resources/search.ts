import type { ResourceEntry, ResourceSearchOptions } from './types'

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function computeScore(entry: ResourceEntry, query: string) {
  if (!query) {
    return 0
  }

  const id = normalize(entry.id)
  const name = normalize(entry.name)
  const aliases = entry.aliases?.map(normalize) ?? []

  if (id === query || name === query || aliases.includes(query)) {
    return 3
  }

  if (id.includes(query) || name.includes(query) || aliases.some((alias) => alias.includes(query))) {
    return 2
  }

  if (entry.kind.includes(query)) {
    return 1
  }

  return -1
}

export function searchResources(
  query: string,
  catalog: ResourceEntry[],
  options: ResourceSearchOptions = {}
) {
  const normalizedQuery = normalize(query)

  return catalog
    .filter((entry) => !options.kind || entry.kind === options.kind)
    .map((entry) => ({
      entry,
      score: computeScore(entry, normalizedQuery),
    }))
    .filter((item) => (normalizedQuery ? item.score >= 0 : true))
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name))
    .map((item) => item.entry)
}
