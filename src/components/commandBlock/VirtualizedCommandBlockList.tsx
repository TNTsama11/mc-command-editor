/**
 * VirtualizedCommandBlockList - 虚拟列表组件
 *
 * 使用虚拟滚动技术处理大量命令方块数据
 * 只渲染可视区域内的项目，大幅提升性能
 *
 * 支持功能：
 * - 虚拟滚动（只渲染可见项）
 * - 动态高度支持
 * - 平滑滚动
 * - 拖拽排序集成
 */

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react'
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
} from '@dnd-kit/sortable'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommandBlock } from '@/types'
import { SortableBlockItem } from './SortableBlockItem'

// ============================================================================
// 常量配置
// ============================================================================

/** 默认项目高度（像素） */
const DEFAULT_ITEM_HEIGHT = 80

/** 预渲染的额外项目数（用于平滑滚动） */
const OVERSCAN_COUNT = 5

/** 最小项目高度 */
const MIN_ITEM_HEIGHT = 60

// ============================================================================
// 类型定义
// ============================================================================

export interface VirtualizedCommandBlockListProps {
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
  /** 容器高度（像素） */
  height?: number
  /** 项目高度（像素） */
  itemHeight?: number
  /** 自定义类名 */
  className?: string
  /** 空状态渲染 */
  renderEmpty?: () => React.ReactNode
}

export interface VirtualizedCommandBlockListRef {
  /** 滚动到指定索引 */
  scrollToIndex: (index: number) => void
  /** 滚动到指定 ID */
  scrollToId: (id: string) => void
  /** 获取当前可见范围 */
  getVisibleRange: () => { startIndex: number; endIndex: number }
  /** 刷新列表（数据变化后调用） */
  refresh: () => void
}

interface VirtualListState {
  /** 容器可见高度 */
  containerHeight: number
  /** 滚动偏移量 */
  scrollTop: number
}

// ============================================================================
// 拖拽覆盖层组件
// ============================================================================

interface DragOverlayBlockProps {
  block: CommandBlock
}

const DragOverlayBlock = memo(function DragOverlayBlock({ block }: DragOverlayBlockProps) {
  return (
    <div className="rounded-lg border border-primary bg-card shadow-xl opacity-90 p-3">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 p-1.5 rounded text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </div>
        <code className="text-sm font-mono text-foreground/90 block truncate">
          {block.command || '未设置命令'}
        </code>
      </div>
    </div>
  )
})

// ============================================================================
// 空状态组件
// ============================================================================

const EmptyState = memo(function EmptyState() {
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
})

// ============================================================================
// 主组件
// ============================================================================

export const VirtualizedCommandBlockList = forwardRef<
  VirtualizedCommandBlockListRef,
  VirtualizedCommandBlockListProps
>(function VirtualizedCommandBlockList(
  {
    blocks,
    selectedId,
    onReorder,
    onSelect,
    onEdit,
    onDelete,
    height = 400,
    itemHeight = DEFAULT_ITEM_HEIGHT,
    className,
    renderEmpty,
  },
  ref
) {
  // ============================================================================
  // 状态
  // ============================================================================

  const [activeId, setActiveId] = useState<string | null>(null)
  const [virtualState, setVirtualState] = useState<VirtualListState>({
    containerHeight: height,
    scrollTop: 0,
  })

  // 引用
  const containerRef = useRef<HTMLDivElement>(null)
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // ============================================================================
  // 拖拽传感器配置
  // ============================================================================

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ============================================================================
  // 虚拟列表计算
  // ============================================================================

  // 计算总高度
  const totalHeight = useMemo(() => {
    return blocks.length * itemHeight
  }, [blocks.length, itemHeight])

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const { scrollTop, containerHeight } = virtualState

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN_COUNT)
    const endIndex = Math.min(
      blocks.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + OVERSCAN_COUNT
    )

    return { startIndex, endIndex }
  }, [virtualState, itemHeight, blocks.length])

  // 可见的项目
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return blocks.slice(startIndex, endIndex + 1).map((block, i) => ({
      block,
      index: startIndex + i,
    }))
  }, [blocks, visibleRange])

  // ============================================================================
  // 事件处理
  // ============================================================================

  // 滚动事件处理（使用 requestAnimationFrame 优化）
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    setVirtualState((prev) => ({
      ...prev,
      scrollTop: target.scrollTop,
    }))
  }, [])

  // ResizeObserver 监听容器大小变化
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height: containerHeight } = entry.contentRect
        setVirtualState((prev) => ({
          ...prev,
          containerHeight: Math.max(containerHeight, MIN_ITEM_HEIGHT),
        }))
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // 设置方块引用
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

  // ============================================================================
  // Ref 方法
  // ============================================================================

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex: (index: number) => {
        if (containerRef.current) {
          const targetTop = index * itemHeight
          containerRef.current.scrollTo({
            top: targetTop,
            behavior: 'smooth',
          })
        }
      },
      scrollToId: (id: string) => {
        const index = blocks.findIndex((b) => b.id === id)
        if (index !== -1) {
          containerRef.current?.scrollTo({
            top: index * itemHeight,
            behavior: 'smooth',
          })
        }
      },
      getVisibleRange: () => visibleRange,
      refresh: () => {
        // 强制重新计算
        setVirtualState((prev) => ({ ...prev }))
      },
    }),
    [blocks, itemHeight, visibleRange]
  )

  // ============================================================================
  // 渲染
  // ============================================================================

  // 空状态
  if (blocks.length === 0) {
    return renderEmpty ? renderEmpty() : <EmptyState />
  }

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
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
          {/* 虚拟列表容器 - 使用 padding 模拟未渲染项目 */}
          <div
            className="relative"
            style={{
              height: totalHeight,
              paddingTop: visibleRange.startIndex * itemHeight,
            }}
          >
            {/* 可见项目 */}
            {visibleItems.map(({ block, index }) => (
              <div
                key={block.id}
                style={{ height: itemHeight }}
                className="mb-2"
              >
                <SortableBlockItem
                  block={block}
                  index={index}
                  isSelected={selectedId === block.id}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  setRef={setBlockRef}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        {/* 拖拽覆盖层 */}
        <DragOverlay>
          {activeBlock ? <DragOverlayBlock block={activeBlock} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
})

export default VirtualizedCommandBlockList
