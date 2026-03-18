/**
 * 命令方块节点组件
 *
 * 用于在可视化编辑器中展示 Minecraft 命令方块
 * 支持不同类型（脉冲/链式/重复）的视觉区分
 * 支持选中、拖拽等交互状态
 */

import { useMemo } from 'react'
import {
  Zap,
  Link,
  Repeat,
  GitBranch,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { CommandBlock } from '@/types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 命令方块节点组件的 Props 接口
 */
export interface CommandBlockNodeProps {
  /** 命令方块数据 */
  block: CommandBlock
  /** 是否选中 */
  isSelected: boolean
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 选中回调 */
  onSelect: () => void
  /** 编辑回调 */
  onEdit: () => void
  /** 删除回调 */
  onDelete: () => void
  /** 拖拽手柄属性（用于 react-dnd 等拖拽库） */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

/**
 * 方块类型配置
 */
type BlockTypeConfig = {
  /** 显示名称 */
  label: string
  /** 边框颜色类名 */
  borderColor: string
  /** 背景颜色类名 */
  bgColor: string
  /** 图标颜色类名 */
  iconColor: string
  /** 图标组件 */
  Icon: React.ComponentType<{ className?: string }>
}

// ============================================================================
// 常量配置
// ============================================================================

/**
 * 不同类型命令方块的样式配置
 */
const BLOCK_TYPE_CONFIG: Record<CommandBlock['type'], BlockTypeConfig> = {
  impulse: {
    label: '脉冲',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    Icon: Zap,
  },
  chain: {
    label: '链式',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-500',
    Icon: Link,
  },
  repeat: {
    label: '重复',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    Icon: Repeat,
  },
}

/**
 * 命令预览的最大长度
 */
const COMMAND_PREVIEW_MAX_LENGTH = 30

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 截断命令字符串用于预览显示
 * @param command - 完整命令字符串
 * @param maxLength - 最大显示长度
 * @returns 截断后的命令字符串
 */
function truncateCommand(command: string, maxLength: number): string {
  if (!command) return ''
  if (command.length <= maxLength) return command
  return command.slice(0, maxLength) + '...'
}

/**
 * 生成 Minecraft 风格的纹理背景样式
 * @returns CSS 样式对象
 */
function getMinecraftTextureStyle(): React.CSSProperties {
  return {
    // 模拟 Minecraft 方块的像素风格纹理
    backgroundImage: `
      linear-gradient(45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(0,0,0,0.05) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.05) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.05) 75%)
    `,
    backgroundSize: '8px 8px',
    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
  }
}

// ============================================================================
// 子组件
// ============================================================================

/**
 * 方块类型图标组件
 */
function BlockTypeIcon({
  type,
  className,
}: {
  type: CommandBlock['type']
  className?: string
}) {
  const config = BLOCK_TYPE_CONFIG[type]
  const { Icon } = config

  return (
    <div className={cn('p-1.5 rounded', config.bgColor)}>
      <Icon className={cn('w-4 h-4', config.iconColor, className)} />
    </div>
  )
}

/**
 * 条件模式标记组件
 */
function ConditionalBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 border-amber-500 text-amber-600 bg-amber-500/10"
          >
            <GitBranch className="w-3 h-3 mr-0.5" />
            条件
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>条件模式：仅当前置方块成功执行时才会执行</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * 自动执行标记组件
 */
function AutoBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] px-1 py-0 border-blue-500 text-blue-600 bg-blue-500/10"
          >
            自动
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>自动执行：无需红石信号激活</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * 命令预览组件
 */
function CommandPreview({ command }: { command: string }) {
  const displayCommand = useMemo(() => {
    return truncateCommand(command, COMMAND_PREVIEW_MAX_LENGTH)
  }, [command])

  if (!command) {
    return (
      <span className="text-muted-foreground text-xs italic">
        无命令
      </span>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <code className="text-xs font-mono text-foreground/80 block truncate cursor-help">
            {displayCommand}
          </code>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {command}
          </pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * 操作按钮组件
 */
function ActionButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1 rounded hover:bg-muted/80 transition-colors"
              aria-label="编辑"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>编辑命令</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 rounded hover:bg-destructive/10 transition-colors"
              aria-label="删除"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>删除方块</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

/**
 * 命令方块节点组件
 *
 * 用于在可视化编辑器中展示单个 Minecraft 命令方块
 */
export function CommandBlockNode({
  block,
  isSelected,
  isDragging,
  onSelect,
  onEdit,
  onDelete,
  dragHandleProps,
}: CommandBlockNodeProps) {
  // 获取当前方块类型的配置
  const typeConfig = BLOCK_TYPE_CONFIG[block.type]

  // 容器样式
  const containerClassName = useMemo(() => {
    return cn(
      // 基础样式
      'relative group rounded-lg border-2 bg-card shadow-sm',
      'cursor-pointer select-none',
      'transition-all duration-200 ease-out',
      // 类型相关样式
      typeConfig.borderColor,
      typeConfig.bgColor,
      // 状态样式
      isSelected && [
        'ring-2 ring-offset-2 ring-offset-background',
        'ring-primary shadow-lg',
        'scale-[1.02]',
      ],
      isDragging && [
        'opacity-70 shadow-xl',
        'rotate-2 scale-105',
      ],
      // 悬停效果
      !isSelected && !isDragging && 'hover:shadow-md hover:border-opacity-80'
    )
  }, [typeConfig, isSelected, isDragging])

  // 处理点击事件
  const handleClick = () => {
    onSelect()
  }

  // 处理双击事件（编辑）
  const handleDoubleClick = () => {
    onEdit()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${typeConfig.label}命令方块: ${block.command || '无命令'}`}
      aria-pressed={isSelected}
      className={containerClassName}
      style={getMinecraftTextureStyle()}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {/* 拖拽手柄 */}
      <div
        {...dragHandleProps}
        className={cn(
          'absolute left-0 top-0 bottom-0 w-2',
          'cursor-grab active:cursor-grabbing',
          'rounded-l-lg',
          'bg-gradient-to-r from-muted-foreground/20 to-transparent',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          dragHandleProps?.className
        )}
        aria-label="拖拽手柄"
      >
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2">
          <MoreVertical className="w-1.5 h-4 text-muted-foreground/50" />
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-3 pl-4">
        {/* 头部：类型图标和标签 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BlockTypeIcon type={block.type} />
            <span className={cn(
              'text-sm font-medium',
              typeConfig.iconColor
            )}>
              {typeConfig.label}
            </span>
          </div>

          {/* 标记区域 */}
          <div className="flex items-center gap-1">
            {block.conditional && <ConditionalBadge />}
            {block.auto && <AutoBadge />}
          </div>
        </div>

        {/* 命令预览 */}
        <div className="bg-muted/30 rounded px-2 py-1.5 mb-2">
          <CommandPreview command={block.command} />
        </div>

        {/* 底部：操作按钮 */}
        <div className="flex items-center justify-end">
          <ActionButtons onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      {/* 选中指示器 */}
      {isSelected && (
        <div className={cn(
          'absolute -top-1 -right-1',
          'w-3 h-3 rounded-full',
          'bg-primary shadow-sm',
          'ring-2 ring-background'
        )} />
      )}
    </div>
  )
}

export default CommandBlockNode
