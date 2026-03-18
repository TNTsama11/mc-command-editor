/**
 * NBT 编辑器组件
 *
 * 提供 Minecraft NBT 数据的可视化编辑功能:
 * - JSON 格式化输入
 * - 语法高亮
 * - 格式验证
 * - 树形结构展示（折叠/展开）
 *
 * 支持常用 NBT 类型:
 * - 字符串 (String)
 * - 数字 (Byte, Short, Int, Long, Float, Double)
 * - 布尔 (Boolean)
 * - 列表 (List)
 * - 复合 (Compound)
 */

import * as React from 'react'
import {
  Braces,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Copy,
  FileJson,
  List,
  Type,
  Hash,
  ToggleLeft,
  FolderOpen,
  RefreshCw,
  Minimize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { NBTValue, NBTCompound } from '@/core/parser/ast'

// ============== 类型定义 ==============

/** NBT 值类型 */
type NBTValueType = 'string' | 'number' | 'boolean' | 'list' | 'compound' | 'null'

/** 解析结果 */
interface ParseResult {
  success: boolean
  data: NBTCompound | null
  error: string | null
  errorPosition?: { line: number; column: number }
}

/** 树节点状态 - 保留供将来扩展使用 */
// interface TreeNodeState {
//   expanded: boolean
// }

/** 组件 Props */
export interface NBTEditorProps {
  /** 当前 NBT 字符串值 */
  value: string
  /** 值变更回调 */
  onChange: (value: string) => void
  /** 解析后的 NBT 数据回调 */
  onParsed?: (data: NBTCompound | null, error: string | null) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示验证状态 */
  showValidation?: boolean
  /** 是否显示树形视图 */
  showTreeView?: boolean
  /** 默认展开层级 */
  defaultExpandDepth?: number
  /** 自定义类名 */
  className?: string
  /** 编辑器高度 */
  height?: string | number
}

/** 树节点 Props */
interface TreeNodeProps {
  /** 键名 */
  name: string
  /** 值 */
  value: NBTValue
  /** 展开状态 */
  expanded: boolean
  /** 切换展开状态 */
  onToggle: () => void
  /** 深度 */
  depth: number
  /** 是否为数组元素 */
  isArrayElement?: boolean
}

// ============== 辅助函数 ==============

/**
 * 检测 NBT 值类型
 */
function getNBTType(value: NBTValue): NBTValueType {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (Array.isArray(value)) return 'list'
  if (typeof value === 'object') return 'compound'
  return 'null'
}

/**
 * 获取类型的显示名称
 */
function getTypeLabel(type: NBTValueType): string {
  const labels: Record<NBTValueType, string> = {
    string: '字符串',
    number: '数字',
    boolean: '布尔',
    list: '列表',
    compound: '复合',
    null: '空',
  }
  return labels[type]
}

/**
 * 获取类型的图标
 */
function getTypeIcon(type: NBTValueType): React.ReactNode {
  switch (type) {
    case 'string':
      return <Type className="h-3 w-3" />
    case 'number':
      return <Hash className="h-3 w-3" />
    case 'boolean':
      return <ToggleLeft className="h-3 w-3" />
    case 'list':
      return <List className="h-3 w-3" />
    case 'compound':
      return <FolderOpen className="h-3 w-3" />
    default:
      return null
  }
}

/**
 * 获取类型的颜色类
 */
function getTypeColorClass(type: NBTValueType): string {
  const colors: Record<NBTValueType, string> = {
    string: 'text-green-600 dark:text-green-400',
    number: 'text-blue-600 dark:text-blue-400',
    boolean: 'text-purple-600 dark:text-purple-400',
    list: 'text-orange-600 dark:text-orange-400',
    compound: 'text-amber-600 dark:text-amber-400',
    null: 'text-gray-500 dark:text-gray-400',
  }
  return colors[type]
}

/**
 * 格式化值显示
 */
function formatValue(value: NBTValue, type: NBTValueType): string {
  if (type === 'null') return 'null'
  if (type === 'string') return `"${value}"`
  if (type === 'boolean') return value ? 'true' : 'false'
  if (type === 'number') return String(value)
  if (type === 'list') return `[${(value as NBTValue[]).length} 项]`
  if (type === 'compound') return `{${Object.keys(value as NBTCompound).length} 项}`
  return String(value)
}

/**
 * 尝试解析 JSON 字符串
 */
function parseNBTString(input: string): ParseResult {
  if (!input || input.trim() === '') {
    return { success: true, data: null, error: null }
  }

  try {
    const data = JSON.parse(input) as NBTCompound
    return { success: true, data, error: null }
  } catch (e) {
    const error = e as SyntaxError
    // 尝试解析错误位置
    const positionMatch = error.message.match(/position\s+(\d+)/i)
    let errorPosition: { line: number; column: number } | undefined

    if (positionMatch) {
      const position = parseInt(positionMatch[1], 10)
      const lines = input.substring(0, position).split('\n')
      errorPosition = {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
      }
    }

    return {
      success: false,
      data: null,
      error: error.message,
      errorPosition,
    }
  }
}

/**
 * 格式化 JSON 字符串
 */
function formatJSON(input: string, indent: number = 2): string {
  if (!input || input.trim() === '') return ''

  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed, null, indent)
  } catch {
    return input
  }
}

