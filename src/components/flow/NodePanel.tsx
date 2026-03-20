import { useMemo, useState, type DragEvent } from 'react'
import { Search, X } from 'lucide-react'

import { useFunctionWorkflows } from '@/store/projectStore'
import { useFlowStore } from '@/store/flowStore'
import { cn } from '@/lib/utils'
import {
  COMMAND_NODE_CONFIGS,
  createFunctionNodeFromWorkflow,
  createNode,
} from './NodeFactory'

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
    types: [
      'scoreboard-create',
      'score-get',
      'score-set',
      'score-operation',
      'score-compare',
      'scoreboard-reset',
      'storage-get',
      'storage-set',
    ],
  },
  {
    label: '文本与反馈',
    types: ['particle', 'playsound', 'stopsound', 'title', 'tellraw', 'bossbar'],
  },
  {
    label: '数学运算',
    types: ['math-add', 'math-subtract', 'math-multiply', 'math-divide', 'math-modulo', 'math-function', 'comparator'],
  },
] as const

interface NodePanelProps {
  className?: string
}

function buildWorkflowDragPayload(workflowId: string) {
  return JSON.stringify({
    kind: 'function-workflow',
    workflowId,
  })
}

export function NodePanel({ className }: NodePanelProps) {
  const [search, setSearch] = useState('')
  const addNode = useFlowStore((state) => state.addNode)
  const functionWorkflows = useFunctionWorkflows()

  const normalizedSearch = search.trim().toLowerCase()

  const featuredTypes = useMemo(
    () => FEATURED_NODE_TYPES.filter((type) => matchesCommandSearch(type, normalizedSearch)),
    [normalizedSearch]
  )

  const groupedCategories = useMemo(() => {
    const featuredSet = new Set(FEATURED_NODE_TYPES)

    return NODE_GROUPS
      .map((group) => ({
        label: group.label,
        types: group.types.filter((type) => !featuredSet.has(type) && matchesCommandSearch(type, normalizedSearch)),
      }))
      .filter((group) => group.types.length > 0)
  }, [normalizedSearch])

  const filteredFunctionWorkflows = useMemo(
    () => functionWorkflows.filter((workflow) => matchesFunctionWorkflowSearch(workflow, normalizedSearch)),
    [functionWorkflows, normalizedSearch]
  )

  const handleCommandDragStart = (event: DragEvent<HTMLDivElement>, type: string) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleFunctionDragStart = (event: DragEvent<HTMLDivElement>, workflowId: string) => {
    event.dataTransfer.setData('application/reactflow', buildWorkflowDragPayload(workflowId))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleCommandDoubleClick = (type: string) => {
    addNode(createNode(type, { x: 200, y: 200 }))
  }

  const handleFunctionDoubleClick = (workflowId: string) => {
    const workflow = functionWorkflows.find((item) => item.id === workflowId)
    if (!workflow) {
      return
    }

    addNode(createFunctionNodeFromWorkflow(workflow, { x: 200, y: 200 }))
  }

  const renderNodeCard = (type: string) => {
    const config = COMMAND_NODE_CONFIGS[type]
    if (!config) return null

    return (
      <div
        key={type}
        draggable
        onDragStart={(event) => handleCommandDragStart(event, type)}
        onDoubleClick={() => handleCommandDoubleClick(type)}
        className="cursor-grab rounded-md border border-border bg-muted/40 p-3 transition-all hover:border-primary/50 hover:bg-accent active:cursor-grabbing"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">{config.label}</div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {config.commandType ?? type}
          </span>
        </div>
        {config.description && <div className="mt-1 text-xs text-muted-foreground">{config.description}</div>}
      </div>
    )
  }

  const renderFunctionWorkflowCard = (workflowId: string) => {
    const workflow = filteredFunctionWorkflows.find((item) => item.id === workflowId)
    if (!workflow) return null

    return (
      <div
        key={workflow.id}
        draggable
        onDragStart={(event) => handleFunctionDragStart(event, workflow.id)}
        onDoubleClick={() => handleFunctionDoubleClick(workflow.id)}
        className="cursor-grab rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 transition-all hover:border-primary hover:bg-primary/10 active:cursor-grabbing"
        data-testid={`custom-function-card-${workflow.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">{workflow.name}</div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">function</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {workflow.metadata.description || '项目内可复用的自定义函数节点'}
        </div>
      </div>
    )
  }

  const hasAnyResult =
    featuredTypes.length > 0 || groupedCategories.length > 0 || filteredFunctionWorkflows.length > 0

  return (
    <div className={cn('flex h-full flex-col bg-card', className)} data-testid="node-panel">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            data-testid="node-search-input"
            type="text"
            placeholder="搜索节点、命令 ID、函数名或说明"
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
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">高频推荐</h3>
              <span className="text-[11px] text-muted-foreground">7 个常用入口</span>
            </div>
            <div className="grid gap-2">{featuredTypes.map(renderNodeCard)}</div>
          </section>
        )}

        {filteredFunctionWorkflows.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">自定义函数</h3>
              <span className="text-[11px] text-muted-foreground">{filteredFunctionWorkflows.length} 个项目复用节点</span>
            </div>
            <div className="grid gap-2">{filteredFunctionWorkflows.map((workflow) => renderFunctionWorkflowCard(workflow.id))}</div>
          </section>
        )}

        {groupedCategories.map((group) => (
          <section key={group.label}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <div className="grid gap-2">{group.types.map(renderNodeCard)}</div>
          </section>
        ))}

        {!hasAnyResult && <div className="py-8 text-center text-muted-foreground">未找到匹配的节点或函数</div>}
      </div>

      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        <div>拖拽或双击添加节点</div>
      </div>
    </div>
  )
}

function matchesCommandSearch(type: string, search: string) {
  if (!search) return true

  const config = COMMAND_NODE_CONFIGS[type]
  if (!config) return false

  const haystack = [type, config.commandType, config.label, config.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}

function matchesFunctionWorkflowSearch(
  workflow: { id: string; name: string; metadata: { description?: string } },
  search: string
) {
  if (!search) return true

  const haystack = [workflow.id, workflow.name, workflow.metadata.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}
