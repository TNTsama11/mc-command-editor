/**
 * BlockTypeSelector - 命令方块类型和条件模式切换组件
 *
 * 提供命令方块的配置选项:
 * - 方块类型选择 (脉冲/链式/重复)
 * - 条件模式切换
 * - 始终激活切换
 * - 朝向选择器 (6个方向)
 */

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CommandBlockType, FacingDirection } from '@/core/commandBlock'
import {
  Zap,
  Link2,
  Repeat,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Compass,
} from 'lucide-react'

// ============================================================================
// 类型重导出（便于外部使用）
// ============================================================================

export type { CommandBlockType, FacingDirection } from '@/core/commandBlock'

/** 方块类型配置 */
interface BlockTypeConfig {
  value: CommandBlockType
  label: string
  description: string
  color: string
  bgColor: string
  icon: React.ElementType
}

/** 朝向配置 */
interface FacingConfig {
  value: FacingDirection
  label: string
  icon: React.ElementType
}

// ============================================================================
// 常量定义
// ============================================================================

/** 方块类型配置列表 */
const BLOCK_TYPES: BlockTypeConfig[] = [
  {
    value: 'impulse',
    label: '脉冲',
    description: '激活时执行一次',
    color: 'text-orange-500',
    bgColor: 'data-[state=on]:bg-orange-500/20 data-[state=on]:border-orange-500 data-[state=on]:text-orange-600',
    icon: Zap,
  },
  {
    value: 'chain',
    label: '链式',
    description: '由前方方块触发',
    color: 'text-green-500',
    bgColor: 'data-[state=on]:bg-green-500/20 data-[state=on]:border-green-500 data-[state=on]:text-green-600',
    icon: Link2,
  },
  {
    value: 'repeat',
    label: '重复',
    description: '每游戏刻执行一次',
    color: 'text-purple-500',
    bgColor: 'data-[state=on]:bg-purple-500/20 data-[state=on]:border-purple-500 data-[state=on]:text-purple-600',
    icon: Repeat,
  },
]

/** 朝向配置列表 */
const FACING_DIRECTIONS: FacingConfig[] = [
  { value: 'down', label: '向下', icon: ArrowDown },
  { value: 'up', label: '向上', icon: ArrowUp },
  { value: 'north', label: '北', icon: ArrowUpFromLine }, // 向外指（屏幕外）
  { value: 'south', label: '南', icon: ArrowDownFromLine }, // 向内指（屏幕内）
  { value: 'west', label: '西', icon: ArrowLeft },
  { value: 'east', label: '东', icon: ArrowRight },
]

/** 方块类型到颜色的映射 */
const BLOCK_TYPE_COLORS: Record<CommandBlockType, string> = {
  impulse: 'border-orange-500 bg-orange-500/10',
  chain: 'border-green-500 bg-green-500/10',
  repeat: 'border-purple-500 bg-purple-500/10',
}

// ============================================================================
// 组件 Props 定义
// ============================================================================

export interface BlockTypeSelectorProps {
  /** 当前方块类型 */
  blockType: CommandBlockType
  /** 是否条件模式 */
  conditional: boolean
  /** 是否始终激活 */
  alwaysActive: boolean
  /** 朝向 */
  facing: FacingDirection
  /** 方块类型变化回调 */
  onBlockTypeChange: (type: CommandBlockType) => void
  /** 条件模式变化回调 */
  onConditionalChange: (conditional: boolean) => void
  /** 始终激活变化回调 */
  onAlwaysActiveChange: (active: boolean) => void
  /** 朝向变化回调 */
  onFacingChange: (facing: FacingDirection) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// BlockTypeSelector 组件
// ============================================================================

export function BlockTypeSelector({
  blockType,
  conditional,
  alwaysActive,
  facing,
  onBlockTypeChange,
  onConditionalChange,
  onAlwaysActiveChange,
  onFacingChange,
  disabled = false,
  className,
}: BlockTypeSelectorProps) {
  // 获取当前方块类型配置
  const currentBlockType = BLOCK_TYPES.find((t) => t.value === blockType)

  return (
    <div className={cn('space-y-4', className)}>
      {/* 方块类型选择器 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">方块类型</label>
        <ToggleGroup
          type="single"
          value={blockType}
          onValueChange={(value) => {
            if (value) onBlockTypeChange(value as CommandBlockType)
          }}
          disabled={disabled}
          className="justify-stretch"
        >
          {BLOCK_TYPES.map((type) => {
            const Icon = type.icon
            const isActive = blockType === type.value

            return (
              <ToggleGroupItem
                key={type.value}
                value={type.value}
                aria-label={type.label}
                disabled={disabled}
                variant="outline"
                className={cn(
                  'flex-1 flex-col gap-1 h-auto py-3 px-2 border-2 transition-all',
                  'hover:bg-muted/50',
                  isActive && type.bgColor
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && type.color)} />
                <span className="text-xs font-medium">{type.label}</span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>

        {/* 当前类型描述 */}
        {currentBlockType && (
          <p className="text-xs text-muted-foreground">
            {currentBlockType.description}
          </p>
        )}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-border" />

      {/* 开关选项区域 */}
      <div className="space-y-4">
        {/* 条件模式 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-foreground">
              条件模式
            </label>
            <p className="text-xs text-muted-foreground">
              仅在前方命令方块执行成功时运行
            </p>
          </div>
          <Switch
            checked={conditional}
            onCheckedChange={onConditionalChange}
            disabled={disabled}
            aria-label="条件模式开关"
          />
        </div>

        {/* 始终激活 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-foreground">
              始终激活
            </label>
            <p className="text-xs text-muted-foreground">
              无需红石信号即可激活
            </p>
          </div>
          <Switch
            checked={alwaysActive}
            onCheckedChange={onAlwaysActiveChange}
            disabled={disabled}
            aria-label="始终激活开关"
          />
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-border" />

      {/* 朝向选择器 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Compass className="h-4 w-4" />
          朝向
        </label>
        <Select
          value={facing}
          onValueChange={(value) => onFacingChange(value as FacingDirection)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择朝向" />
          </SelectTrigger>
          <SelectContent>
            {FACING_DIRECTIONS.map((dir) => {
              const Icon = dir.icon
              return (
                <SelectItem key={dir.value} value={dir.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {dir.label} ({dir.value})
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* 当前配置预览 */}
      <div
        className={cn(
          'p-3 rounded-md border-2',
          BLOCK_TYPE_COLORS[blockType]
        )}
      >
        <div className="text-xs font-medium mb-1">当前配置</div>
        <div className="text-sm font-mono">
          {blockType === 'impulse' ? '脉冲' : blockType === 'chain' ? '链式' : '重复'}
          {conditional && ' · 条件'}
          {alwaysActive && ' · 始终激活'}
          {' · '}{facing}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 导出
// ============================================================================

export default BlockTypeSelector