/**
 * 压缩 JSON 字符串
 */
function minifyJSON(input: string): string {
  if (!input || input.trim() === '') return ''

  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed)
  } catch {
    return input
  }
}

/**
 * 将 NBT 数据转换为 Minecraft 命令格式字符串
 */
function nbtToCommandString(data: NBTValue, depth: number = 0): string {
  const indent = '  '.repeat(depth)

  if (data === null || data === undefined) {
    return 'null'
  }

  const type = getNBTType(data)

  switch (type) {
    case 'string':
      return `"${data}"`
    case 'number':
    case 'boolean':
      return String(data)
    case 'list': {
      const items = (data as NBTValue[]).map((item) =>
        nbtToCommandString(item, depth + 1)
      )
      return `[${items.join(',')}]`
    }
    case 'compound': {
      const entries = Object.entries(data as NBTCompound).map(([key, value]) => {
        const valueStr = nbtToCommandString(value, depth + 1)
        return `${key}:${valueStr}`
      })
      if (entries.length === 0) return '{}'
      if (entries.length <= 3) {
        return `{${entries.join(',')}}`
      }
      return `{\n${indent}  ${entries.join(',\n' + indent + '  ')}\n${indent}}`
    }
    default:
      return String(data)
  }
}

// ============== 子组件 ==============

