/**
 * 命令历史记录状态管理 Store
 *
 * 功能:
 * - 保存命令执行历史
 * - 支持撤销/重做操作
 * - 命令数量限制 (可配置, 默认 100 条)
 * - 时间范围限制 (可配置, 默认 24 小时过期)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 历史记录配置
 */
export interface HistoryConfig {
  /** 最大历史条目数量 */
  maxEntries: number
  /** 历史记录过期时间 (毫秒), 0 表示不过期 */
  expirationTime: number
  /** 是否启用撤销功能 */
  enableUndo: boolean
}

/**
 * 历史记录项类型
 */
export interface HistoryItem {
  id: string
  timestamp: number
  action: HistoryAction
  description: string
  data: unknown
  type: 'command' | 'block' | 'project'
  /** 是否已撤销 */
  undone?: boolean
}

/**
 * 历史操作类型
 */
export type HistoryAction = 'execute' | 'create' | 'modify' | 'delete'

/**
 * 历史统计信息
 */
export interface HistoryStats {
  totalCommands: number
  totalBlocks: number
  lastActionTime: number | null
}

/**
 * 确认对话框状态
 */
export interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: HistoryConfig = {
  maxEntries: 100,
  expirationTime: 24 * 60 * 60 * 1000, // 24 小时
  enableUndo: true,
}

/**
 * 历史记录状态接口
 */
interface HistoryState {
  // 历史记录列表
  history: HistoryItem[]
  // 已撤销的操作栈（用于重做）
  redoStack: HistoryItem[]
  // 配置
  config: HistoryConfig
  // 统计信息
  stats: HistoryStats
  // 确认对话框状态
  confirmDialog: ConfirmDialogState

  // 添加历史记录
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void
  // 撤销操作
  undo: () => HistoryItem | null
  // 重做操作
  redo: () => HistoryItem | null
  // 清空历史
  clearHistory: () => void
  // 清理过期条目
  clearExpired: () => void
  // 从历史中移除指定项
  removeFromHistory: (id: string) => void
  // 批量删除
  batchRemove: (ids: string[]) => void
  // 更新统计信息
  updateStats: () => void
  // 更新配置
  updateConfig: (config: Partial<HistoryConfig>) => void
  // 获取可撤销状态
  canUndo: () => boolean
  // 获取可重做状态
  canRedo: () => boolean
  // 显示确认对话框
  showConfirmDialog: (options: {
    title: string
    description: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  // 关闭确认对话框
  closeConfirmDialog: () => void
  // 确认撤销
  confirmUndo: () => void
  // 按时间范围获取条目
  getEntriesByTimeRange: (start: number, end: number) => HistoryItem[]
  // 按类型获取条目
  getEntriesByType: (type: HistoryItem['type']) => HistoryItem[]
  // 搜索条目
  searchEntries: (keyword: string) => HistoryItem[]
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 检查条目是否过期
 */
function isEntryExpired(entry: HistoryItem, expirationTime: number): boolean {
  if (expirationTime <= 0) return false
  return Date.now() - entry.timestamp > expirationTime
}

/**
 * 历史记录 Store
 */
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
      confirmDialog: {
        open: false,
        title: '',
        description: '',
        onConfirm: null,
        onCancel: null,
      },

      /**
       * 添加历史记录
       */
      addToHistory: (item) => {
        const { config } = get()
        const newItem: HistoryItem = {
          ...item,
          id: generateId(),
          timestamp: Date.now(),
          undone: false,
        }

        set((state) => {
          // 清理过期条目
          let filteredHistory = state.history
          if (config.expirationTime > 0) {
            filteredHistory = state.history.filter(
              (entry) => !isEntryExpired(entry, config.expirationTime)
            )
          }

          // 添加新记录到历史列表开头，并限制数量
          const newHistory = [newItem, ...filteredHistory].slice(0, config.maxEntries)

          // 添加新操作时清空重做栈
          return {
            history: newHistory,
            redoStack: [],
          }
        })

        // 更新统计
        get().updateStats()
      },

      /**
       * 撤销操作
       */
      undo: () => {
        const { history, redoStack, confirmDialog } = get()

        if (history.length === 0) {
          return null
        }

        // 如果确认对话框已打开，直接执行撤销
        if (confirmDialog.open) {
          return null
        }

        // 取出最近的历史记录
        const [lastItem, ...remainingHistory] = history

        set({
          history: remainingHistory,
          redoStack: [lastItem, ...redoStack],
        })

        // 更新统计
        get().updateStats()

        return lastItem
      },

      /**
       * 重做操作
       */
      redo: () => {
        const { redoStack } = get()

        if (redoStack.length === 0) {
          return null
        }

        // 取出最近的重做记录
        const [lastRedo, ...remainingRedo] = redoStack

        set((state) => ({
          redoStack: remainingRedo,
          history: [lastRedo, ...state.history],
        }))

        // 更新统计
        get().updateStats()

        return lastRedo
      },

      /**
       * 清空历史记录
       */
      clearHistory: () => {
        set({
          history: [],
          redoStack: [],
          stats: {
            totalCommands: 0,
            totalBlocks: 0,
            lastActionTime: null,
          },
        })
      },

      /**
       * 清理过期条目
       */
      clearExpired: () => {
        const { config, history } = get()
        if (config.expirationTime <= 0) return

        set({
          history: history.filter((entry) => !isEntryExpired(entry, config.expirationTime)),
        })

        get().updateStats()
      },

      /**
       * 更新配置
       */
      updateConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }))

        // 如果新的配置减少了最大条目数，需要裁剪现有历史
        const { config, history } = get()
        if (history.length > config.maxEntries) {
          set({
            history: history.slice(0, config.maxEntries),
          })
        }
      },

      /**
       * 从历史中移除指定项
       */
      removeFromHistory: (id: string) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        }))

        // 更新统计
        get().updateStats()
      },

      /**
       * 批量删除
       */
      batchRemove: (ids: string[]) => {
        const idSet = new Set(ids)
        set((state) => ({
          history: state.history.filter((item) => !idSet.has(item.id)),
        }))

        // 更新统计
        get().updateStats()
      },

      /**
       * 更新统计信息
       */
      updateStats: () => {
        const { history } = get()

        const stats: HistoryStats = {
          totalCommands: history.filter((item) => item.type === 'command')
            .length,
          totalBlocks: history.filter((item) => item.type === 'block').length,
          lastActionTime: history.length > 0 ? history[0].timestamp : null,
        }

        set({ stats })
      },

      /**
       * 获取可撤销状态
       */
      canUndo: () => {
        return get().history.length > 0
      },

      /**
       * 获取可重做状态
       */
      canRedo: () => {
        return get().redoStack.length > 0
      },

      /**
       * 显示确认对话框
       */
      showConfirmDialog: (options) => {
        set({
          confirmDialog: {
            open: true,
            title: options.title,
            description: options.description,
            onConfirm: options.onConfirm,
            onCancel: options.onCancel ?? null,
          },
        })
      },

      /**
       * 关闭确认对话框
       */
      closeConfirmDialog: () => {
        const { confirmDialog } = get()
        if (confirmDialog.onCancel) {
          confirmDialog.onCancel()
        }
        set({
          confirmDialog: {
            open: false,
            title: '',
            description: '',
            onConfirm: null,
            onCancel: null,
          },
        })
      },

      /**
       * 确认撤销操作
       */
      confirmUndo: () => {
        const { confirmDialog } = get()

        if (confirmDialog.onConfirm) {
          confirmDialog.onConfirm()
        }

        // 执行撤销
        const undoedItem = get().undo()

        // 重置对话框
        set({
          confirmDialog: {
            open: false,
            title: '',
            description: '',
            onConfirm: null,
            onCancel: null,
          },
        })

        return undoedItem
      },

      /**
       * 按时间范围获取条目
       */
      getEntriesByTimeRange: (start, end) => {
        return get().history.filter(
          (entry) => entry.timestamp >= start && entry.timestamp <= end
        )
      },

      /**
       * 按类型获取条目
       */
      getEntriesByType: (type) => {
        return get().history.filter((entry) => entry.type === type)
      },

      /**
       * 搜索条目
       */
      searchEntries: (keyword) => {
        const lowerKeyword = keyword.toLowerCase()
        return get().history.filter(
          (entry) =>
            entry.description.toLowerCase().includes(lowerKeyword) ||
            entry.action.toLowerCase().includes(lowerKeyword)
        )
      },
    }),
    {
      name: 'mc-editor-history',
      // 持久化配置
      partialize: (state) => ({
        history: state.history,
        redoStack: state.redoStack,
        config: state.config,
        stats: state.stats,
      }),
    }
  )
)

