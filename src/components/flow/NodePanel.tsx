/**
 * 节点面板
 * 显示可拖拽添加的节点列表
 */

import { useMemo, useState, type DragEvent } from 'react'
import { Search, X } from 'lucide-react'
import { COMMAND_NODE_CONFIGS, createNode } from './NodeFactory'
import { useFlowStore } from '@/store/flowStore'
import { cn } from '@/lib/utils'

const FEATURED_NODE_TYPES = ['give', 'summon', 'tp', 'setblock', 'fill', 'effect', 'execute']

const NODE_GROUPS = [
  {
    label: '基础命令',
    types: ['give', 'kill', 'select-entity'],
  },
  {
    label: '方块与世界',
    types: ['setblock', 'fill', 'clone', 'break-block', 'test-block', 'time', 'weather', 'gamerule'],
  },
  {
    label: '条件与执行',
    types: ['execute', 'if-else', 'loop', 'schedule', 'schedule-clear'],
  },
  {
    label: '常量与输入',
    types: ['number-const', 'string-const', 'get-position'],
  },
  {
    label: '实体与效果',
    types: ['summon', 'tp', 'effect', 'effect-clear', 'clear-item', 'replaceitem', 'attribute'],
  },
  {
    label: '计分板与存储',
    types: ['scoreboard-create', 'score-get', 'score-set', 'score-operation', 'score-compare', 'scoreboard-reset', 'storage-get', 'storage-set'],
  },
  {
    label: '文本与反馈',
    types: ['particle', 'playsound', 'stopsound', 'title', 'tellraw', 'bossbar'],
  },
  {
    label: '数学运算',
    types: ['math-add', 'math-subtract', 'math-multiply', 'math-divide', 'math-modulo', 'math-function', 'comparator'],
  },
]

interface NodePanelProps {
  className?: string
}

export function NodePanel({ className }: NodePanelProps) {
  const [search, setSearch] = useState('')
  const addNode = useFlowStore((state) => state.addNode)

  const normalizedSearch = search.trim().toLowerCase()

  const featuredTypes = useMemo(() => {
    return FEATURED_NODE_TYPES.filter((type) => matchesSearch(type, normalizedSearch))
  }, [normalizedSearch])

  const groupedCategories = useMemo(() => {
    const featuredSet = new Set(FEATURED_NODE_TYPES)

    return NODE_GROUPS
      .map((group) => {
        const types = group.types.filter((type) => {
          if (featuredSet.has(type)) return false
          return matchesSearch(type, normalizedSearch)
        })
        return { label: group.label, types }
      })
      .filter((group) => group.types.length > 0)
  }, [normalizedSearch])

  const handleDragStart = (event: DragEvent<HTMLDivElement>, type: string) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDoubleClick = (type: string) => {
    const node = createNode(type, { x: 200, y: 200 })
    addNode(node)
  }

  const renderNodeCard = (type: string) => {
    const config = COMMAND_NODE_CONFIGS[type]
    if (!config) return null

    return (
      <div
        key={type}
        draggable
        onDragStart={(event) => handleDragStart(event, type)}
        onDoubleClick={() => handleDoubleClick(type)}
        className="rounded-md border border-border bg-muted/40 p-3 transition-all hover:border-primary/50 hover:bg-accent cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">{config.label}</div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{config.commandType ?? type}</span>
        </div>
        {config.description && (
          <div className="mt-1 text-xs text-muted-foreground">
            {config.description}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col bg-card', className)} data-testid="node-panel">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="node-search-input"
            type="text"
            placeholder="搜索节点、命令 ID 或说明"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-border bg-muted py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="清空搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        {featuredTypes.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                高频推荐
              </h3>
              <span className="text-[11px] text-muted-foreground">7 个常用入口</span>
            </div>
            <div className="grid gap-2">
              {featuredTypes.map(renderNodeCard)}
            </div>
          </section>
        )}

        {groupedCategories.map((group) => (
          <section key={group.label}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <div className="grid gap-2">
              {group.types.map(renderNodeCard)}
            </div>
          </section>
        ))}

        {!featuredTypes.length && !groupedCategories.length && (
          <div className="py-8 text-center text-muted-foreground">
            未找到匹配的节点
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        <div>拖拽或双击添加节点</div>
      </div>
    </div>
  )
}

function matchesSearch(type: string, search: string) {
  if (!search) return true

  const config = COMMAND_NODE_CONFIGS[type]
  if (!config) return false

  const haystack = [
    type,
    config.commandType,
    config.label,
    config.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}
