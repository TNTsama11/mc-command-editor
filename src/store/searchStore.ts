/**
 * 搜索状态管理 Store
 * 实现命令搜索、过滤、历史记录和预设模板功能
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { COMMAND_REGISTRY, type CommandDefinition } from '@/core/parser/commands'

// ============================================================================
// 类型定义
// ============================================================================

/** 标签类型枚举 */
export type TagType =
  | 'basic'      // 基础命令
  | 'block'      // 方块操作
  | 'entity'     // 实体操作
  | 'condition'  // 条件执行
  | 'data'       // 数据操作
  | 'game'       // 游戏设置
  | 'message'    // 消息
  | 'world'      // 世界操作

/** 搜索结果项 */
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

/** 预设模板 */
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

/** 搜索历史项 */
export interface SearchHistoryItem {
  id: string
  query: string
  timestamp: number
  resultCount: number
}

/** 搜索过滤条件 */
export interface SearchFilters {
  tags: TagType[]
  searchInDescription: boolean
  searchInName: boolean
  searchInTags: boolean
  caseSensitive: boolean
}

/** 搜索状态 */
interface SearchState {
  // 搜索查询
  query: string
  setQuery: (query: string) => void

  // 过滤条件
  filters: SearchFilters
  setFilters: (filters: Partial<SearchFilters>) => void
  resetFilters: () => void

  // 搜索结果
  results: SearchResult[]
  isSearching: boolean
  performSearch: () => void
  clearResults: () => void

  // 搜索历史
  searchHistory: SearchHistoryItem[]
  maxHistorySize: number
  addToSearchHistory: (query: string, resultCount: number) => void
  clearSearchHistory: () => void
  removeFromSearchHistory: (id: string) => void

