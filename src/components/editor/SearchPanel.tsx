/**
 * SearchPanel - 搜索面板组件
 *
 * 整合搜索功能的面板:
 * - 搜索输入
 * - 过滤条件
 * - 搜索结果
 * - 预设模板
 * - 搜索历史
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Search,
  History,
  Star,
  Settings,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  X,
} from 'lucide-react'
import { SearchInput } from './SearchInput'
import { SearchFilter } from './SearchFilter'
import { SearchResults } from './SearchResults'
import {
  useSearchStore,
  TAG_LABELS,
  type SearchTemplate,
  type SearchResult,
} from '@/store/searchStore'

// ============================================================================
// 组件 Props 定义
// ============================================================================

export interface SearchPanelProps {
  /** 自定义类名 */
  className?: string
  /** 是否显示过滤面板 */
  showFilters?: boolean
  /** 是否显示预设模板 */
  showTemplates?: boolean
  /** 是否显示历史记录 */
  showHistory?: boolean
  /** 选择命令回调 */
  onSelectCommand?: (name: string, result: SearchResult) => void
  /** 选择模板回调 */
  onSelectTemplate?: (template: SearchResult) => void
  /** 复制命令回调 */
  onCopyCommand?: (command: string) => void
}

// ============================================================================
// SearchPanel 组件
// ============================================================================

export function SearchPanel({
  className,
  showFilters = true,
  showTemplates = true,
  showHistory = true,
  onSelectCommand,
  onSelectTemplate,
  onCopyCommand,
}: SearchPanelProps) {
  // 状态
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'results' | 'templates' | 'history'>('results')

  // Store
  const query = useSearchStore((state) => state.query)
  const results = useSearchStore((state) => state.results)
  const searchHistory = useSearchStore((state) => state.searchHistory)
  const templates = useSearchStore((state) => state.templates)
  const getFavoriteTemplates = useSearchStore((state) => state.getFavoriteTemplates)
  const getRecentTemplates = useSearchStore((state) => state.getRecentTemplates)
  const clearSearchHistory = useSearchStore((state) => state.clearSearchHistory)
  const incrementUsage = useSearchStore((state) => state.incrementUsage)
  const clearAll = useSearchStore((state) => state.clearAll)

  // 获取收藏和最近模板
  const favoriteTemplates = getFavoriteTemplates()
  const recentTemplates = getRecentTemplates(5)

  // 处理选择模板
  const handleSelectTemplate = useCallback(
    (result: SearchResult) => {
      const template = templates.find((t) => t.name === result.name)
      if (template) {
        incrementUsage(template.id)
      }
      onSelectTemplate?.(result)
    },
    [templates, incrementUsage, onSelectTemplate]
  )

  // 处理快速选择模板
  const handleQuickSelectTemplate = useCallback(
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

  // 处理清除所有
  const handleClearAll = useCallback(() => {
    clearAll()
  }, [clearAll])

  // 检查是否有搜索内容
  const hasSearchContent = query.trim().length > 0

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="flex-shrink-0 p-4 border-b space-y-4">
        {/* 搜索输入 */}
        <SearchInput
          placeholder="搜索命令、模板或描述..."
          showSearchButton={false}
          showHistory={false}
          onSelectHistory={() => setActiveTab('results')}
        />

        {/* 快捷操作 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 过滤展开按钮 */}
            {showFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              >
                <Settings className="h-3 w-3 mr-1" />
                过滤
                {isFilterExpanded ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            )}

            {/* 清除按钮 */}
            {hasSearchContent && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={handleClearAll}
              >
                <X className="h-3 w-3 mr-1" />
                清除
              </Button>
            )}
          </div>

          {/* 结果统计 */}
          {hasSearchContent && (
            <span className="text-xs text-muted-foreground">
              {results.length} 个结果
            </span>
          )}
        </div>

        {/* 过滤面板 */}
        {showFilters && isFilterExpanded && (
          <div className="pt-2 border-t">
            <SearchFilter compact />
          </div>
        )}
      </div>

      {/* 标签页切换 */}
      <div className="flex-shrink-0 border-b">
        <div className="flex">
          <TabButton
            active={activeTab === 'results'}
            onClick={() => setActiveTab('results')}
            disabled={!hasSearchContent}
          >
            <Search className="h-3 w-3 mr-1" />
            结果
            {hasSearchContent && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {results.length}
              </Badge>
            )}
          </TabButton>

          {showTemplates && (
            <TabButton
              active={activeTab === 'templates'}
              onClick={() => setActiveTab('templates')}
            >
              <Star className="h-3 w-3 mr-1" />
              模板
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {templates.length}
              </Badge>
            </TabButton>
          )}

          {showHistory && (
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            >
              <History className="h-3 w-3 mr-1" />
              历史
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {searchHistory.length}
              </Badge>
            </TabButton>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* 搜索结果 */}
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

        {/* 预设模板 */}
        {activeTab === 'templates' && (
          <div className="p-4 space-y-4">
            {/* 收藏模板 */}
            {favoriteTemplates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Star className="h-4 w-4" />
                  收藏模板
                </div>
                <div className="space-y-1">
                  {favoriteTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      onSelect={handleQuickSelectTemplate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 最近使用 */}
            {recentTemplates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <History className="h-4 w-4" />
                  最近使用
                </div>
                <div className="space-y-1">
                  {recentTemplates.map((template) => (
                    <TemplateItem
                      key={template.id}
                      template={template}
                      onSelect={handleQuickSelectTemplate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 所有模板 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  所有模板
                </div>
              </div>
              <div className="space-y-1">
                {templates.map((template) => (
                  <TemplateItem
                    key={template.id}
                    template={template}
                    onSelect={handleQuickSelectTemplate}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 搜索历史 */}
        {activeTab === 'history' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                搜索历史
              </div>
              {searchHistory.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={clearSearchHistory}
                >
                  清除历史
                </Button>
              )}
            </div>

            {searchHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无搜索历史
              </div>
            ) : (
              <div className="space-y-1">
                {searchHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => {
                      useSearchStore.getState().setQuery(item.query)
                      setActiveTab('results')
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.query}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.resultCount} 结果
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 辅助组件: TabButton
// ============================================================================

interface TabButtonProps {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

function TabButton({ active, onClick, disabled, children }: TabButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center px-4 py-2 text-sm border-b-2 transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// ============================================================================
// 辅助组件: TemplateItem
// ============================================================================

interface TemplateItemProps {
  template: SearchTemplate
  onSelect: (template: SearchTemplate) => void
}

function TemplateItem({ template, onSelect }: TemplateItemProps) {
  return (
    <div
      className={cn(
        'group p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors'
      )}
      onClick={() => onSelect(template)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{template.name}</span>
            {template.isFavorite && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
            {template.description}
          </p>
          <code className="block text-xs bg-muted/50 px-2 py-0.5 rounded font-mono overflow-x-auto">
            {template.command}
          </code>
        </div>
        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs h-4 px-1">
              {TAG_LABELS[tag]}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 导出
// ============================================================================

export default SearchPanel
