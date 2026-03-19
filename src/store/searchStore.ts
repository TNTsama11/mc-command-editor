import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { COMMAND_REGISTRY, type CommandDefinition } from '@/core/parser/commands'

export type TagType =
  | 'basic'
  | 'block'
  | 'entity'
  | 'condition'
  | 'data'
  | 'game'
  | 'message'
  | 'world'

export interface SearchResult {
  name: string
  type: 'command' | 'template' | 'history'
  description: string
  usage?: string
  tags: TagType[]
  matchType: 'name' | 'description' | 'tag'
  matchText: string
  commandDef?: CommandDefinition
}

export interface SearchTemplate {
  id: string
  name: string
  description: string
  command: string
  tags: TagType[]
  isFavorite: boolean
  usageCount: number
  createdAt: number
  updatedAt: number
}

export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: number
  resultCount: number
}

export interface SearchFilters {
  tags: TagType[]
  searchInDescription: boolean
  searchInName: boolean
  searchInTags: boolean
  caseSensitive: boolean
}

interface SearchState {
  query: string
  setQuery: (query: string) => void

  filters: SearchFilters
  setFilters: (filters: Partial<SearchFilters>) => void
  resetFilters: () => void

  results: SearchResult[]
  isSearching: boolean
  performSearch: () => void
  clearResults: () => void

  searchHistory: SearchHistoryItem[]
  maxHistorySize: number
  addToSearchHistory: (query: string, resultCount: number) => void
  clearSearchHistory: () => void
  removeFromSearchHistory: (id: string) => void

  templates: SearchTemplate[]
  addTemplate: (
    template: Omit<SearchTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
  ) => void
  updateTemplate: (id: string, updates: Partial<SearchTemplate>) => void
  removeTemplate: (id: string) => void
  toggleFavorite: (id: string) => void
  incrementUsage: (id: string) => void
  getFavoriteTemplates: () => SearchTemplate[]
  getRecentTemplates: (limit?: number) => SearchTemplate[]

  highlightMatches: boolean
  setHighlightMatches: (highlight: boolean) => void
  clearAll: () => void
}

const DEFAULT_FILTERS: SearchFilters = {
  tags: [],
  searchInDescription: true,
  searchInName: true,
  searchInTags: true,
  caseSensitive: false,
}

const COMMAND_TAG_MAP: Record<string, TagType[]> = {
  give: ['basic'],
  clear: ['basic'],
  kill: ['basic'],
  tp: ['basic'],
  teleport: ['basic'],
  setblock: ['block'],
  fill: ['block'],
  clone: ['block'],
  summon: ['entity'],
  effect: ['entity'],
  execute: ['condition'],
  data: ['data'],
  scoreboard: ['data'],
  tag: ['data'],
  gamemode: ['game'],
  gamerule: ['game'],
  time: ['game'],
  weather: ['game'],
  difficulty: ['game'],
  xp: ['game'],
  enchant: ['game'],
  locate: ['world'],
  spreadplayers: ['world'],
  worldborder: ['world'],
  tell: ['message'],
  tellraw: ['message'],
  title: ['message'],
  say: ['message'],
  function: ['data'],
}

export const TAG_LABELS: Record<TagType, string> = {
  basic: '基础命令',
  block: '方块操作',
  entity: '实体操作',
  condition: '条件执行',
  data: '数据操作',
  game: '游戏设置',
  message: '消息与反馈',
  world: '世界操作',
}

