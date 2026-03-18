/**
 * CommandSelector - 命令类型选择器组件
 *
 * 提供 Minecraft 命令类型的下拉选择功能:
 * - 分组显示命令类型
 * - 支持搜索过滤
 * - 显示命令描述和用法提示
 */

import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { COMMAND_REGISTRY, type CommandDefinition } from '@/core/parser/commands'
import { cn } from '@/lib/utils'
import { Search, Command } from 'lucide-react'

// ============================================================================
// 命令分组定义
// ============================================================================

/** 命令分组配置 */
interface CommandGroup {
  id: string
  label: string
  commands: string[]
}

/** 命令分组列表 */
const COMMAND_GROUPS: CommandGroup[] = [
  {
    id: 'basic',
    label: '基础命令',
    commands: ['give', 'tp', 'kill', 'clear'],
  },
  {
    id: 'block',
    label: '方块操作',
    commands: ['setblock', 'fill', 'clone'],
  },
  {
    id: 'entity',
    label: '实体操作',
    commands: ['summon', 'effect'],
  },
  {
    id: 'condition',
    label: '条件执行',
    commands: ['execute'],
  },
  {
    id: 'data',
    label: '数据操作',
    commands: ['data', 'scoreboard'],
  },
  {
    id: 'game',
    label: '游戏设置',
    commands: ['gamemode', 'time', 'weather'],
  },
]

/** 命令用法提示映射 */
const COMMAND_USAGE: Record<string, string> = {
  give: '/give <targets> <item> [count]',
  tp: '/tp <targets> <destination>',
  kill: '/kill [targets]',
  clear: '/clear [targets] [item] [maxCount]',
  setblock: '/setblock <pos> <block> [mode]',
  fill: '/fill <from> <to> <block> [mode]',
  clone: '/clone <begin> <end> <destination> [mode]',
  summon: '/summon <entity> [pos] [nbt]',
  effect: '/effect give|clear <entity> [effect] [seconds] [amplifier]',
  execute: '/execute <subcommand> ... run <command>',
  data: '/data get|set|merge|remove <block|entity|storage> <target> [path]',
  scoreboard: '/scoreboard objectives|players <action> ...',
  gamemode: '/gamemode <mode> [target]',
  time: '/time set|add|query <value>',
  weather: '/weather clear|rain|thunder [duration]',
}

// ============================================================================
// 组件 Props 定义
// ============================================================================

export interface CommandSelectorProps {
  /** 当前选中的命令类型 */
  value?: string
  /** 命令选择变化回调 */
  onValueChange?: (value: string) => void
  /** 占位符文本 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// CommandSelector 组件
// ============================================================================

export function CommandSelector({
  value,
  onValueChange,
  placeholder = '选择命令类型...',
  disabled = false,
  className,
}: CommandSelectorProps) {
  // 搜索关键词状态
  const [searchTerm, setSearchTerm] = useState('')

  /** 根据搜索词过滤命令分组 */
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return COMMAND_GROUPS
    }

    const lowerSearch = searchTerm.toLowerCase()
    return COMMAND_GROUPS.map((group) => ({
      ...group,
      commands: group.commands.filter((cmd) => {
        const def = COMMAND_REGISTRY[cmd]
        const matchesName = cmd.toLowerCase().includes(lowerSearch)
        const matchesDesc = def?.description.toLowerCase().includes(lowerSearch)
        return matchesName || matchesDesc
      }),
    })).filter((group) => group.commands.length > 0)
  }, [searchTerm])

  /** 获取命令定义 */
  const getCommandDef = (name: string): CommandDefinition | undefined => {
    return COMMAND_REGISTRY[name]
  }

  /** 获取命令用法 */
  const getCommandUsage = (name: string): string => {
    return COMMAND_USAGE[name] || `/${name}`
  }

  /** 处理命令选择 */
  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue)
    setSearchTerm('') // 选择后清空搜索
  }

  /** 获取当前选中命令的信息 */
  const selectedCommandDef = value ? getCommandDef(value) : undefined
  const selectedUsage = value ? getCommandUsage(value) : undefined

  return (
    <div className={cn('space-y-2', className)}>
      {/* 命令选择器 */}
      <Select value={value} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder}>
            {value && (
              <span className="flex items-center gap-2">
                <Command className="h-4 w-4" />
                <span className="font-mono">/{value}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="w-[320px]">
          {/* 搜索输入框 */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索命令..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* 命令分组列表 */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                未找到匹配的命令
              </div>
            ) : (
              filteredGroups.map((group) => (
                <SelectGroup key={group.id}>
                  <SelectLabel className="text-xs text-muted-foreground">
                    {group.label}
                  </SelectLabel>
                  {group.commands.map((cmd) => {
                    const def = getCommandDef(cmd)
                    return (
                      <SelectItem
                        key={cmd}
                        value={cmd}
                        className="flex flex-col items-start py-2"
                      >
                        <span className="font-mono font-medium">/{cmd}</span>
                        {def && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {def.description}
                          </span>
                        )}
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              ))
            )}
          </div>
        </SelectContent>
      </Select>

      {/* 选中命令的用法提示 */}
      {selectedCommandDef && selectedUsage && (
        <div className="p-3 rounded-md bg-muted/50 border text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Command className="h-4 w-4 text-primary" />
            <span className="font-medium">用法示例</span>
          </div>
          <code className="block font-mono text-xs bg-background/50 p-2 rounded mt-1 overflow-x-auto">
            {selectedUsage}
          </code>
          <p className="text-muted-foreground mt-2 text-xs">
            {selectedCommandDef.description}
          </p>
          {selectedCommandDef.parameters.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <span className="text-xs font-medium text-muted-foreground">参数:</span>
              <ul className="mt-1 space-y-0.5">
                {selectedCommandDef.parameters.map((param) => (
                  <li key={param.name} className="text-xs">
                    <span className="font-mono text-foreground">{param.name}</span>
                    {!param.required && (
                      <span className="text-muted-foreground"> (可选)</span>
                    )}
                    {param.description && (
                      <span className="text-muted-foreground"> - {param.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 导出
// ============================================================================

export default CommandSelector
