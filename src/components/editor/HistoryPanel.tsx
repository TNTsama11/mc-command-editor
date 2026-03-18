/**
 * 历史记录面板组件
 * 显示操作历史、支持撤销/重做、批量删除、搜索过滤、时间范围过滤
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Undo2,
  Redo2,
  Trash2,
  Clock,
  Terminal,
  Box,
  Folder,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
  Search,
  Filter,
  Settings,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  useHistoryStore,
  useHistoryStats,
  useHistoryConfig,
  useUndoRedoState,
  formatTimestamp,
  type HistoryItem,
  type HistoryConfig,
} from '@/store/historyStore'
import { cn } from '@/lib/utils'

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取操作类型图标
 */
function getTypeIcon(type: HistoryItem['type']) {
  switch (type) {
    case 'command':
      return <Terminal className="h-4 w-4" />
    case 'block':
      return <Box className="h-4 w-4" />
    case 'project':
      return <Folder className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

/**
 * 获取操作类型标签颜色
 */
function getTypeBadgeVariant(
  type: HistoryItem['type']
): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'command':
      return 'default'
    case 'block':
      return 'secondary'
    case 'project':
      return 'outline'
    default:
      return 'outline'
  }
}

/**
 * 时间范围过滤选项
 */
type TimeFilter = 'all' | '1h' | '24h' | '7d' | '30d'

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
]

const TYPE_FILTER_OPTIONS: { value: HistoryItem['type'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'command', label: 'Commands' },
  { value: 'block', label: 'Blocks' },
  { value: 'project', label: 'Projects' },
]

/**
 * 获取时间范围的起始时间戳
 */
function getTimeFilterStart(filter: TimeFilter): number {
  const now = Date.now()
  switch (filter) {
    case '1h':
      return now - 60 * 60 * 1000
    case '24h':
      return now - 24 * 60 * 60 * 1000
    case '7d':
      return now - 7 * 24 * 60 * 60 * 1000
    case '30d':
      return now - 30 * 24 * 60 * 60 * 1000
    default:
      return 0
  }
}

/**
 * 格式化过期时间为可读字符串
 */
function formatExpirationTime(ms: number): string {
  if (ms <= 0) return 'Never'
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours < 24) return `${hours} hours`
  const days = Math.floor(hours / 24)
  return `${days} days`
}

// ============================================================================
// 组件定义
// ============================================================================

/**
 * 历史记录面板属性
 */
interface HistoryPanelProps {
  className?: string
  maxHeight?: string
  /** 是否显示搜索框 */
  showSearch?: boolean
  /** 是否显示时间过滤 */
  showTimeFilter?: boolean
  /** 是否显示类型过滤 */
  showTypeFilter?: boolean
  /** 是否显示配置面板 */
  showConfig?: boolean
}

/**
 * 历史记录面板组件
 */
