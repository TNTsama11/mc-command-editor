/**
 * CommandBlockList - 可拖拽排序的命令方块列表组件
 *
 * 使用 @dnd-kit/sortable 实现命令方块链的拖拽排序功能
 * 支持垂直方向的拖拽排序，拖拽时有视觉反馈
 * 集成 ConnectionLines 组件显示命令方块之间的连接线
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit, Play, Repeat, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CommandBlock } from '@/types'
import { ConnectionLines, ConnectionNode, Connection } from './ConnectionLines'

// ============================================================================
// 类型定义
// ============================================================================

export interface CommandBlockListProps {
  /** 命令方块数组 */
  blocks: CommandBlock[]
  /** 当前选中的方块 ID */
  selectedId: string | null
  /** 重排序回调 */
  onReorder: (blocks: CommandBlock[]) => void
  /** 选中回调 */
  onSelect: (id: string) => void
  /** 编辑回调 */
  onEdit: (id: string) => void
  /** 删除回调 */
  onDelete: (id: string) => void
  /** 是否显示连接线 */
  showConnections?: boolean
}

// ============================================================================
// 可排序的单个命令方块项
// ============================================================================

interface SortableBlockProps {
  block: CommandBlock
  index: number
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  setRef?: (el: HTMLDivElement | null) => void
}

