import { create } from 'zustand'

import { RESOURCE_CATALOG } from '@/core/resources/catalog'
import { searchResources } from '@/core/resources/search'
import type { ResourceEntry, ResourceKind } from '@/core/resources/types'

const MAX_RECENT_RESOURCES = 8

interface ResourceState {
  query: string
  kind?: ResourceKind
  recentResourceIds: string[]

  setQuery: (query: string) => void
  setKind: (kind?: ResourceKind) => void
  selectResource: (resourceId: string) => void
  getResults: () => ResourceEntry[]
  getRecentResources: (kind?: ResourceKind) => ResourceEntry[]
  reset: () => void
}

function dedupeRecent(ids: string[], nextId: string) {
  return [nextId, ...ids.filter((id) => id !== nextId)].slice(0, MAX_RECENT_RESOURCES)
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  query: '',
  kind: undefined,
  recentResourceIds: [],

  setQuery: (query) => set({ query }),
  setKind: (kind) => set({ kind }),
  selectResource: (resourceId) =>
    set((state) => ({
      recentResourceIds: dedupeRecent(state.recentResourceIds, resourceId),
    })),
  getResults: () => {
    const { query, kind } = get()
    return searchResources(query, RESOURCE_CATALOG, { kind })
  },
  getRecentResources: (kind) => {
    const recentIds = get().recentResourceIds

    return recentIds
      .map((id) => RESOURCE_CATALOG.find((entry) => entry.id === id))
      .filter((entry): entry is ResourceEntry => Boolean(entry))
      .filter((entry) => !kind || entry.kind === kind)
  },
  reset: () =>
    set({
      query: '',
      kind: undefined,
      recentResourceIds: [],
    }),
}))
