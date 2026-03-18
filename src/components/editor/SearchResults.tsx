/**
 * SearchResults - 搜索结果列表组件
 *
 * 显示搜索结果:
 * - 命令结果
 * - 模板结果
 * - 高亮匹配项
 * - 无结果提示
 */

import { useMemo, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Command,
  FileCode,
  Clock,
  Star,
  StarOff,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react'
import {
  useSearchStore,
  TAG_LABELS,
  type SearchResult,
} from '@/store/searchStore'
import { useState } from 'react'

// ============================================================================
// 组件 Props 定义
// ============================================================================

export interface SearchResultsProps {
  /** 自定义类名 */
  className?: string
  /** 最大显示数量 */
  maxResults?: number
  /** 是否显示高亮 */
  showHighlight?: boolean
  /** 选择命令回调 */
  onSelectCommand?: (name: string, result: SearchResult) => void
  /** 选择模板回调 */
  onSelectTemplate?: (template: SearchResult) => void
  /** 复制命令回调 */
  onCopyCommand?: (command: string) => void
  /** 空状态提示 */
  emptyMessage?: string
}

// ============================================================================
// SearchResults 组件
// ============================================================================

export function SearchResults({
  className,
  maxResults = 50,
  showHighlight = true,
  onSelectCommand,
  onSelectTemplate,
  onCopyCommand,
  emptyMessage = '输入关键词开始搜索',
}: SearchResultsProps) {
  // Store
  const results = useSearchStore((state) => state.results)
  const query = useSearchStore((state) => state.query)
  const isSearching = useSearchStore((state) => state.isSearching)
  const highlightMatches = useSearchStore((state) => state.highlightMatches)
  const templates = useSearchStore((state) => state.templates)
  const toggleFavorite = useSearchStore((state) => state.toggleFavorite)

  // 限制结果数量
  const displayResults = useMemo(
    () => results.slice(0, maxResults),
    [results, maxResults]
  )

  // 是否显示高亮
  const shouldHighlight = showHighlight && highlightMatches

  // 渲染高亮文本
  const renderHighlightedText = useCallback(
    (text: string) => {
      if (!shouldHighlight || !query.trim()) {
        return <span>{text}</span>
      }

      const lowerText = text.toLowerCase()
      const lowerQuery = query.toLowerCase()
      const index = lowerText.indexOf(lowerQuery)

      if (index === -1) {
        return <span>{text}</span>
      }

      const before = text.slice(0, index)
      const match = text.slice(index, index + query.length)
      const after = text.slice(index + query.length)

      return (
        <span>
          {before}
          <mark className="bg-yellow-200 dark:bg-yellow-800 text-inherit px-0.5 rounded">
            {match}
          </mark>
          {after}
        </span>
      )
    },
    [query, shouldHighlight]
  )

  // 处理选择命令
  const handleSelectCommand = useCallback(
    (result: SearchResult) => {
      onSelectCommand?.(result.name, result)
    },
    [onSelectCommand]
  )

  // 处理选择模板
  const handleSelectTemplate = useCallback(
    (result: SearchResult) => {
      onSelectTemplate?.(result)
    },
    [onSelectTemplate]
  )

  // 处理收藏切换
  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, templateName: string) => {
      e.stopPropagation()
      const template = templates.find((t) => t.name === templateName)
      if (template) {
        toggleFavorite(template.id)
      }
    },
    [templates, toggleFavorite]
  )

  // 处理复制
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const handleCopy = useCallback(
    (e: React.MouseEvent, command: string, id: string) => {
      e.stopPropagation()
      navigator.clipboard.writeText(command)
      onCopyCommand?.(command)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    },
    [onCopyCommand]
  )

  // 获取结果图标
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'command':
        return <Command className="h-4 w-4" />
      case 'template':
        return <FileCode className="h-4 w-4" />
      case 'history':
        return <Clock className="h-4 w-4" />
      default:
        return <Command className="h-4 w-4" />
    }
  }

  // 获取匹配类型文本
  const getMatchTypeText = (matchType: SearchResult['matchType']) => {
    switch (matchType) {
      case 'name':
        return '名称匹配'
      case 'description':
        return '描述匹配'
      case 'tag':
        return '标签匹配'
      default:
        return ''
    }
  }

  // 空状态
  if (!query.trim()) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Command className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground mt-1">
          支持搜索命令名称、描述或标签
        </p>
      </div>
    )
  }

  // 搜索中状态
  if (isSearching) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 无结果状态
  if (displayResults.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">未找到匹配的结果</p>
        <p className="text-xs text-muted-foreground mt-1">
          尝试使用不同的关键词或调整过滤条件
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* 结果统计 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">
          找到 {results.length} 个结果
          {results.length > maxResults && ` (显示前 ${maxResults} 个)`}
        </span>
      </div>

      {/* 结果列表 */}
      <div className="space-y-1">
        {displayResults.map((result, index) => {
          const resultId = `${result.type}-${result.name}-${index}`
          const isTemplate = result.type === 'template'
          const template = isTemplate
            ? templates.find((t) => t.name === result.name)
            : null

          return (
            <div
              key={resultId}
              className={cn(
                'group p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors',
                'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1'
              )}
              onClick={() =>
                isTemplate
                  ? handleSelectTemplate(result)
                  : handleSelectCommand(result)
              }
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (isTemplate) {
                    handleSelectTemplate(result)
                  } else {
                    handleSelectCommand(result)
                  }
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* 图标 */}
                <div
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center',
                    result.type === 'command'
                      ? 'bg-primary/10 text-primary'
                      : result.type === 'template'
                      ? 'bg-mc-emerald/10 text-mc-emerald'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {getResultIcon(result.type)}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* 名称 */}
                    <span className="font-medium font-mono text-sm">
                      {shouldHighlight
                        ? renderHighlightedText(result.name)
                        : result.name}
                    </span>

                    {/* 类型标签 */}
                    <Badge variant="outline" className="text-xs h-5">
                      {result.type === 'command'
                        ? '命令'
                        : result.type === 'template'
                        ? '模板'
                        : '历史'}
                    </Badge>

                    {/* 匹配类型 */}
                    <Badge variant="secondary" className="text-xs h-5">
                      {getMatchTypeText(result.matchType)}
                    </Badge>
                  </div>

                  {/* 描述 */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {shouldHighlight
                      ? renderHighlightedText(result.description)
                      : result.description}
                  </p>

                  {/* 命令预览（模板） */}
                  {result.usage && (
                    <code className="block text-xs bg-muted/50 px-2 py-1 rounded font-mono overflow-x-auto">
                      {result.usage}
                    </code>
                  )}

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs h-4 px-1"
                      >
                        {TAG_LABELS[tag]}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* 收藏按钮（模板） */}
                  {isTemplate && template && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleToggleFavorite(e, result.name)}
                    >
                      {template.isFavorite ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  {/* 复制按钮 */}
                  {result.usage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleCopy(e, result.usage!, resultId)}
                    >
                      {copiedId === resultId ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// 导出
// ============================================================================

export default SearchResults
