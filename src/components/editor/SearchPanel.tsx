import { useCallback, useMemo, useState } from 'react'
import { History, Lightbulb, Search, Settings, Star, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SearchFilter } from './SearchFilter'
import { SearchInput } from './SearchInput'
import { SearchResults } from './SearchResults'
import {
  TAG_LABELS,
  type SearchResult,
  type SearchTemplate,
  useSearchStore,
} from '@/store/searchStore'

export interface SearchPanelProps {
  className?: string
  showFilters?: boolean
  showTemplates?: boolean
  showHistory?: boolean
  onSelectCommand?: (name: string, result: SearchResult) => void
  onSelectTemplate?: (template: SearchResult) => void
  onCopyCommand?: (command: string) => void
}

export function SearchPanel({
  className,
  showFilters = true,
  showTemplates = true,
  showHistory = true,
  onSelectCommand,
  onSelectTemplate,
  onCopyCommand,
}: SearchPanelProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'templates' | 'history'>('results')
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const query = useSearchStore((state) => state.query)
  const results = useSearchStore((state) => state.results)
  const searchHistory = useSearchStore((state) => state.searchHistory)
  const templates = useSearchStore((state) => state.templates)
  const clearAll = useSearchStore((state) => state.clearAll)
  const clearSearchHistory = useSearchStore((state) => state.clearSearchHistory)
  const incrementUsage = useSearchStore((state) => state.incrementUsage)
  const setQuery = useSearchStore((state) => state.setQuery)
  const getFavoriteTemplates = useSearchStore((state) => state.getFavoriteTemplates)
  const getRecentTemplates = useSearchStore((state) => state.getRecentTemplates)

  const hasSearchContent = query.trim().length > 0

  const favoriteTemplates = useMemo(() => getFavoriteTemplates(), [getFavoriteTemplates, templates])
  const recentTemplates = useMemo(() => getRecentTemplates(5), [getRecentTemplates, templates])

  const handleSelectTemplate = useCallback(
    (result: SearchResult) => {
      const template = templates.find((item) => item.name === result.name)
      if (template) {
        incrementUsage(template.id)
      }
      onSelectTemplate?.(result)
    },
    [incrementUsage, onSelectTemplate, templates]
  )

  const handleQuickTemplateSelect = useCallback(
    (template: SearchTemplate) => {
      incrementUsage(template.id)
      onSelectTemplate?.({
        name: template.name,
        type: 'template',
        description: template.description,
        usage: template.command,
        tags: template.tags,
        matchType: 'name',
        matchText: template.name,
      })
    },
    [incrementUsage, onSelectTemplate]
  )

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="space-y-4 border-b p-4">
        <SearchInput
          placeholder="搜索命令、模板或描述"
          showSearchButton={false}
          showHistory={false}
          onSelectHistory={() => setActiveTab('results')}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {showFilters && (
              <Button variant="outline" size="sm" onClick={() => setShowFilterPanel((value) => !value)}>
                <Settings className="mr-2 h-4 w-4" />
                过滤
              </Button>
            )}
            {hasSearchContent && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <X className="mr-2 h-4 w-4" />
                清空
              </Button>
            )}
          </div>
          {hasSearchContent && <span className="text-xs text-muted-foreground">{results.length} 个结果</span>}
        </div>

        {showFilters && showFilterPanel && (
          <div className="rounded-lg border p-3">
            <SearchFilter compact />
          </div>
        )}
      </div>

      <div className="flex border-b">
        <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} disabled={!hasSearchContent}>
          <Search className="mr-1 h-4 w-4" />
          结果
          {hasSearchContent && <Badge variant="secondary" className="ml-2">{results.length}</Badge>}
        </TabButton>

        {showTemplates && (
          <TabButton active={activeTab === 'templates'} onClick={() => setActiveTab('templates')}>
            <Star className="mr-1 h-4 w-4" />
            模板
            <Badge variant="secondary" className="ml-2">{templates.length}</Badge>
          </TabButton>
        )}

        {showHistory && (
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
            <History className="mr-1 h-4 w-4" />
            历史
            <Badge variant="secondary" className="ml-2">{searchHistory.length}</Badge>
          </TabButton>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'results' && (
          <div className="p-4">
            <SearchResults
              onSelectCommand={onSelectCommand}
              onSelectTemplate={handleSelectTemplate}
              onCopyCommand={onCopyCommand}
              emptyMessage="输入关键词开始搜索"
            />
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-5 p-4">
            {favoriteTemplates.length > 0 && (
              <TemplateSection
                title="收藏模板"
                icon={<Star className="h-4 w-4" />}
                templates={favoriteTemplates}
                onSelect={handleQuickTemplateSelect}
              />
            )}

            {recentTemplates.length > 0 && (
              <TemplateSection
                title="最近使用"
                icon={<History className="h-4 w-4" />}
                templates={recentTemplates}
                onSelect={handleQuickTemplateSelect}
              />
            )}

            <TemplateSection
              title="全部模板"
              icon={<Lightbulb className="h-4 w-4" />}
              templates={templates}
              onSelect={handleQuickTemplateSelect}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                搜索历史
              </div>
              {searchHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSearchHistory}>
                  清空历史
                </Button>
              )}
            </div>

            {searchHistory.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">暂无搜索历史</div>
            ) : (
              <div className="space-y-2">
                {searchHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-accent/50"
                    onClick={() => {
                      setQuery(item.query)
                      setActiveTab('results')
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.query}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.resultCount} 个结果</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center border-b-2 px-4 py-2 text-sm transition-colors',
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function TemplateSection({
  title,
  icon,
  templates,
  onSelect,
}: {
  title: string
  icon: React.ReactNode
  templates: SearchTemplate[]
  onSelect: (template: SearchTemplate) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
            onClick={() => onSelect(template)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{template.name}</span>
                  {template.isFavorite && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{template.description}</p>
                <code className="block overflow-x-auto rounded bg-muted/50 px-2 py-1 text-xs">
                  {template.command}
                </code>
              </div>
              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <Badge key={`${template.id}-${tag}`} variant="outline" className="text-xs">
                    {TAG_LABELS[tag]}
                  </Badge>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SearchPanel