function SortableBlock({
  block,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  setRef,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  // 合并两个 ref
  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      setSortableRef(el)
      setRef?.(el)
    },
    [setSortableRef, setRef]
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 根据方块类型获取图标
  const getTypeIcon = () => {
    switch (block.type) {
      case 'impulse':
        return <Zap className="h-4 w-4" />
      case 'chain':
        return <Play className="h-4 w-4" />
      case 'repeat':
        return <Repeat className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  // 根据方块类型获取颜色
  const getTypeColor = () => {
    switch (block.type) {
      case 'impulse':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
      case 'chain':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
      case 'repeat':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400'
      default:
        return 'bg-amber-500/20 border-amber-500/50'
    }
  }

  return (
    <div
      ref={setRefs}
      style={style}
      data-block-id={block.id}
      data-block-index={index}
      className={cn(
        // 基础样式
        'group relative rounded-lg border transition-all duration-200',
        // 拖拽状态
        isDragging && 'opacity-50 shadow-lg scale-[1.02] z-50',
        // 选中状态
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30',
      )}
    >
      <Card className="border-0 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* 序号指示器 */}
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
              {index + 1}
            </div>

            {/* 拖拽手柄 */}
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'flex-shrink-0 p-1.5 rounded cursor-grab active:cursor-grabbing',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'focus:outline-none focus:ring-2 focus:ring-primary/50',
                'transition-colors'
              )}
              aria-label="拖拽以重新排序"
            >
              <GripVertical className="h-4 w-4" />
            </button>

            {/* 方块类型图标 */}
            <div
              className={cn(
                'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md border',
                getTypeColor()
              )}
            >
              {getTypeIcon()}
            </div>

            {/* 命令内容 */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onSelect(block.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                {/* 方块类型标签 */}
                <Badge variant="outline" className={cn('text-[10px] px-1.5', getTypeColor())}>
                  {block.type === 'impulse' ? '脉冲' : block.type === 'chain' ? '连锁' : '循环'}
                </Badge>

                {/* 条件标签 - 使用橙色与连接线颜色一致 */}
                {block.conditional && (
                  <Badge variant="outline" className="text-[10px] px-1.5 bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400">
                    条件
                  </Badge>
                )}

                {/* 自动标签 */}
                {block.auto && (
                  <Badge variant="outline" className="text-[10px] px-1.5 bg-cyan-500/20 border-cyan-500/50 text-cyan-600 dark:text-cyan-400">
                    自动
                  </Badge>
                )}
              </div>

              {/* 命令文本 */}
              <code className="text-sm font-mono text-foreground/90 block truncate">
                {block.command || <span className="text-muted-foreground italic">未设置命令</span>}
              </code>
            </div>

            {/* 操作按钮 */}
            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(block.id)}
                aria-label="编辑命令"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(block.id)}
                aria-label="删除命令方块"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// 拖拽覆盖层组件（拖拽时显示）
// ============================================================================

interface DragOverlayBlockProps {
  block: CommandBlock
}

function DragOverlayBlock({ block }: DragOverlayBlockProps) {
  // 根据方块类型获取图标
  const getTypeIcon = () => {
    switch (block.type) {
      case 'impulse':
        return <Zap className="h-4 w-4" />
      case 'chain':
        return <Play className="h-4 w-4" />
      case 'repeat':
        return <Repeat className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  // 根据方块类型获取颜色
  const getTypeColor = () => {
    switch (block.type) {
      case 'impulse':
        return 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
      case 'chain':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
      case 'repeat':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400'
      default:
        return 'bg-amber-500/20 border-amber-500/50'
    }
  }

  return (
    <div className="rounded-lg border border-primary bg-card shadow-xl opacity-90">
      <Card className="border-0 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* 拖拽手柄 */}
            <div className="flex-shrink-0 p-1.5 rounded text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </div>

            {/* 方块类型图标 */}
            <div
              className={cn(
                'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md border',
                getTypeColor()
              )}
            >
              {getTypeIcon()}
            </div>

            {/* 命令内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={cn('text-[10px] px-1.5', getTypeColor())}>
                  {block.type === 'impulse' ? '脉冲' : block.type === 'chain' ? '连锁' : '循环'}
                </Badge>
                {block.conditional && (
                  <Badge variant="outline" className="text-[10px] px-1.5 bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400">
                    条件
                  </Badge>
                )}
              </div>
              <code className="text-sm font-mono text-foreground/90 block truncate">
                {block.command || <span className="text-muted-foreground italic">未设置命令</span>}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function CommandBlockList({
  blocks,
  selectedId,
  onReorder,
  onSelect,
  onEdit,
  onDelete,
  showConnections = true,
}: CommandBlockListProps) {
  // 当前正在拖拽的方块
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null

  // 容器引用和节点位置追踪
  const containerRef = useRef<HTMLDivElement>(null)
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [nodePositions, setNodePositions] = useState<ConnectionNode[]>([])

  // 配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 需要稍微移动才开始拖拽，避免误触发
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 计算节点位置（用于连接线）
  const updateNodePositions = useCallback(() => {
    if (!containerRef.current || !showConnections) {
      setNodePositions([])
      return
    }

    const containerRect = containerRef.current.getBoundingClientRect()
    const positions: ConnectionNode[] = []

    // 按照顺序计算每个方块的位置
    blocks.forEach((block) => {
      const blockElement = blockRefs.current.get(block.id)
      if (blockElement) {
        const rect = blockElement.getBoundingClientRect()
        // 使用节点中心点作为连接点
        positions.push({
          id: block.id,
          // 计算相对于容器的位置
          x: rect.left - containerRect.left + rect.width / 2,
          // 使用节点中心作为 Y 坐标
          y: rect.top - containerRect.top + rect.height / 2,
        })
      }
    })

    setNodePositions(positions)
  }, [blocks, showConnections])

  // 监听容器大小变化和方块变化
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateNodePositions()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // 初始更新
    requestAnimationFrame(updateNodePositions)

    return () => {
      resizeObserver.disconnect()
    }
  }, [updateNodePositions])

  // 方块变化时更新位置
  useEffect(() => {
    // 延迟更新以确保 DOM 已更新
    requestAnimationFrame(updateNodePositions)
  }, [blocks, updateNodePositions])

  // 计算连接关系
  const connections: Connection[] = useMemo(() => {
    const result: Connection[] = []

    for (let i = 0; i < blocks.length - 1; i++) {
      const current = blocks[i]
      const next = blocks[i + 1]

      // 如果当前方块是条件方块，则连接为条件连接
      result.push({
        from: current.id,
        to: next.id,
        conditional: current.conditional,
      })
    }

    return result
  }, [blocks])

  // 设置方块引用的回调
  const setBlockRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      blockRefs.current.set(id, element)
    } else {
      blockRefs.current.delete(id)
    }
  }, [])

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)

      if (over && active.id !== over.id) {
        const oldIndex = blocks.findIndex((b) => b.id === active.id)
        const newIndex = blocks.findIndex((b) => b.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // 使用 arrayMove 重新排序
          const newBlocks = arrayMove(blocks, oldIndex, newIndex)
          onReorder(newBlocks)
        }
      }
    },
    [blocks, onReorder]
  )

  // 拖拽取消
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // 空状态
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <GripVertical className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">暂无命令方块</h3>
        <p className="text-sm text-muted-foreground">
          点击下方按钮添加第一个命令方块
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      {/* 连接线层 - 绝对定位在方块下方 */}
      {showConnections && nodePositions.length > 1 && (
        <ConnectionLines
          nodes={nodePositions}
          connections={connections}
          className="z-0"
        />
      )}

      {/* 命令方块列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={cn('relative z-10 space-y-2', showConnections && 'space-y-6')}>
            {blocks.map((block, index) => (
              <SortableBlock
                key={block.id}
                block={block}
                index={index}
                isSelected={selectedId === block.id}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                setRef={(el) => setBlockRef(block.id, el)}
              />
            ))}
          </div>
        </SortableContext>

        {/* 拖拽覆盖层 - 显示正在拖拽的项目 */}
        <DragOverlay>
          {activeBlock ? <DragOverlayBlock block={activeBlock} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default CommandBlockList
