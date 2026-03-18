/**
 * 实时命令预览组件
 *
 * 功能:
 * - 显示当前编辑的命令字符串
 * - 语法高亮（命令名、参数、值）
 * - 一键复制到剪贴板
 * - 错误提示
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Copy, Check, AlertCircle, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ============================================================================
// 类型定义
// ============================================================================

/** 语法高亮分段 */
interface SyntaxSegment {
  text: string
  type: 'command' | 'argument' | 'value' | 'operator' | 'string' | 'number' | 'selector' | 'error'
}

/** 验证错误 */
export interface ValidationError {
  message: string
  position?: number
  severity: 'error' | 'warning'
}

/** 命令预览组件属性 */
export interface CommandPreviewProps {
  /** 命令类型 */
  commandType: string
  /** 参数值映射 */
  params: Record<string, unknown>
  /** 自定义错误 */
  errors?: ValidationError[]
  /** 复制成功回调 */
  onCopySuccess?: () => void
  /** 复制失败回调 */
  onCopyError?: (error: Error) => void
  /** 自定义类名 */
  className?: string
  /** 是否禁用复制按钮 */
  disableCopy?: boolean
  /** 显示空状态 */
  showEmptyState?: boolean
}

// ============================================================================
// 语法高亮工具
// ============================================================================

/**
 * 解析命令字符串为语法分段
 */