/**
 * Hook: 获取历史记录快捷操作
 */
export function useHistoryActions() {
  const store = useHistoryStore

  return {
    addToHistory: store.getState().addToHistory,
    undo: store.getState().undo,
    redo: store.getState().redo,
    clearHistory: store.getState().clearHistory,
    removeFromHistory: store.getState().removeFromHistory,
    batchRemove: store.getState().batchRemove,
    confirmUndo: store.getState().confirmUndo,
    showConfirmDialog: store.getState().showConfirmDialog,
    closeConfirmDialog: store.getState().closeConfirmDialog,
  }
}

/**
 * Hook: 获取历史统计信息
 */
export function useHistoryStats() {
  return useHistoryStore((state) => state.stats)
}

/**
 * Hook: 获取撤销/重做状态
 */
export function useUndoRedoState() {
  const canUndo = useHistoryStore((state) => state.history.length > 0)
  const canRedo = useHistoryStore((state) => state.redoStack.length > 0)

  return { canUndo, canRedo }
}

/**
 * Hook: 获取历史配置
 */
export function useHistoryConfig() {
  return useHistoryStore((state) => state.config)
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 格式化时间戳为可读字符串
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - timestamp
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 获取操作类型的显示文本
 */
export function getActionText(action: HistoryAction): string {
  const actionMap: Record<HistoryAction, string> = {
    execute: '执行',
    create: '创建',
    modify: '修改',
    delete: '删除',
  }
  return actionMap[action]
}

/**
 * 获取操作类型的样式类名
 */
export function getActionStyle(action: HistoryAction): string {
  const styleMap: Record<HistoryAction, string> = {
    execute: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    create: 'bg-green-500/10 text-green-600 border-green-500/20',
    modify: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    delete: 'bg-red-500/10 text-red-600 border-red-500/20',
  }
  return styleMap[action]
}

/**
 * 获取类型显示文本
 */
export function getTypeText(type: HistoryItem['type']): string {
  const typeMap: Record<HistoryItem['type'], string> = {
    command: '命令',
    block: '方块',
    project: '项目',
  }
  return typeMap[type]
}