  // 预设模板
  templates: SearchTemplate[]
  addTemplate: (template: Omit<SearchTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => void
  updateTemplate: (id: string, updates: Partial<SearchTemplate>) => void
  removeTemplate: (id: string) => void
  toggleFavorite: (id: string) => void
  incrementUsage: (id: string) => void
  getFavoriteTemplates: () => SearchTemplate[]
  getRecentTemplates: (limit?: number) => SearchTemplate[]

  // 高亮匹配
  highlightMatches: boolean
  setHighlightMatches: (highlight: boolean) => void

  // 清除所有搜索条件
  clearAll: () => void
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 生成唯一ID */
function generateId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** 命令标签映射 */
const COMMAND_TAG_MAP: Record<string, TagType[]> = {
  // 基础命令
  give: ['basic'],
  clear: ['basic'],
  kill: ['basic'],
  tp: ['basic'],
  teleport: ['basic'],

  // 方块操作
  setblock: ['block'],
  fill: ['block'],
  clone: ['block'],

  // 实体操作
  summon: ['entity'],
  effect: ['entity'],

  // 条件执行
  execute: ['condition'],

  // 数据操作
  data: ['data'],
  scoreboard: ['data'],
  tag: ['data'],

  // 游戏设置
  gamemode: ['game'],
  gamerule: ['game'],
  time: ['game'],
  weather: ['game'],
  difficulty: ['game'],

  // 玩家操作
  xp: ['game'],
  enchant: ['game'],

  // 世界操作
  locate: ['world'],
  spreadplayers: ['world'],
  worldborder: ['world'],

  // 消息
  tell: ['message'],
  tellraw: ['message'],
  title: ['message'],
  say: ['message'],

  // 函数
  function: ['data'],
}

/** 获取命令标签 */
function getCommandTags(commandName: string): TagType[] {
  return COMMAND_TAG_MAP[commandName] || ['basic']
}

/** 标签显示名称 */
export const TAG_LABELS: Record<TagType, string> = {
  basic: '基础命令',
  block: '方块操作',
  entity: '实体操作',
  condition: '条件执行',
  data: '数据操作',
  game: '游戏设置',
  message: '消息',
  world: '世界操作',
}

/** 默认过滤条件 */
const DEFAULT_FILTERS: SearchFilters = {
  tags: [],
  searchInDescription: true,
  searchInName: true,
  searchInTags: true,
  caseSensitive: false,
}

/** 预设的常用模板 */
const DEFAULT_TEMPLATES: SearchTemplate[] = [
  {
    id: 'tpl_give_diamond',
    name: '给予钻石',
    description: '给予玩家一组钻石',
    command: '/give @p minecraft:diamond 64',
    tags: ['basic'],
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_tp_spawn',
    name: '传送到出生点',
    description: '将玩家传送到世界出生点',
    command: '/tp @p 0 64 0',
    tags: ['basic'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_fill_stone',
    name: '填充石块区域',
    description: '用石块填充指定区域',
    command: '/fill ~ ~ ~ ~10 ~10 ~10 minecraft:stone',
    tags: ['block'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_summon_zombie',
    name: '召唤僵尸',
    description: '在当前位置召唤一个僵尸',
    command: '/summon minecraft:zombie ~ ~ ~',
    tags: ['entity'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_execute_as',
    name: '条件执行',
    description: '以所有玩家身份执行命令',
    command: '/execute as @a at @s run ...',
    tags: ['condition'],
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_gamemode_creative',
    name: '切换创造模式',
    description: '将玩家切换到创造模式',
    command: '/gamemode creative @p',
    tags: ['game'],
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_time_set_day',
    name: '设置为白天',
    description: '将时间设置为中午',
    command: '/time set day',
    tags: ['game'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tpl_effect_speed',
    name: '速度效果',
    description: '给予玩家速度效果',
    command: '/effect give @p minecraft:speed 60 1',
    tags: ['entity'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

// ============================================================================
// 搜索 Store
// ============================================================================

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // 搜索查询
      query: '',
      setQuery: (query) => {
        set({ query })
        // 实时搜索
        get().performSearch()
      },

      // 过滤条件
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

      // 搜索结果
      results: [],
      isSearching: false,
      performSearch: () => {
        const { query, filters, templates } = get()

        if (!query.trim()) {
          set({ results: [], isSearching: false })
          return
        }

        set({ isSearching: true })

        const searchQuery = filters.caseSensitive ? query : query.toLowerCase()
        const results: SearchResult[] = []

        // 搜索命令
        Object.entries(COMMAND_REGISTRY).forEach(([name, def]) => {
          const tags = getCommandTags(name)

          // 标签过滤
          if (filters.tags.length > 0 && !filters.tags.some((t) => tags.includes(t))) {
            return
          }

          let matched = false
          let matchType: SearchResult['matchType'] = 'name'
          let matchText = ''

          const nameToMatch = filters.caseSensitive ? name : name.toLowerCase()
          const descToMatch = filters.caseSensitive ? def.description : def.description.toLowerCase()

          // 名称匹配
          if (filters.searchInName && nameToMatch.includes(searchQuery)) {
            matched = true
            matchType = 'name'
            matchText = name
          }

          // 描述匹配
          if (!matched && filters.searchInDescription && descToMatch.includes(searchQuery)) {
            matched = true
            matchType = 'description'
            matchText = def.description
          }

          // 标签匹配
          if (!matched && filters.searchInTags) {
            const matchedTag = tags.find((tag) =>
              (filters.caseSensitive ? TAG_LABELS[tag] : TAG_LABELS[tag].toLowerCase()).includes(searchQuery)
            )
            if (matchedTag) {
              matched = true
              matchType = 'tag'
              matchText = TAG_LABELS[matchedTag]
            }
          }

          if (matched) {
            results.push({
              name,
              type: 'command',
              description: def.description,
              tags,
              matchType,
              matchText,
              commandDef: def,
            })
          }
        })

        // 搜索预设模板
        templates.forEach((template) => {
          // 标签过滤
          if (filters.tags.length > 0 && !filters.tags.some((t) => template.tags.includes(t))) {
            return
          }

          let matched = false
          let matchType: SearchResult['matchType'] = 'name'
          let matchText = ''

          const nameToMatch = filters.caseSensitive ? template.name : template.name.toLowerCase()
          const descToMatch = filters.caseSensitive ? template.description : template.description.toLowerCase()
          const cmdToMatch = filters.caseSensitive ? template.command : template.command.toLowerCase()

          // 名称匹配
          if (filters.searchInName && nameToMatch.includes(searchQuery)) {
            matched = true
            matchType = 'name'
            matchText = template.name
          }

          // 描述匹配
          if (!matched && filters.searchInDescription && descToMatch.includes(searchQuery)) {
            matched = true
            matchType = 'description'
            matchText = template.description
          }

          // 命令内容匹配
          if (!matched && cmdToMatch.includes(searchQuery)) {
            matched = true
            matchType = 'description'
            matchText = template.command
          }

          // 标签匹配
          if (!matched && filters.searchInTags) {
            const matchedTag = template.tags.find((tag) =>
              (filters.caseSensitive ? TAG_LABELS[tag] : TAG_LABELS[tag].toLowerCase()).includes(searchQuery)
            )
            if (matchedTag) {
              matched = true
              matchType = 'tag'
              matchText = TAG_LABELS[matchedTag]
            }
          }

          if (matched) {
            results.push({
              name: template.name,
              type: 'template',
              description: template.description,
              usage: template.command,
              tags: template.tags,
              matchType,
              matchText,
            })
          }
        })

        set({ results, isSearching: false })
      },
      clearResults: () => set({ results: [] }),

      // 搜索历史
      searchHistory: [],
      maxHistorySize: 20,
      addToSearchHistory: (query, resultCount) => {
        if (!query.trim()) return

        const newItem: SearchHistoryItem = {
          id: generateId(),
          query,
          timestamp: Date.now(),
          resultCount,
        }

        set((state) => {
          // 移除相同的查询
          const filtered = state.searchHistory.filter((item) => item.query !== query)
          return {
            searchHistory: [newItem, ...filtered].slice(0, state.maxHistorySize),
          }
        })
      },
      clearSearchHistory: () => set({ searchHistory: [] }),
      removeFromSearchHistory: (id) => {
        set((state) => ({
          searchHistory: state.searchHistory.filter((item) => item.id !== id),
        }))
      },

      // 预设模板
      templates: DEFAULT_TEMPLATES,
      addTemplate: (template) => {
        const now = Date.now()
        const newTemplate: SearchTemplate = {
          ...template,
          id: generateId(),
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          templates: [newTemplate, ...state.templates],
        }))
      },
      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        }))
      },
      removeTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }))
      },
      toggleFavorite: (id) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, isFavorite: !t.isFavorite, updatedAt: Date.now() } : t
          ),
        }))
      },
      incrementUsage: (id) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, usageCount: t.usageCount + 1, updatedAt: Date.now() } : t
          ),
        }))
      },
      getFavoriteTemplates: () => {
        return get().templates.filter((t) => t.isFavorite)
      },
      getRecentTemplates: (limit = 5) => {
        return [...get().templates]
          .sort((a, b) => b.usageCount - a.usageCount || b.updatedAt - a.updatedAt)
          .slice(0, limit)
      },

      // 高亮匹配
      highlightMatches: true,
      setHighlightMatches: (highlight) => set({ highlightMatches: highlight }),

      // 清除所有
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

// ============================================================================
// 导出 Hooks
// ============================================================================

/** 获取搜索状态 */
export function useSearchState() {
  return useSearchStore((state) => ({
    query: state.query,
    isSearching: state.isSearching,
    results: state.results,
    filters: state.filters,
  }))
}

/** 获取搜索操作 */
export function useSearchActions() {
  const store = useSearchStore

  return {
    setQuery: store.getState().setQuery,
    setFilters: store.getState().setFilters,
    resetFilters: store.getState().resetFilters,
    performSearch: store.getState().performSearch,
    clearResults: store.getState().clearResults,
    clearAll: store.getState().clearAll,
  }
}

/** 获取搜索历史 */
export function useSearchHistory() {
  return useSearchStore((state) => state.searchHistory)
}

/** 获取模板操作 */
export function useTemplateActions() {
  const store = useSearchStore

  return {
    addTemplate: store.getState().addTemplate,
    updateTemplate: store.getState().updateTemplate,
    removeTemplate: store.getState().removeTemplate,
    toggleFavorite: store.getState().toggleFavorite,
    incrementUsage: store.getState().incrementUsage,
    getFavoriteTemplates: store.getState().getFavoriteTemplates,
    getRecentTemplates: store.getState().getRecentTemplates,
  }
}