function parseCommandToSegments(command: string): SyntaxSegment[] {
  if (!command || command.length === 0) {
    return []
  }

  const segments: SyntaxSegment[] = []

  // 移除开头的斜杠
  const content = command.startsWith('/') ? command.slice(1) : command

  // 使用正则分割命令
  // 匹配: 空格、引号字符串、目标选择器、数字、普通字符
  const tokenRegex = /(\s+|"[^"]*"|'[^']*'|@[parse]\[?[^\]]*\]?|@s|@p|@a|@e|@r|~[\d.-]*|\^[\d.-]*|[\d.-]+|[^\s]+)/g

  let match
  let isFirst = true

  while ((match = tokenRegex.exec(content)) !== null) {
    const token = match[0]

    // 处理空格
    if (/^\s+$/.test(token)) {
      segments.push({ text: token, type: 'operator' })
      continue
    }

    // 第一个非空格 token 是命令名
    if (isFirst && !/^\s/.test(token)) {
      segments.push({ text: token, type: 'command' })
      isFirst = false
      continue
    }

    // 目标选择器 (@p, @a, @e, @r, @s 或带参数的 @e[...])
    if (/^@[parse]\[?/.test(token) || /^@(s|p|a|e|r)$/.test(token)) {
      segments.push({ text: token, type: 'selector' })
      continue
    }

    // 相对坐标 (~开头) 或局部坐标 (^开头)
    if (/^[~^]/.test(token)) {
      segments.push({ text: token, type: 'value' })
      continue
    }

    // 引号字符串
    if (/^["']/.test(token)) {
      segments.push({ text: token, type: 'string' })
      continue
    }

    // 纯数字
    if (/^-?[\d.]+$/.test(token)) {
      segments.push({ text: token, type: 'number' })
      continue
    }

    // 布尔值
    if (token === 'true' || token === 'false') {
      segments.push({ text: token, type: 'value' })
      continue
    }

    // 命名空间资源 (minecraft:stone, foo:bar)
    if (/^[a-z0-9_.-]+:[a-z0-9_.-]+$/i.test(token)) {
      segments.push({ text: token, type: 'argument' })
      continue
    }

    // NBT 数据 ({...})
    if (token.startsWith('{') || token.startsWith('[')) {
      segments.push({ text: token, type: 'value' })
      continue
    }

    // 默认为参数
    segments.push({ text: token, type: 'argument' })
  }

  return segments
}

/**
 * 获取语法类型的 CSS 类名
 */
function getSegmentClassName(type: SyntaxSegment['type']): string {
  switch (type) {
    case 'command':
      return 'text-primary font-semibold'
    case 'selector':
      return 'text-mc-emerald'
    case 'string':
      return 'text-mc-gold'
    case 'number':
      return 'text-mc-diamond'
    case 'value':
      return 'text-foreground'
    case 'argument':
      return 'text-muted-foreground'
    case 'operator':
      return 'text-muted-foreground/50'
    case 'error':
      return 'text-destructive underline decoration-wavy'
    default:
      return 'text-foreground'
  }
}

// ============================================================================
// 命令生成器
// ============================================================================

/**
 * 根据命令类型和参数生成命令字符串
 */
function generateCommandString(
  commandType: string,
  params: Record<string, unknown>
): string {
  if (!commandType) {
    return ''
  }

  const parts: string[] = [commandType]

  // 遍历参数并添加到命令中
  for (const [, value] of Object.entries(params)) {
    // 跳过空值
    if (value === undefined || value === null || value === '') {
      continue
    }

    // 跳过 false 布尔值（可选参数）
    if (value === false) {
      continue
    }

    // 处理不同类型的值
    if (typeof value === 'string') {
      // 如果包含空格或特殊字符，添加引号
      if (/[\s{}[\]()]/.test(value) && !value.startsWith('"')) {
        parts.push(`"${value}"`)
      } else {
        parts.push(value)
      }
    } else if (typeof value === 'object') {
      // 对象转 JSON
      parts.push(JSON.stringify(value))
    } else {
      parts.push(String(value))
    }
  }

  return '/' + parts.join(' ')
}

// ============================================================================
// 子组件
// ============================================================================

/** 语法高亮显示组件 */
function SyntaxHighlightedCommand({
  command,
  className,
}: {
  command: string
  className?: string
}) {
  const segments = useMemo(() => parseCommandToSegments(command), [command])

  // 添加斜杠
  const segmentsWithSlash: SyntaxSegment[] = [
    { text: '/', type: 'operator' },
    ...segments,
  ]

  return (
    <pre className={cn('text-sm font-mono whitespace-pre-wrap break-all', className)}>
      {segmentsWithSlash.map((segment, index) => (
        <span key={index} className={getSegmentClassName(segment.type)}>
          {segment.text}
        </span>
      ))}
    </pre>
  )
}

/** 复制按钮组件 */
function CopyButton({
  onCopy,
  disabled,
  copied,
}: {
  onCopy: () => void
  disabled: boolean
  copied: boolean
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            disabled={disabled || copied}
            className="h-8 px-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1 text-mc-emerald" />
                <span className="text-mc-emerald">已复制</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                复制
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? '已复制到剪贴板' : '复制命令到剪贴板'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** 错误提示组件 */
function ErrorList({ errors }: { errors: ValidationError[] }) {
  if (errors.length === 0) return null

  return (
    <div className="mt-3 space-y-1">
      {errors.map((error, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-2 text-xs p-2 rounded',
            error.severity === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
          )}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error.message}</span>
        </div>
      ))}
    </div>
  )
}

/** 空状态组件 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <Command className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">选择命令类型</p>
      <p className="text-xs mt-1">命令预览将在此显示</p>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

/**
 * 实时命令预览组件
 *
 * @example
 * ```tsx
 * <CommandPreview
 *   commandType="give"
 *   params={{ targets: '@p', item: 'minecraft:diamond', count: 64 }}
 * />
 * ```
 */
export function CommandPreview({
  commandType,
  params,
  errors = [],
  onCopySuccess,
  onCopyError,
  className,
  disableCopy = false,
  showEmptyState = true,
}: CommandPreviewProps) {
  // 复制状态
  const [copied, setCopied] = useState(false)

  // 生成命令字符串
  const commandString = useMemo(() => {
    return generateCommandString(commandType, params)
  }, [commandType, params])

  // 自动重置复制状态
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [copied])

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    if (!commandString || disableCopy) return

    try {
      await navigator.clipboard.writeText(commandString)
      setCopied(true)
      onCopySuccess?.()
    } catch (error) {
      console.error('复制失败:', error)
      onCopyError?.(error instanceof Error ? error : new Error('复制失败'))
    }
  }, [commandString, disableCopy, onCopySuccess, onCopyError])

  // 是否显示空状态
  const isEmpty = !commandType || !commandString

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">命令预览</h3>
          {commandType && (
            <Badge variant="outline" className="text-xs font-mono">
              /{commandType}
            </Badge>
          )}
        </div>
        {!isEmpty && (
          <CopyButton
            onCopy={handleCopy}
            disabled={disableCopy || errors.some(e => e.severity === 'error')}
            copied={copied}
          />
        )}
      </div>

      {/* 命令显示区域 */}
      <div className="flex-1 rounded-md bg-muted/50 border border-border/50 p-4 overflow-auto min-h-[120px]">
        {isEmpty && showEmptyState ? (
          <EmptyState />
        ) : isEmpty ? (
          <div className="text-muted-foreground text-sm">-</div>
        ) : (
          <SyntaxHighlightedCommand command={commandString} />
        )}
      </div>

      {/* 命令长度统计 */}
      {!isEmpty && (
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{commandString.length} 字符</span>
          {commandString.length > 32500 && (
            <span className="text-yellow-500">接近命令方块字符限制 (32500)</span>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {errors.length > 0 && <ErrorList errors={errors} />}
    </div>
  )
}

// ============================================================================
// 导出简化版本
// ============================================================================

export default CommandPreview
