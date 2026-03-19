import { useCallback, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckSquare,
  Clock,
  Folder,
  RotateCcw,
  Search,
  Settings,
  Square,
  Terminal,
  Trash2,
  Undo2,
  Redo2,
  Box,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  formatTimestamp,
  type HistoryConfig,
  type HistoryItem,
  useHistoryConfig,
  useHistoryStats,
  useHistoryStore,
  useUndoRedoState,
} from '@/store/historyStore'

type TimeFilter = 'all' | '1h' | '24h' | '7d' | '30d'

const TIME_FILTER_OPTIONS: Array<{ value: TimeFilter; label: string }> = [
  { value: 'all', label: '全部时间' },
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
]

const TYPE_FILTER_OPTIONS: Array<{ value: HistoryItem['type'] | 'all'; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'command', label: '命令' },
  { value: 'block', label: '方块' },
  { value: 'project', label: '项目' },
]

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

function getTypeLabel(type: HistoryItem['type']) {
  switch (type) {
    case 'command':
      return '命令'
    case 'block':
      return '方块'
    case 'project':
      return '项目'
    default:
      return type
  }
}

function getTimeFilterStart(filter: TimeFilter) {
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

function formatExpirationTime(milliseconds: number) {
  if (milliseconds <= 0) return '永不过期'
  const hours = Math.floor(milliseconds / (60 * 60 * 1000))
  if (hours < 24) return `${hours} 小时`
  return `${Math.floor(hours / 24)} 天`
}

interface HistoryPanelProps {
  className?: string
  maxHeight?: string
  showSearch?: boolean
  showTimeFilter?: boolean
  showTypeFilter?: boolean
  showConfig?: boolean
}

export function HistoryPanel({
  className,
  maxHeight = '400px',
  showSearch = true,
  showTimeFilter = true,
  showTypeFilter = true,
  showConfig = false,
}: HistoryPanelProps) {
  const history = useHistoryStore((state) => state.history)
  const undo = useHistoryStore((state) => state.undo)
  const redo = useHistoryStore((state) => state.redo)
  const removeFromHistory = useHistoryStore((state) => state.removeFromHistory)
  const batchRemove = useHistoryStore((state) => state.batchRemove)
  const clearHistory = useHistoryStore((state) => state.clearHistory)
  const clearExpired = useHistoryStore((state) => state.clearExpired)
  const updateConfig = useHistoryStore((state) => state.updateConfig)
  const stats = useHistoryStats()
  const config = useHistoryConfig()
  const { canUndo, canRedo } = useUndoRedoState()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [typeFilter, setTypeFilter] = useState<HistoryItem['type'] | 'all'>('all')
  const [showUndoConfirm, setShowUndoConfirm] = useState(false)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [tempConfig, setTempConfig] = useState<HistoryConfig | null>(null)

  const filteredHistory = useMemo(() => {
    let nextHistory = history

    if (timeFilter !== 'all') {
      const startTime = getTimeFilterStart(timeFilter)
      nextHistory = nextHistory.filter((item) => item.timestamp >= startTime)
    }

    if (typeFilter !== 'all') {
      nextHistory = nextHistory.filter((item) => item.type === typeFilter)
    }

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      nextHistory = nextHistory.filter(
        (item) =>
          item.description.toLowerCase().includes(keyword) ||
          item.action.toLowerCase().includes(keyword)
      )
    }

    return nextHistory
  }, [history, searchKeyword, timeFilter, typeFilter])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (filteredHistory.length === 0) {
      return
    }

    setSelectedIds((current) =>
      current.size === filteredHistory.length
        ? new Set()
        : new Set(filteredHistory.map((item) => item.id))
    )
  }, [filteredHistory])

  const handleSaveConfig = useCallback(() => {
    if (!tempConfig) return
    updateConfig(tempConfig)
    setShowConfigDialog(false)
    setTempConfig(null)
  }, [tempConfig, updateConfig])

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="mb-3 flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowUndoConfirm(true)} disabled={!canUndo}>
            <Undo2 className="mr-2 h-4 w-4" />
            撤销
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo}>
            <Redo2 className="mr-2 h-4 w-4" />
            重做
          </Button>
          <Button variant="ghost" size="sm" onClick={clearExpired}>
            <RotateCcw className="mr-2 h-4 w-4" />
            清理过期项
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowBatchDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除选中项 ({selectedIds.size})
            </Button>
          )}
          {showConfig && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempConfig({ ...config })
                setShowConfigDialog(true)
              }}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} disabled={history.length === 0}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(showSearch || showTimeFilter || showTypeFilter) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {showSearch && (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="搜索描述或操作类型"
                className="pl-9"
              />
            </div>
          )}
          {showTimeFilter && (
            <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
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
              onValueChange={(value) => setTypeFilter(value as HistoryItem['type'] | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
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

      <div className="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>总数 {history.length}</span>
        <span>命令 {stats.totalCommands}</span>
        <span>方块 {stats.totalBlocks}</span>
        {stats.lastActionTime && <span>最近操作 {formatTimestamp(stats.lastActionTime)}</span>}
        {filteredHistory.length !== history.length && <span>筛选后 {filteredHistory.length}</span>}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ maxHeight }}>
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Clock className="mb-3 h-10 w-10" />
            <p>暂无历史记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b px-2 pb-2 text-sm text-muted-foreground">
              <button type="button" className="flex items-center gap-1" onClick={toggleSelectAll}>
                {selectedIds.size === filteredHistory.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>全选</span>
              </button>
              <span>
                已选 {selectedIds.size} / {filteredHistory.length}
              </span>
            </div>

            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  selectedIds.has(item.id) ? 'border-primary/40 bg-accent' : 'hover:bg-accent/50'
                )}
              >
                <button type="button" className="mt-0.5" onClick={() => toggleSelect(item.id)}>
                  {selectedIds.has(item.id) ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <div className="mt-0.5 text-muted-foreground">{getTypeIcon(item.type)}</div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium">{item.action}</span>
                    <Badge variant="outline">{getTypeLabel(item.type)}</Badge>
                    {item.undone && <Badge variant="secondary">已撤销</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(item.timestamp)}</p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => removeFromHistory(item.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showUndoConfirm} onOpenChange={setShowUndoConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              确认撤销
            </DialogTitle>
            <DialogDescription>将回退最近一次历史操作。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUndoConfirm(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                undo()
                setShowUndoConfirm(false)
              }}
            >
              撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认批量删除
            </DialogTitle>
            <DialogDescription>将删除当前选中的 {selectedIds.size} 条历史记录。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDeleteConfirm(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                batchRemove([...selectedIds])
                setSelectedIds(new Set())
                setShowBatchDeleteConfirm(false)
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认清空历史
            </DialogTitle>
            <DialogDescription>这会删除全部 {history.length} 条历史记录。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearHistory()
                setSelectedIds(new Set())
                setShowClearConfirm(false)
              }}
            >
              清空
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              历史设置
            </DialogTitle>
            <DialogDescription>控制历史记录条数、过期时间和撤销能力。</DialogDescription>
          </DialogHeader>

          {tempConfig && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <LabelWithValue label="最大记录数" value={String(tempConfig.maxEntries)} />
                <Input
                  type="number"
                  min={10}
                  max={1000}
                  value={tempConfig.maxEntries}
                  onChange={(event) =>
                    setTempConfig({
                      ...tempConfig,
                      maxEntries: Math.max(10, Math.min(1000, Number(event.target.value) || 100)),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <LabelWithValue
                  label="过期时间（小时）"
                  value={formatExpirationTime(tempConfig.expirationTime)}
                />
                <Input
                  type="number"
                  min={0}
                  max={720}
                  value={tempConfig.expirationTime / (60 * 60 * 1000)}
                  onChange={(event) =>
                    setTempConfig({
                      ...tempConfig,
                      expirationTime: Math.max(0, Number(event.target.value) || 0) * 60 * 60 * 1000,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <LabelWithValue label="允许撤销" value={tempConfig.enableUndo ? '开启' : '关闭'} />
                <Select
                  value={tempConfig.enableUndo ? 'true' : 'false'}
                  onValueChange={(value) =>
                    setTempConfig({
                      ...tempConfig,
                      enableUndo: value === 'true',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">开启</SelectItem>
                    <SelectItem value="false">关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveConfig}>保存设置</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LabelWithValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default HistoryPanel
