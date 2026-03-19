import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryConfig {
  maxEntries: number
  expirationTime: number
  enableUndo: boolean
}

export type HistoryAction = 'execute' | 'create' | 'modify' | 'delete'

export interface HistoryItem {
  id: string
  timestamp: number
  action: HistoryAction
  description: string
  data: unknown
  type: 'command' | 'block' | 'project'
  undone?: boolean
}

export interface HistoryStats {
  totalCommands: number
  totalBlocks: number
  lastActionTime: number | null
}

export interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

interface HistoryState {
  history: HistoryItem[]
  redoStack: HistoryItem[]
  config: HistoryConfig
  stats: HistoryStats
  confirmDialog: ConfirmDialogState

  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void
  undo: () => HistoryItem | null
  redo: () => HistoryItem | null
  clearHistory: () => void
  clearExpired: () => void
  removeFromHistory: (id: string) => void
  batchRemove: (ids: string[]) => void
  updateStats: () => void
  updateConfig: (config: Partial<HistoryConfig>) => void
  canUndo: () => boolean
  canRedo: () => boolean
  showConfirmDialog: (options: {
    title: string
    description: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  closeConfirmDialog: () => void
  confirmUndo: () => HistoryItem | null
  getEntriesByTimeRange: (start: number, end: number) => HistoryItem[]
  getEntriesByType: (type: HistoryItem['type']) => HistoryItem[]
  searchEntries: (keyword: string) => HistoryItem[]
}

const DEFAULT_CONFIG: HistoryConfig = {
  maxEntries: 100,
  expirationTime: 24 * 60 * 60 * 1000,
  enableUndo: true,
}

function generateId() {
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function isEntryExpired(entry: HistoryItem, expirationTime: number) {
  if (expirationTime <= 0) return false
  return Date.now() - entry.timestamp > expirationTime
}

function calculateStats(history: HistoryItem[]): HistoryStats {
  return {
    totalCommands: history.filter((item) => item.type === 'command').length,
    totalBlocks: history.filter((item) => item.type === 'block').length,
    lastActionTime: history[0]?.timestamp ?? null,
  }
}

function createEmptyConfirmDialog(): ConfirmDialogState {
  return {
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    onCancel: null,
  }
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      redoStack: [],
      config: DEFAULT_CONFIG,
      stats: {
        totalCommands: 0,
        totalBlocks: 0,
        lastActionTime: null,
      },
      confirmDialog: createEmptyConfirmDialog(),

      addToHistory: (item) => {
        const { config } = get()
        const nextItem: HistoryItem = {
          ...item,
          id: generateId(),
          timestamp: Date.now(),
          undone: false,
        }

        set((state) => {
          const unexpiredHistory =
            config.expirationTime > 0
              ? state.history.filter((entry) => !isEntryExpired(entry, config.expirationTime))
              : state.history

          const nextHistory = [nextItem, ...unexpiredHistory].slice(0, config.maxEntries)

          return {
            history: nextHistory,
            redoStack: [],
            stats: calculateStats(nextHistory),
          }
        })
      },

      undo: () => {
        const { history, redoStack, confirmDialog } = get()
        if (history.length === 0 || confirmDialog.open) {
          return null
        }

        const [latest, ...remaining] = history

        set({
          history: remaining,
          redoStack: [latest, ...redoStack],
          stats: calculateStats(remaining),
        })

        return latest
      },

      redo: () => {
        const { redoStack } = get()
        if (redoStack.length === 0) {
          return null
        }

        const [latest, ...remaining] = redoStack

        set((state) => {
          const nextHistory = [latest, ...state.history]
          return {
            redoStack: remaining,
            history: nextHistory,
            stats: calculateStats(nextHistory),
          }
        })

        return latest
      },

      clearHistory: () =>
        set({
          history: [],
          redoStack: [],
          stats: {
            totalCommands: 0,
            totalBlocks: 0,
            lastActionTime: null,
          },
        }),

      clearExpired: () => {
        const { config, history } = get()
        if (config.expirationTime <= 0) {
          return
        }

        const nextHistory = history.filter((entry) => !isEntryExpired(entry, config.expirationTime))
        set({
          history: nextHistory,
          stats: calculateStats(nextHistory),
        })
      },

      removeFromHistory: (id) =>
        set((state) => {
          const nextHistory = state.history.filter((item) => item.id !== id)
          return {
            history: nextHistory,
            stats: calculateStats(nextHistory),
          }
        }),

      batchRemove: (ids) =>
        set((state) => {
          const idSet = new Set(ids)
          const nextHistory = state.history.filter((item) => !idSet.has(item.id))
          return {
            history: nextHistory,
            stats: calculateStats(nextHistory),
          }
        }),

      updateStats: () => {
        set((state) => ({
          stats: calculateStats(state.history),
        }))
      },

      updateConfig: (config) =>
        set((state) => {
          const nextConfig = { ...state.config, ...config }
          const nextHistory = state.history.slice(0, nextConfig.maxEntries)

          return {
            config: nextConfig,
            history: nextHistory,
            stats: calculateStats(nextHistory),
          }
        }),

      canUndo: () => get().history.length > 0,
      canRedo: () => get().redoStack.length > 0,

      showConfirmDialog: ({ title, description, onConfirm, onCancel }) =>
        set({
          confirmDialog: {
            open: true,
            title,
            description,
            onConfirm,
            onCancel: onCancel ?? null,
          },
        }),

      closeConfirmDialog: () => {
        const { confirmDialog } = get()
        confirmDialog.onCancel?.()
        set({ confirmDialog: createEmptyConfirmDialog() })
      },

      confirmUndo: () => {
        const { confirmDialog } = get()
        confirmDialog.onConfirm?.()
        const undone = get().undo()
        set({ confirmDialog: createEmptyConfirmDialog() })
        return undone
      },

      getEntriesByTimeRange: (start, end) =>
        get().history.filter((entry) => entry.timestamp >= start && entry.timestamp <= end),

      getEntriesByType: (type) => get().history.filter((entry) => entry.type === type),

      searchEntries: (keyword) => {
        const normalizedKeyword = keyword.toLowerCase()
        return get().history.filter(
          (entry) =>
            entry.description.toLowerCase().includes(normalizedKeyword) ||
            entry.action.toLowerCase().includes(normalizedKeyword)
        )
      },
    }),
    {
      name: 'mc-editor-history',
      partialize: (state) => ({
        history: state.history,
        redoStack: state.redoStack,
        config: state.config,
        stats: state.stats,
      }),
    }
  )
)