/** 树节点组件 */
function TreeNode({
  name,
  value,
  expanded,
  onToggle,
  depth,
  isArrayElement = false,
}: TreeNodeProps) {
  const type = getNBTType(value)
  const isExpandable = type === 'compound' || type === 'list'
  const hasChildren =
    isExpandable &&
    ((type === 'list' && (value as NBTValue[]).length > 0) ||
      (type === 'compound' && Object.keys(value as NBTCompound).length > 0))

  // 子节点状态
  const [childStates, setChildStates] = React.useState<Record<string, boolean>>({})

  const toggleChild = (key: string) => {
    setChildStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // 渲染子节点
  const renderChildren = () => {
    if (!expanded || !isExpandable) return null

    if (type === 'list') {
      const items = value as NBTValue[]
      return (
        <div className="ml-4 border-l border-border pl-2">
          {items.map((item, index) => (
            <TreeNode
              key={index}
              name={`[${index}]`}
              value={item}
              expanded={childStates[index.toString()] ?? false}
              onToggle={() => toggleChild(index.toString())}
              depth={depth + 1}
              isArrayElement
            />
          ))}
        </div>
      )
    }

    if (type === 'compound') {
      const obj = value as NBTCompound
      return (
        <div className="ml-4 border-l border-border pl-2">
          {Object.entries(obj).map(([key, val]) => (
            <TreeNode
              key={key}
              name={key}
              value={val}
              expanded={childStates[key] ?? false}
              onToggle={() => toggleChild(key)}
              depth={depth + 1}
            />
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="py-0.5">
      <div
        className={cn(
          'flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-muted/50 cursor-default',
          depth === 0 && 'font-medium'
        )}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <button
            type="button"
            onClick={onToggle}
            className="h-4 w-4 flex items-center justify-center hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="h-4 w-4" />
        )}

        {/* 键名 */}
        {!isArrayElement && (
          <span className="text-red-600 dark:text-red-400 font-mono text-xs">
            {name}
          </span>
        )}
        {!isArrayElement && <span className="text-muted-foreground">:</span>}

        {/* 类型图标和标签 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1 py-0 h-4 gap-0.5', getTypeColorClass(type))}
              >
                {getTypeIcon(type)}
                <span className="hidden sm:inline">{getTypeLabel(type)}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>类型: {getTypeLabel(type)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 值预览 */}
        <span className={cn('font-mono text-xs truncate', getTypeColorClass(type))}>
          {formatValue(value, type)}
        </span>
      </div>

      {/* 子节点 */}
      {renderChildren()}
    </div>
  )
}

// ============== 主组件 ==============

export function NBTEditor({
  value,
  onChange,
  onParsed,
  disabled = false,
  showValidation = true,
  showTreeView = true,
  defaultExpandDepth = 2,
  className,
  height = 300,
}: NBTEditorProps) {
  // 内部状态
  const [viewMode, setViewMode] = React.useState<'editor' | 'tree'>('editor')
  const [parseResult, setParseResult] = React.useState<ParseResult>({
    success: true,
    data: null,
    error: null,
  })
  const [treeExpanded, setTreeExpanded] = React.useState<Record<string, boolean>>({})

  // 解析输入值
  React.useEffect(() => {
    const result = parseNBTString(value)
    setParseResult(result)

    // 通知父组件
    if (onParsed) {
      onParsed(result.data, result.error)
    }
  }, [value, onParsed])

  // 格式化处理
  const handleFormat = React.useCallback(() => {
    const formatted = formatJSON(value)
    onChange(formatted)
  }, [value, onChange])

  // 压缩处理
  const handleMinify = React.useCallback(() => {
    const minified = minifyJSON(value)
    onChange(minified)
  }, [value, onChange])

  // 复制处理
  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(value)
  }, [value])

  // 复制为 Minecraft 命令格式
  const handleCopyAsCommand = React.useCallback(() => {
    if (parseResult.data) {
      const commandStr = nbtToCommandString(parseResult.data)
      navigator.clipboard.writeText(commandStr)
    }
  }, [parseResult.data])

  // 展开所有节点
  const expandAll = React.useCallback(() => {
    if (!parseResult.data) return

    const expandNode = (obj: NBTCompound, prefix: string = '') => {
      const states: Record<string, boolean> = {}
      Object.entries(obj).forEach(([key, val]) => {
        const path = prefix ? `${prefix}.${key}` : key
        const type = getNBTType(val)
        if (type === 'compound' || type === 'list') {
          states[path] = true
          if (type === 'compound') {
            Object.assign(states, expandNode(val as NBTCompound, path))
          }
        }
      })
      return states
    }

    setTreeExpanded(expandNode(parseResult.data))
  }, [parseResult.data])

  // 折叠所有节点
  const collapseAll = React.useCallback(() => {
    setTreeExpanded({})
  }, [])

  // 切换树节点
  const toggleTreeNode = React.useCallback((path: string) => {
    setTreeExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }))
  }, [])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {/* 视图切换 */}
            {showTreeView && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('editor')}
                      disabled={disabled}
                    >
                      <FileJson className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>编辑器视图</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'tree' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('tree')}
                      disabled={disabled || !parseResult.success || !parseResult.data}
                    >
                      <Braces className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>树形视图</TooltipContent>
                </Tooltip>
              </>
            )}

            {/* 格式化 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormat}
                  disabled={disabled || !value}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>格式化 JSON</TooltipContent>
            </Tooltip>

            {/* 压缩 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMinify}
                  disabled={disabled || !value}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>压缩 JSON</TooltipContent>
            </Tooltip>

            {/* 复制 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={disabled || !value}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>复制 JSON</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* 验证状态 */}
        {showValidation && (
          <div className="flex items-center gap-2">
            {value && (
              <>
                {parseResult.success ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    有效 JSON
                  </Badge>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="cursor-help">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          格式错误
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{parseResult.error}</p>
                        {parseResult.errorPosition && (
                          <p className="text-xs mt-1">
                            行: {parseResult.errorPosition.line}, 列: {parseResult.errorPosition.column}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 编辑区域 */}
      {viewMode === 'editor' && (
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder='{"key": "value", "number": 123, "nested": {"a": true}}'
            className={cn(
              'font-mono text-sm resize-none',
              !parseResult.success && value && 'border-destructive focus-visible:ring-destructive'
            )}
            style={{ height: typeof height === 'number' ? `${height}px` : height }}
            disabled={disabled}
            spellCheck={false}
          />

          {/* 语法高亮覆盖层（只读显示） */}
          {/* 注意: 实际语法高亮需要更复杂的实现，这里暂时用 Textarea 原生显示 */}
        </div>
      )}

      {/* 树形视图 */}
      {viewMode === 'tree' && showTreeView && parseResult.data && (
        <div
          className={cn(
            'border rounded-md p-3 overflow-auto bg-muted/30',
            'max-h-[400px]'
          )}
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          {/* 树形视图工具栏 */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              展开全部
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              折叠全部
            </Button>
            <div className="flex-1" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAsCommand}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    复制为 NBT
                  </Button>
                </TooltipTrigger>
                <TooltipContent>复制为 Minecraft NBT 格式</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 树形结构 */}
          <div className="space-y-1">
            {Object.entries(parseResult.data).map(([key, val]) => (
              <TreeNode
                key={key}
                name={key}
                value={val}
                expanded={treeExpanded[key] ?? depthShouldExpand(key, defaultExpandDepth)}
                onToggle={() => toggleTreeNode(key)}
                depth={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {viewMode === 'tree' && !parseResult.data && (
        <div
          className="flex items-center justify-center text-muted-foreground border rounded-md bg-muted/30"
          style={{ height: typeof height === 'number' ? `${height}px` : height }}
        >
          <div className="text-center">
            <Braces className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">输入有效的 JSON 数据以查看树形结构</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 判断指定深度的节点是否应该默认展开
 */
function depthShouldExpand(path: string, maxDepth: number): boolean {
  const depth = path.split('.').length
  return depth <= maxDepth
}

// ============== 导出辅助函数 ==============

export { parseNBTString, formatJSON, minifyJSON, nbtToCommandString, getNBTType }

export default NBTEditor