function generateId() {
  return `search_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function getCommandTags(commandName: string): TagType[] {
  return COMMAND_TAG_MAP[commandName] || ['basic']
}

function matchText(text: string, query: string, caseSensitive: boolean) {
  if (caseSensitive) {
    return text.includes(query)
  }

  return text.toLowerCase().includes(query.toLowerCase())
}

const now = Date.now()
const DEFAULT_TEMPLATES: SearchTemplate[] = [
  {
    id: 'tpl_give_diamond',
    name: '给予钻石',
    description: '给予玩家一组钻石',
    command: '/give @p minecraft:diamond 64',
    tags: ['basic'],
    isFavorite: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_tp_spawn',
    name: '传送到出生点',
    description: '将玩家传送到世界出生点',
    command: '/tp @p 0 64 0',
    tags: ['basic'],
    isFavorite: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_fill_stone',
    name: '填充石块区域',
    description: '用石块填充指定区域',
    command: '/fill ~ ~ ~ ~10 ~10 ~10 minecraft:stone',
    tags: ['block'],
    isFavorite: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_summon_zombie',
    name: '召唤僵尸',
    description: '在当前位置召唤一只僵尸',
    command: '/summon minecraft:zombie ~ ~ ~',
    tags: ['entity'],
    isFavorite: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_execute_as',
    name: '条件执行',
    description: '以所有玩家身份执行命令',
    command: '/execute as @a at @s run ...',
    tags: ['condition'],
    isFavorite: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_gamemode_creative',
    name: '切换创造模式',
    description: '将玩家切换到创造模式',
    command: '/gamemode creative @p',
    tags: ['game'],
    isFavorite: true,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_time_set_day',
    name: '设置为白天',
    description: '将时间设置为白天',
    command: '/time set day',
    tags: ['game'],
    isFavorite: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'tpl_effect_speed',
    name: '速度效果',
    description: '给予玩家速度效果',
    command: '/effect give @p minecraft:speed 60 1',
    tags: ['entity'],
    isFavorite: false,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  },
]

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      query: '',
      setQuery: (query) => {
        set({ query })
        get().performSearch()
      },

      filters: DEFAULT_FILTERS,
      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }))
        get().performSearch()
      },
      resetFilters: () => {
        set({ filters: DEFAULT_FILTERS })
        get().performSearch()
      },

      results: [],
      isSearching: false,
      performSearch: () => {
        const { query, filters, templates } = get()

        if (!query.trim()) {
          set({ results: [], isSearching: false })
          return
        }

        set({ isSearching: true })
        const results: SearchResult[] = []

        Object.entries(COMMAND_REGISTRY).forEach(([name, definition]) => {
          const tags = getCommandTags(name)
          if (filters.tags.length > 0 && !filters.tags.some((tag) => tags.includes(tag))) {
            return
          }

          let matchType: SearchResult['matchType'] | null = null
          let matchTextValue = ''

          if (filters.searchInName && matchText(name, query, filters.caseSensitive)) {
            matchType = 'name'
            matchTextValue = name
          } else if (
            filters.searchInDescription &&
            matchText(definition.description, query, filters.caseSensitive)
          ) {
            matchType = 'description'
            matchTextValue = definition.description
          } else if (filters.searchInTags) {
            const matchedTag = tags.find((tag) =>
              matchText(TAG_LABELS[tag], query, filters.caseSensitive)
            )
            if (matchedTag) {
              matchType = 'tag'
              matchTextValue = TAG_LABELS[matchedTag]
            }
          }

          if (matchType) {
            results.push({
              name,
              type: 'command',
              description: definition.description,
              tags,
              matchType,
              matchText: matchTextValue,
              commandDef: definition,
            })
          }
        })

        templates.forEach((template) => {
          if (
            filters.tags.length > 0 &&
            !filters.tags.some((tag) => template.tags.includes(tag))
          ) {
            return
          }

          let matchType: SearchResult['matchType'] | null = null
          let matchTextValue = ''

          if (filters.searchInName && matchText(template.name, query, filters.caseSensitive)) {
            matchType = 'name'
            matchTextValue = template.name
          } else if (
            filters.searchInDescription &&
            matchText(template.description, query, filters.caseSensitive)
          ) {
            matchType = 'description'
            matchTextValue = template.description
          } else if (matchText(template.command, query, filters.caseSensitive)) {
            matchType = 'description'
            matchTextValue = template.command
          } else if (filters.searchInTags) {
            const matchedTag = template.tags.find((tag) =>
              matchText(TAG_LABELS[tag], query, filters.caseSensitive)
            )
            if (matchedTag) {
              matchType = 'tag'
              matchTextValue = TAG_LABELS[matchedTag]
            }
          }

          if (matchType) {
            results.push({
              name: template.name,
              type: 'template',
              description: template.description,
              usage: template.command,
              tags: template.tags,
              matchType,
              matchText: matchTextValue,
            })
          }
        })

        set({
          results,
          isSearching: false,
        })
      },
      clearResults: () => set({ results: [] }),

      searchHistory: [],
      maxHistorySize: 20,
      addToSearchHistory: (query, resultCount) => {
        if (!query.trim()) {
          return
        }

        const nextItem: SearchHistoryItem = {
          id: generateId(),
          query,
          timestamp: Date.now(),
          resultCount,
        }

        set((state) => ({
          searchHistory: [nextItem, ...state.searchHistory.filter((item) => item.query !== query)].slice(
            0,
            state.maxHistorySize
          ),
        }))
      },
      clearSearchHistory: () => set({ searchHistory: [] }),
      removeFromSearchHistory: (id) =>
        set((state) => ({
          searchHistory: state.searchHistory.filter((item) => item.id !== id),
        })),

      templates: DEFAULT_TEMPLATES,
      addTemplate: (template) => {
        const timestamp = Date.now()
        const nextTemplate: SearchTemplate = {
          ...template,
          id: generateId(),
          usageCount: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        }

        set((state) => ({
          templates: [nextTemplate, ...state.templates],
        }))
      },
      updateTemplate: (id, updates) =>
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === id
              ? { ...template, ...updates, updatedAt: Date.now() }
              : template
          ),
        })),
      removeTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((template) => template.id !== id),
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === id
              ? {
                  ...template,
                  isFavorite: !template.isFavorite,
                  updatedAt: Date.now(),
                }
              : template
          ),
        })),
      incrementUsage: (id) =>
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === id
              ? {
                  ...template,
                  usageCount: template.usageCount + 1,
                  updatedAt: Date.now(),
                }
              : template
          ),
        })),
      getFavoriteTemplates: () => get().templates.filter((template) => template.isFavorite),
      getRecentTemplates: (limit = 5) =>
        [...get().templates]
          .sort((left, right) => right.usageCount - left.usageCount || right.updatedAt - left.updatedAt)
          .slice(0, limit),

      highlightMatches: true,
      setHighlightMatches: (highlight) => set({ highlightMatches: highlight }),

      clearAll: () => {
        set({
          query: '',
          filters: DEFAULT_FILTERS,
          results: [],
        })
      },
    }),
    {
      name: 'mc-editor-search',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        templates: state.templates,
        filters: state.filters,
        highlightMatches: state.highlightMatches,
      }),
    }
  )
)

export function useSearchState() {
  return useSearchStore((state) => ({
    query: state.query,
    isSearching: state.isSearching,
    results: state.results,
    filters: state.filters,
  }))
}

export function useSearchActions() {
  return useSearchStore((state) => ({
    setQuery: state.setQuery,
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
    performSearch: state.performSearch,
    clearResults: state.clearResults,
    clearAll: state.clearAll,
  }))
}

export function useSearchHistory() {
  return useSearchStore((state) => state.searchHistory)
}

export function useTemplateActions() {
  return useSearchStore((state) => ({
    addTemplate: state.addTemplate,
    updateTemplate: state.updateTemplate,
    removeTemplate: state.removeTemplate,
    toggleFavorite: state.toggleFavorite,
    incrementUsage: state.incrementUsage,
    getFavoriteTemplates: state.getFavoriteTemplates,
    getRecentTemplates: state.getRecentTemplates,
  }))
}