export function useHistoryActions() {
  return useHistoryStore((state) => ({
    addToHistory: state.addToHistory,
    undo: state.undo,
    redo: state.redo,
    clearHistory: state.clearHistory,
    removeFromHistory: state.removeFromHistory,
    batchRemove: state.batchRemove,
    confirmUndo: state.confirmUndo,
    showConfirmDialog: state.showConfirmDialog,
    closeConfirmDialog: state.closeConfirmDialog,
  }))
}

export function useHistoryStats() {
  return useHistoryStore((state) => state.stats)
}

export function useUndoRedoState() {
  return {
    canUndo: useHistoryStore((state) => state.history.length > 0),
    canRedo: useHistoryStore((state) => state.redoStack.length > 0),
  }
}

export function useHistoryConfig() {
  return useHistoryStore((state) => state.config)
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = Date.now()
  const diffMs = now - timestamp
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getActionText(action: HistoryAction): string {
  const labels: Record<HistoryAction, string> = {
    execute: '执行',
    create: '创建',
    modify: '修改',
    delete: '删除',
  }

  return labels[action]
}

export function getActionStyle(action: HistoryAction): string {
  const styles: Record<HistoryAction, string> = {
    execute: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    create: 'bg-green-500/10 text-green-600 border-green-500/20',
    modify: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    delete: 'bg-red-500/10 text-red-600 border-red-500/20',
  }

  return styles[action]
}

export function getTypeText(type: HistoryItem['type']): string {
  const labels: Record<HistoryItem['type'], string> = {
    command: '命令',
    block: '方块',
    project: '项目',
  }

  return labels[type]
}