export function HistoryPanel({
  className,
  maxHeight = '400px',
  showSearch = true,
  showTimeFilter = true,
  showTypeFilter = true,
  showConfig = false,
}: HistoryPanelProps) {
  // 选择和对话框状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)

  // 过滤状态
  const [searchKeyword, setSearchKeyword] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [typeFilter, setTypeFilter] = useState<HistoryItem['type'] | 'all'>('all')

  // 配置编辑状态
  const [tempConfig, setTempConfig] = useState<HistoryConfig | null>(null)

  // Store 状态
  const history = useHistoryStore((state) => state.history)
  const stats = useHistoryStats()
  const config = useHistoryConfig()
  const { canUndo, canRedo } = useUndoRedoState()

  // Store 方法
  const undo = useHistoryStore((state) => state.undo)
  const redo = useHistoryStore((state) => state.redo)
  const removeFromHistory = useHistoryStore((state) => state.removeFromHistory)
  const batchRemove = useHistoryStore((state) => state.batchRemove)
  const clearHistory = useHistoryStore((state) => state.clearHistory)
  const clearExpired = useHistoryStore((state) => state.clearExpired)
  const updateConfig = useHistoryStore((state) => state.updateConfig)

  /**
   * 过滤后的历史列表
   */
  const filteredHistory = useMemo(() => {
    let result = history

    // 时间过滤
    if (timeFilter !== 'all') {
      const startTime = getTimeFilterStart(timeFilter)
      result = result.filter((item) => item.timestamp >= startTime)
    }

    // 类型过滤
    if (typeFilter !== 'all') {
      result = result.filter((item) => item.type === typeFilter)
    }

    // 关键词搜索
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      result = result.filter(
        (item) =>
          item.description.toLowerCase().includes(keyword) ||
          item.action.toLowerCase().includes(keyword)
      )
    }

    return result
  }, [history, timeFilter, typeFilter, searchKeyword])

  /**
   * 切换选择
   */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredHistory.map((item) => item.id)))
    }
  }, [filteredHistory, selectedIds.size])

  /**
   * 处理撤销（带确认）
   */
  const handleUndo = useCallback(() => {
    setShowUndoConfirm(true)
  }, [])

  /**
   * 确认撤销
   */
  const confirmUndoAction = useCallback(() => {
    undo()
    setShowUndoConfirm(false)
  }, [undo])

  /**
   * 处理重做
   */
  const handleRedo = useCallback(() => {
    redo()
  }, [redo])

  /**
   * 处理批量删除（带确认）
   */
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size > 0) {
      setShowBatchDeleteConfirm(true)
    }
  }, [selectedIds.size])

  /**
   * 确认批量删除
   */
  const confirmBatchDelete = useCallback(() => {
    batchRemove(Array.from(selectedIds))
    setSelectedIds(new Set())
    setShowBatchDeleteConfirm(false)
  }, [batchRemove, selectedIds])

  /**
   * 处理清空历史（带确认）
   */
  const handleClearHistory = useCallback(() => {
    setShowClearConfirm(true)
  }, [])

  /**
   * 确认清空历史
   */
  const confirmClearHistory = useCallback(() => {
    clearHistory()
    setSelectedIds(new Set())
    setShowClearConfirm(false)
  }, [clearHistory])

  /**
   * 处理单项删除
   */
  const handleRemoveItem = useCallback(
    (id: string) => {
      removeFromHistory(id)
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    },
    [removeFromHistory]
  )

  /**
   * 清理过期条目
   */
  const handleClearExpired = useCallback(() => {
    clearExpired()
  }, [clearExpired])

  /**
   * 打开配置对话框
   */
  const handleOpenConfig = useCallback(() => {
    setTempConfig({ ...config })
    setShowConfigDialog(true)
  }, [config])

  /**
   * 保存配置
   */
  const handleSaveConfig = useCallback(() => {
    if (tempConfig) {
      updateConfig(tempConfig)
      setShowConfigDialog(false)
      setTempConfig(null)
    }
  }, [tempConfig, updateConfig])

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-2 border-b pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4 mr-1" />
            Redo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearExpired}
            title="Clear Expired"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete ({selectedIds.size})
            </Button>
          )}
          {showConfig && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenConfig}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            disabled={history.length === 0}
            title="Clear All"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 过滤器 */}
      {(showSearch || showTimeFilter || showTypeFilter) && (
        <div className="flex items-center gap-2 mb-3">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8"
              />
            </div>
          )}
          {showTimeFilter && (
            <Select
              value={timeFilter}
              onValueChange={(v) => setTimeFilter(v as TimeFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showTypeFilter && (
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as HistoryItem['type'] | 'all')}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span>Total: {history.length}</span>
        <span>Commands: {stats.totalCommands}</span>
        <span>Blocks: {stats.totalBlocks}</span>
        {stats.lastActionTime && (
          <span>Last: {formatTimestamp(stats.lastActionTime)}</span>
        )}
        {filteredHistory.length !== history.length && (
          <span className="text-primary">(Filtered: {filteredHistory.length})</span>
        )}
      </div>

      {/* 历史列表 */}
      <div
        className="flex-1 overflow-y-auto space-y-2"
        style={{ maxHeight }}
      >
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mb-2 opacity-50" />
            <p>No history yet</p>
            <p className="text-xs">Your actions will appear here</p>
          </div>
        ) : (
          <>
            {/* 全选按钮 */}
            <div className="flex items-center gap-2 px-2 py-1 text-sm border-b mb-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {selectedIds.size === filteredHistory.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>Select All</span>
              </button>
              <span className="text-muted-foreground">
                ({selectedIds.size}/{filteredHistory.length} selected)
              </span>
            </div>

            {/* 历史项列表 */}
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group flex items-start gap-2 p-2 rounded-lg border transition-colors',
                  selectedIds.has(item.id)
                    ? 'bg-accent border-accent-foreground/20'
                    : 'hover:bg-accent/50'
                )}
              >
                {/* 选择框 */}
                <button
                  onClick={() => toggleSelect(item.id)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {selectedIds.has(item.id) ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 opacity-50 hover:opacity-100" />
                  )}
                </button>

                {/* 类型图标 */}
                <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
                  {getTypeIcon(item.type)}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {item.action}
                    </span>
                    <Badge
                      variant={getTypeBadgeVariant(item.type)}
                      className="text-xs flex-shrink-0"
                    >
                      {item.type}
                    </Badge>
                    {item.undone && (
                      <Badge variant="outline" className="text-xs">
                        Undone
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(item.timestamp)}
                  </p>
                </div>

                {/* 删除按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 撤销确认对话框 */}
      <Dialog open={showUndoConfirm} onOpenChange={setShowUndoConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Undo
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to undo the last action? This will restore
              the previous state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUndoConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUndoAction}>Undo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认对话框 */}
      <Dialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected
              item(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBatchDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBatchDelete}>
              Delete {selectedIds.size} Item(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空历史确认对话框 */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear All History
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all history? This will remove all
              {history.length} item(s) and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClearHistory}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 配置对话框 */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              History Settings
            </DialogTitle>
            <DialogDescription>
              Configure history retention and limits.
            </DialogDescription>
          </DialogHeader>

          {tempConfig && (
            <div className="space-y-4 py-4">
              {/* 最大条目数 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Maximum Entries ({tempConfig.maxEntries})
                </label>
                <Input
                  type="number"
                  min={10}
                  max={1000}
                  value={tempConfig.maxEntries}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      maxEntries: Math.min(1000, Math.max(10, parseInt(e.target.value) || 100)),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of history entries to keep (10-1000)
                </p>
              </div>

              {/* 过期时间 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Expiration Time (hours): {tempConfig.expirationTime / (60 * 60 * 1000)}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={720}
                  value={tempConfig.expirationTime / (60 * 60 * 1000)}
                  onChange={(e) =>
                    setTempConfig({
                      ...tempConfig,
                      expirationTime: Math.max(0, parseInt(e.target.value) || 0) * 60 * 60 * 1000,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  History entries older than this will be automatically removed (0 = never expire)
                </p>
              </div>

              {/* 启用撤销 */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Undo</label>
                  <p className="text-xs text-muted-foreground">
                    Allow undoing actions from history
                  </p>
                </div>
                <Select
                  value={tempConfig.enableUndo ? 'true' : 'false'}
                  onValueChange={(v) =>
                    setTempConfig({
                      ...tempConfig,
                      enableUndo: v === 'true',
                    })
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 当前配置信息 */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-2">Current Status</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Entries: {history.length} / {config.maxEntries}</p>
                  <p>Expiration: {formatExpirationTime(config.expirationTime)}</p>
                  <p>Undo: {config.enableUndo ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default HistoryPanel
