/**
 * SortableBlockItem - 优化后的可排序命令方块项组件
 *
 * 使用 React.memo 优化渲染性能
 * 使用 useMemo 和 useCallback 减少不必要的重新计算和回调创建
 */

import { memo, useCallback, useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit, Play, Repeat, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CommandBlock } from '@/types'

// ============================================================================
// 类型定义
// ============================================================================

export interface SortableBlockItemProps {
  /** 命令方块数据 */
  block: CommandBlock
  /** 方块索引 */
  index: number
  /** 是否选中 */
  isSelected: boolean
  /** 选中回调 */
  onSelect: (id: string) => void
  /** 编辑回调 */
  onEdit: (id: string) => void
  /** 删除回调 */
  onDelete: (id: string) => void
  /** 设置 ref 回调 */
  setRef?: (id: string, el: HTMLDivElement | null) => void
}

// ============================================================================
// 方块类型配置常量（提取到组件外部避免重复创建）
// ============================================================================

const BLOCK_TYPE_CONFIG = {
  impulse: {
    label: '脉冲',
    icon: Zap,
    colorClass: 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400',
  },
  chain: {
    label: '链式',
    icon: Play,
    colorClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
  },
  repeat: {
    label: '循环',
    icon: Repeat,
    colorClass: 'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400',
  },
} as const

// ============================================================================
// 子组件（单独 memo 化）
// ============================================================================

interface BlockTypeIconProps {
  type: CommandBlock['type']
}

const BlockTypeIcon = memo(function BlockTypeIcon({ type }: BlockTypeIconProps) {
  const config = BLOCK_TYPE_CONFIG[type]
  const Icon = config.icon

  return (
    <div className={cn('flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md border', config.colorClass)}>
      <Icon className="h-4 w-4" />
    </div>
  )
})

interface BlockBadgesProps {
  type: CommandBlock['type']
  conditional: boolean
  auto: boolean
}

const BlockBadges = memo(function BlockBadges({ type, conditional, auto }: BlockBadgesProps) {
  const config = BLOCK_TYPE_CONFIG[type]

  return (
    <div className="flex items-center gap-2 mb-1">
      <Badge variant="outline" className={cn('text-[10px] px-1.5', config.colorClass)}>
        {config.label}
      </Badge>
      {conditional && (
        <Badge variant="outline" className="text-[10px] px-1.5 bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400">
          条件
        </Badge>
      )}
      {auto && (
        <Badge variant="outline" className="text-[10px] px-1.5 bg-cyan-500/20 border-cyan-500/50 text-cyan-600 dark:text-cyan-400">
          自动
        </Badge>
      )}
    </div>
  )
})

interface ActionButtonsProps {
  onEdit: () => void
  onDelete: () => void
}

const ActionButtons = memo(function ActionButtons({ onEdit, onDelete }: ActionButtonsProps) {
  return (
    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onEdit}
        aria-label="编辑命令"
      >
        <Edit className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onDelete}
        aria-label="删除命令方块"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
})

// ============================================================================
// 主组件
// ============================================================================

export const SortableBlockItem = memo(function SortableBlockItem({
  block,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  setRef,
}: SortableBlockItemProps) {
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
      setRef?.(block.id, el)
    },
    [setSortableRef, setRef, block.id]
  )

  // 样式计算
  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
  }), [transform, transition])

  // 容器样式
  const containerClassName = useMemo(() => cn(
    'group relative rounded-lg border transition-all duration-200',
    isDragging && 'opacity-50 shadow-lg scale-[1.02] z-50',
    isSelected
      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
      : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30'
  ), [isDragging, isSelected])

  // 稳定的回调（使用 block.id 闭包）
  const handleSelect = useCallback(() => {
    onSelect(block.id)
  }, [onSelect, block.id])

  const handleEdit = useCallback(() => {
    onEdit(block.id)
  }, [onEdit, block.id])

  const handleDelete = useCallback(() => {
    onDelete(block.id)
  }, [onDelete, block.id])

  return (
    <div
      ref={setRefs}
      style={style}
      data-block-id={block.id}
      data-block-index={index}
      className={containerClassName}
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
            <BlockTypeIcon type={block.type} />

            {/* 命令内容 */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={handleSelect}
            >
              <BlockBadges
                type={block.type}
                conditional={block.conditional}
                auto={block.auto}
              />

              {/* 命令文本 */}
              <code className="text-sm font-mono text-foreground/90 block truncate">
                {block.command || <span className="text-muted-foreground italic">未设置命令</span>}
              </code>
            </div>

            {/* 操作按钮 */}
            <ActionButtons onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default SortableBlockItem
