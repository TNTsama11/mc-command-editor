import { useCallback, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Clock,
  Command,
  Copy,
  FileCode,
  Star,
  StarOff,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TAG_LABELS, type SearchResult, useSearchStore } from '@/store/searchStore'

export interface SearchResultsProps {
  className?: string
  maxResults?: number
  showHighlight?: boolean
  onSelectCommand?: (name: string, result: SearchResult) => void
  onSelectTemplate?: (template: SearchResult) => void
  onCopyCommand?: (command: string) => void
  emptyMessage?: string
}

export function SearchResults({
  className,
  maxResults = 50,
  showHighlight = true,
  onSelectCommand,
  onSelectTemplate,
  onCopyCommand,
  emptyMessage = '输入关键词开始搜索',
}: SearchResultsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const results = useSearchStore((state) => state.results)
  const query = useSearchStore((state) => state.query)
  const isSearching = useSearchStore((state) => state.isSearching)
  const highlightMatches = useSearchStore((state) => state.highlightMatches)
  const templates = useSearchStore((state) => state.templates)
  const toggleFavorite = useSearchStore((state) => state.toggleFavorite)

  const displayResults = useMemo(() => results.slice(0, maxResults), [maxResults, results])
  const shouldHighlight = showHighlight && highlightMatches

  const renderHighlightedText = useCallback(
    (text: string) => {
      if (!shouldHighlight || !query.trim()) {
        return <span>{text}</span>
      }

      const normalizedText = text.toLowerCase()
      const normalizedQuery = query.toLowerCase()
      const matchIndex = normalizedText.indexOf(normalizedQuery)

      if (matchIndex === -1) {
        return <span>{text}</span>
      }

      return (
        <span>
          {text.slice(0, matchIndex)}
          <mark className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-800">
            {text.slice(matchIndex, matchIndex + query.length)}
          </mark>
          {text.slice(matchIndex + query.length)}
        </span>
      )
    },
    [query, shouldHighlight]
  )

  const handleCopy = useCallback(
    (event: React.MouseEvent, command: string, id: string) => {
      event.stopPropagation()
      navigator.clipboard.writeText(command)
      onCopyCommand?.(command)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    },
    [onCopyCommand]
  )

  if (!query.trim()) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Command className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
        <p className="mt-1 text-xs text-muted-foreground">支持搜索命令名称、描述或标签</p>
      </div>
    )
  }

  if (isSearching) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (displayResults.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">未找到匹配结果</p>
        <p className="mt-1 text-xs text-muted-foreground">尝试调整关键词或过滤条件</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="px-1 text-sm text-muted-foreground">
        找到 {results.length} 个结果{results.length > maxResults ? `（当前显示前 ${maxResults} 个）` : ''}
      </div>

      <div className="space-y-1">
        {displayResults.map((result, index) => {
          const resultId = `${result.type}-${result.name}-${index}`
          const isTemplate = result.type === 'template'
          const template = isTemplate ? templates.find((item) => item.name === result.name) : null

          return (
            <div
              key={resultId}
              role="button"
              tabIndex={0}
              className={cn(
                'group rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1'
              )}
              onClick={() =>
                isTemplate ? onSelectTemplate?.(result) : onSelectCommand?.(result.name, result)
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  if (isTemplate) {
                    onSelectTemplate?.(result)
                  } else {
                    onSelectCommand?.(result.name, result)
                  }
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                    result.type === 'command'
                      ? 'bg-primary/10 text-primary'
                      : result.type === 'template'
                      ? 'bg-mc-emerald/10 text-mc-emerald'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {result.type === 'command' ? (
                    <Command className="h-4 w-4" />
                  ) : result.type === 'template' ? (
                    <FileCode className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {renderHighlightedText(result.name)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {result.type === 'command'
                        ? '命令'
                        : result.type === 'template'
                        ? '模板'
                        : '历史'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {result.matchType === 'name'
                        ? '名称匹配'
                        : result.matchType === 'description'
                        ? '描述匹配'
                        : '标签匹配'}
                    </Badge>
                  </div>

                  <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                    {renderHighlightedText(result.description)}
                  </p>

                  {result.usage && (
                    <code className="block overflow-x-auto rounded bg-muted/50 px-2 py-1 text-xs">
                      {result.usage}
                    </code>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.tags.map((tag) => (
                      <Badge key={`${resultId}-${tag}`} variant="outline" className="text-xs">
                        {TAG_LABELS[tag]}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {isTemplate && template && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleFavorite(template.id)
                      }}
                    >
                      {template.isFavorite ? (
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {result.usage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(event) => handleCopy(event, result.usage!, resultId)}
                    >
                      {copiedId === resultId ? (
                        <Check className="h-4 w-4 text-emerald-500" />
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

export default SearchResults
