/**
 * 目标选择器组件
 *
 * 支持 Minecraft 目标选择器的可视化配置:
 * - @p - 最近的玩家
 * - @a - 所有玩家
 * - @e - 所有实体
 * - @r - 随机玩家
 * - @s - 执行者
 * - 玩家名/UUID 输入
 *
 * 支持选择器参数配置: type, limit, distance, tag, team, name, x/y/z, dx/dy/dz, scores, nbt, gamemode
 */

import * as React from 'react'
import { Plus, X, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { SelectorType, TargetSelector, Target, Range } from '@/core/parser/ast'

// ============== 类型定义 ==============

/** 选择器类型选项 */
interface SelectorOption {
  value: SelectorType | 'player' | 'uuid'
  label: string
  description: string
}

/** 选择器参数键 */
type SelectorArgumentKey =
  | 'type'
  | 'limit'
  | 'sort'
  | 'distance'
  | 'tag'
  | 'team'
  | 'name'
  | 'x'
  | 'y'
  | 'z'
  | 'dx'
  | 'dy'
  | 'dz'
  | 'scores'
  | 'nbt'
  | 'gamemode'
  | 'level'
  | 'x_rotation'
  | 'y_rotation'
  | 'advancements'

/** 参数配置 */
interface ArgumentConfig {
  key: SelectorArgumentKey
  label: string
  description: string
  type: 'text' | 'number' | 'range' | 'select' | 'tags'
  placeholder?: string
  options?: { value: string; label: string }[]
  applicableTo: SelectorType[]
}

/** 组件 Props */
export interface TargetSelectorProps {
  /** 当前值 */
  value?: Target | null
  /** 值变更回调 */
  onChange: (target: Target | null) => void
  /** 是否显示预览 */
  showPreview?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

// ============== 常量配置 ==============

/** 选择器类型选项列表 */
const SELECTOR_OPTIONS: SelectorOption[] = [
  { value: '@p', label: '@p', description: '最近的玩家' },
  { value: '@a', label: '@a', description: '所有玩家' },
  { value: '@e', label: '@e', description: '所有实体' },
  { value: '@r', label: '@r', description: '随机玩家' },
  { value: '@s', label: '@s', description: '执行者' },
  { value: 'player', label: '玩家名', description: '指定玩家名称' },
  { value: 'uuid', label: 'UUID', description: '实体唯一标识符' },
]

/** 选择器参数配置列表 */
const ARGUMENT_CONFIGS: ArgumentConfig[] = [
  {
    key: 'type',
    label: '实体类型',
    description: '筛选特定类型的实体',
    type: 'text',
    placeholder: '如: minecraft:cow, zombie',
    applicableTo: ['@e', '@r'],
  },
  {
    key: 'limit',
    label: '数量限制',
    description: '最多选择多少个目标',
    type: 'number',
    placeholder: '1-100',
    applicableTo: ['@a', '@e', '@r'],
  },
  {
    key: 'sort',
    label: '排序方式',
    description: '选择目标的排序规则',
    type: 'select',
    options: [
      { value: 'nearest', label: '最近' },
      { value: 'furthest', label: '最远' },
      { value: 'random', label: '随机' },
      { value: 'arbitrary', label: '任意' },
    ],
    applicableTo: ['@a', '@e'],
  },
  {
    key: 'distance',
    label: '距离范围',
    description: '与执行位置的距离范围',
    type: 'range',
    placeholder: '如: 10 或 5..20',
    applicableTo: ['@p', '@a', '@e', '@r'],
  },
  {
    key: 'tag',
    label: '标签',
    description: '实体的标签筛选',
    type: 'tags',
    placeholder: '输入标签名',
    applicableTo: ['@p', '@a', '@e', '@r', '@s'],
  },
  {
    key: 'team',
    label: '队伍',
    description: '队伍名称筛选',
    type: 'text',
    placeholder: '队伍名或 !队伍名',
    applicableTo: ['@p', '@a', '@e', '@r', '@s'],
  },
  {
    key: 'name',
    label: '名称',
    description: '实体的显示名称',
    type: 'text',
    placeholder: '名称或 !名称',
    applicableTo: ['@p', '@a', '@e', '@r', '@s'],
  },
  {
    key: 'x',
    label: 'X 坐标',
    description: '选择中心 X 坐标',
    type: 'number',
    placeholder: '坐标值',
    applicableTo: ['@p', '@a', '@e', '@r'],
  },
  {
    key: 'y',
    label: 'Y 坐标',
    description: '选择中心 Y 坐标',
    type: 'number',
    placeholder: '坐标值',
    applicableTo: ['@p', '@a', '@e', '@r'],
  },
  {
    key: 'z',
    label: 'Z 坐标',
    description: '选择中心 Z 坐标',
    type: 'number',
    placeholder: '坐标值',
    applicableTo: ['@p', '@a', '@e', '@r'],
  },
  {
    key: 'dx',
    label: 'DX 体积',
    description: 'X 方向的体积大小',
    type: 'number',
    placeholder: '体积值',
    applicableTo: ['@p', '@a', '@e', '@r'],
  },
  {
    key: 'dy',
    label: 'DY 体积',
    description: 'Y 方向的体积大小',
    type: 'number',
    placeholder: '体积值',
    applicableTo: ['@p', '@a', '@e', '@r'],
  },
  {
    key: 'dz',
    label: 'DZ 体积',
    description: 'Z 方向的体积大小',
    type: 'number',
    placeholder: '体积值',
    applicableTo: ['@p', '@a', '@e', '@r'],
  },
  {
    key: 'gamemode',
    label: '游戏模式',
    description: '玩家的游戏模式',
    type: 'select',
    options: [
      { value: 'survival', label: '生存模式' },
      { value: 'creative', label: '创造模式' },
      { value: 'adventure', label: '冒险模式' },
      { value: 'spectator', label: '旁观模式' },
      { value: '!survival', label: '非生存' },
      { value: '!creative', label: '非创造' },
      { value: '!adventure', label: '非冒险' },
      { value: '!spectator', label: '非旁观' },
    ],
    applicableTo: ['@p', '@a', '@r'],
  },
  {
    key: 'level',
    label: '等级范围',
    description: '玩家的经验等级',
    type: 'range',
    placeholder: '如: 10..30',
    applicableTo: ['@p', '@a', '@r'],
  },
  {
    key: 'nbt',
    label: 'NBT 数据',
    description: 'NBT 数据匹配',
    type: 'text',
    placeholder: '如: {CustomName:"test"}',
    applicableTo: ['@p', '@a', '@e', '@r', '@s'],
  },
  {
    key: 'scores',
    label: '分数',
    description: '记分板分数匹配',
    type: 'text',
    placeholder: '如: {points:10..}',
    applicableTo: ['@p', '@a', '@e', '@r', '@s'],
  },
]


// ============== 辅助函数 ==============

/**
 * 将选择器目标转换为命令字符串
 */
function targetToString(target: Target | null): string {
  if (!target) return ''

  // 检查是否是玩家引用
  if ('type' in target) {
    if (target.type === 'player') {
      return target.value
    }
    if (target.type === 'uuid') {
      return target.value
    }

    // 目标选择器
    const selector = target as TargetSelector
    if (!selector.arguments || Object.keys(selector.arguments).length === 0) {
      return selector.type
    }

    // 序列化参数
    const args = Object.entries(selector.arguments)
      .filter(([, value]) => {
        if (value === undefined || value === null || value === '') return false
        if (Array.isArray(value) && value.length === 0) return false
        return true
      })
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}=${value.join(',')}`
        }
        if (typeof value === 'object' && value !== null) {
          // Range 类型
          const range = value as Range
          if (range.exact !== undefined) {
            return `${key}=${range.exact}`
          }
          const min = range.min !== undefined ? range.min : ''
          const max = range.max !== undefined ? range.max : ''
          return `${key}=${min}..${max}`
        }
        return `${key}=${value}`
      })
      .join(',')

    return args ? `${selector.type}[${args}]` : selector.type
  }

  return ''
}

/**
 * 解析范围字符串
 */
function parseRange(input: string): Range | number | undefined {
  if (!input || input.trim() === '') return undefined

  // 精确值
  if (/^-?\d+(\.\d+)?$/.test(input)) {
    return { exact: parseFloat(input) }
  }

  // 范围值
  const match = input.match(/^(-?\d*\.?\d*)?\.\.(-?\d*\.?\d*)?$/)
  if (match) {
    const range: Range = {}
    if (match[1] !== undefined && match[1] !== '') {
      range.min = parseFloat(match[1])
    }
    if (match[2] !== undefined && match[2] !== '') {
      range.max = parseFloat(match[2])
    }
    return range
  }

  // 无法解析，返回 undefined
  return undefined
}

/**
 * 将范围转换为字符串
 */
function rangeToString(range: Range | number | undefined): string {
  if (range === undefined) return ''
  if (typeof range === 'number') return String(range)

  if (range.exact !== undefined) {
    return String(range.exact)
  }

  const min = range.min !== undefined ? range.min : ''
  const max = range.max !== undefined ? range.max : ''
  return `${min}..${max}`
}

// ============== 子组件 ==============

/** 参数输入组件 */
interface ArgumentInputProps {
  config: ArgumentConfig
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
}

function ArgumentInput({ config, value, onChange, disabled }: ArgumentInputProps) {
  switch (config.type) {
    case 'number':
      return (
        <Input
          type="number"
          value={(value as number) ?? ''}
          onChange={(e) => {
            const val = e.target.value
            onChange(val === '' ? undefined : parseInt(val, 10))
          }}
          placeholder={config.placeholder}
          disabled={disabled}
          className="h-8"
        />
      )

    case 'range':
      return (
        <Input
          type="text"
          value={rangeToString(value as Range)}
          onChange={(e) => {
            const parsed = parseRange(e.target.value)
            onChange(parsed)
          }}
          placeholder={config.placeholder}
          disabled={disabled}
          className="h-8"
        />
      )

    case 'select':
      return (
        <Select
          value={(value as string) ?? ''}
          onValueChange={(val) => onChange(val === '' ? undefined : val)}
          disabled={disabled}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="选择..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">无</SelectItem>
            {config.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'tags': {
      const tags = (value as string[]) ?? []
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
                <button
                  type="button"
                  onClick={() => {
                    const newTags = [...tags]
                    newTags.splice(index, 1)
                    onChange(newTags.length > 0 ? newTags : undefined)
                  }}
                  className="ml-1 hover:text-destructive"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            type="text"
            placeholder={config.placeholder}
            className="h-8"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement
                const newTag = input.value.trim()
                if (newTag && !tags.includes(newTag)) {
                  onChange([...tags, newTag])
                  input.value = ''
                }
              }
            }}
          />
        </div>
      )
    }

    case 'text':
    default:
      return (
        <Input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => {
            const val = e.target.value
            onChange(val === '' ? undefined : val)
          }}
          placeholder={config.placeholder}
          disabled={disabled}
          className="h-8"
        />
      )
  }
}

// ============== 主组件 ==============

export function TargetSelector({
  value,
  onChange,
  showPreview = true,
  disabled = false,
  className,
}: TargetSelectorProps) {
  // 内部状态
  const [selectorType, setSelectorType] = React.useState<SelectorType | 'player' | 'uuid'>(() => {
    if (!value) return '@p'
    if ('type' in value) {
      if (value.type === 'player' || value.type === 'uuid') {
        return value.type
      }
      return value.type
    }
    return '@p'
  })

  const [playerName, setPlayerName] = React.useState<string>(() => {
    if (value && 'type' in value && value.type === 'player') {
      return value.value
    }
    return ''
  })

  const [uuidValue, setUuidValue] = React.useState<string>(() => {
    if (value && 'type' in value && value.type === 'uuid') {
      return value.value
    }
    return ''
  })

  const [arguments_, setArguments] = React.useState<Record<string, unknown>>(() => {
    if (value && 'type' in value) {
      const selector = value as TargetSelector
      if (selector.arguments) {
        return { ...selector.arguments }
      }
    }
    return {}
  })

  const [expandedArgs, setExpandedArgs] = React.useState<Set<string>>(new Set())

  // 同步外部值变化
  React.useEffect(() => {
    if (!value) {
      setSelectorType('@p')
      setPlayerName('')
      setUuidValue('')
      setArguments({})
      return
    }

    if ('type' in value) {
      if (value.type === 'player') {
        setSelectorType('player')
        setPlayerName(value.value)
      } else if (value.type === 'uuid') {
        setSelectorType('uuid')
        setUuidValue(value.value)
      } else {
        setSelectorType(value.type)
        setArguments(value.arguments ?? {})
      }
    }
  }, [value])

  // 构建目标并通知父组件
  const updateTarget = React.useCallback(() => {
    let newTarget: Target | null = null

    if (selectorType === 'player') {
      if (playerName.trim()) {
        newTarget = { type: 'player', value: playerName.trim() }
      }
    } else if (selectorType === 'uuid') {
      if (uuidValue.trim()) {
        newTarget = { type: 'uuid', value: uuidValue.trim() }
      }
    } else {
      const filteredArgs = Object.fromEntries(
        Object.entries(arguments_).filter(([, v]) => {
          if (v === undefined || v === null || v === '') return false
          if (Array.isArray(v) && v.length === 0) return false
          return true
        })
      )
      newTarget = {
        type: selectorType,
        arguments: Object.keys(filteredArgs).length > 0 ? filteredArgs : undefined,
      } as TargetSelector
    }

    onChange(newTarget)
  }, [selectorType, playerName, uuidValue, arguments_, onChange])

  // 状态变化时更新
  React.useEffect(() => {
    updateTarget()
  }, [updateTarget])

  // 获取当前可用的参数
  const availableArgs = ARGUMENT_CONFIGS.filter((arg) =>
    selectorType !== 'player' && selectorType !== 'uuid'
      ? arg.applicableTo.includes(selectorType)
      : false
  )

  // 切换参数展开状态
  const toggleArg = (key: string) => {
    setExpandedArgs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        // 移除该参数的值
        setArguments((args) => {
          const newArgs = { ...args }
          delete newArgs[key]
          return newArgs
        })
      } else {
        next.add(key)
      }
      return next
    })
  }

  // 更新参数值
  const updateArg = (key: string, argValue: unknown) => {
    setArguments((args) => ({
      ...args,
      [key]: argValue,
    }))
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">目标选择器</CardTitle>
        <CardDescription>配置命令的目标选择器</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 选择器类型 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">选择器类型</label>
          <Select
            value={selectorType}
            onValueChange={(val) => {
              setSelectorType(val as SelectorType | 'player' | 'uuid')
              setArguments({})
              setExpandedArgs(new Set())
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SELECTOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="font-mono font-bold">{opt.label}</span>
                  <span className="ml-2 text-muted-foreground">{opt.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 玩家名输入 */}
        {selectorType === 'player' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">玩家名称</label>
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="输入玩家名称"
              disabled={disabled}
            />
          </div>
        )}

        {/* UUID 输入 */}
        {selectorType === 'uuid' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">UUID</label>
            <Input
              type="text"
              value={uuidValue}
              onChange={(e) => setUuidValue(e.target.value)}
              placeholder="输入实体 UUID"
              disabled={disabled}
            />
          </div>
        )}

        {/* 选择器参数 */}
        {selectorType !== 'player' && selectorType !== 'uuid' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">选择器参数</label>
              <span className="text-xs text-muted-foreground">点击添加参数</span>
            </div>

            {/* 已添加的参数 */}
            {expandedArgs.size > 0 && (
              <div className="space-y-3">
                {Array.from(expandedArgs).map((key) => {
                  const config = ARGUMENT_CONFIGS.find((c) => c.key === key)
                  if (!config) return null

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">
                          {config.label}
                          <span className="ml-1 text-muted-foreground/50">
                            ({config.description})
                          </span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleArg(key)}
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <ArgumentInput
                        config={config}
                        value={arguments_[key]}
                        onChange={(val) => updateArg(key, val)}
                        disabled={disabled}
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {/* 可添加的参数 */}
            {availableArgs.filter((arg) => !expandedArgs.has(arg.key)).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {availableArgs
                  .filter((arg) => !expandedArgs.has(arg.key))
                  .map((arg) => (
                    <Button
                      key={arg.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleArg(arg.key)}
                      disabled={disabled}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {arg.label}
                    </Button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 预览 */}
        {showPreview && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4" />
              预览
            </div>
            <div className="rounded-md bg-muted p-3 font-mono text-sm">
              {targetToString(value ?? null) || (
                <span className="text-muted-foreground">未配置</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TargetSelector
