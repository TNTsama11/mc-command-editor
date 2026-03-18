/**
 * SearchFilter - 搜索过滤组件
 *
 * 提供命令搜索的过滤功能:
 * - 按标签类型过滤
 * - 搜索范围选项
 * - 清除过滤条件
 */

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Filter, X, Tag, FileText, Type, CaseSensitive } from 'lucide-react'
import {
  useSearchStore,
  TAG_LABELS,
  type TagType,
} from '@/store/searchStore'

// ============================================================================
// 组件 Props 定义
// ============================================================================

export interface SearchFilterProps {
  /** 自定义类名 */
  className?: string
  /** 是否显示标签过滤 */
  showTagFilter?: boolean
  /** 是否显示搜索范围选项 */
  showSearchScope?: boolean
  /** 是否显示大小写选项 */
  showCaseOption?: boolean
  /** 紧凑模式 */
  compact?: boolean
}

// ============================================================================
// SearchFilter 组件
// ============================================================================

export function SearchFilter({
  className,
  showTagFilter = true,
  showSearchScope = true,
  showCaseOption = true,
  compact = false,
}: SearchFilterProps) {
  // Store
  const filters = useSearchStore((state) => state.filters)
  const setFilters = useSearchStore((state) => state.setFilters)
  const resetFilters = useSearchStore((state) => state.resetFilters)
  const hasActiveFilters =
    filters.tags.length > 0 ||
    !filters.searchInDescription ||
    !filters.searchInName ||
    !filters.searchInTags ||
    filters.caseSensitive

  // 切换标签
  const toggleTag = useCallback(
    (tag: TagType) => {
      const newTags = filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag]
      setFilters({ tags: newTags })
    },
    [filters.tags, setFilters]
  )

  // 切换搜索范围
  const toggleSearchScope = useCallback(
    (scope: 'name' | 'description' | 'tags') => {
      const key = scope === 'name' ? 'searchInName' : scope === 'description' ? 'searchInDescription' : 'searchInTags'
      setFilters({ [key]: !filters[key] })
    },
    [filters, setFilters]
  )

  // 切换大小写敏感
  const toggleCaseSensitive = useCallback(() => {
    setFilters({ caseSensitive: !filters.caseSensitive })
  }, [filters.caseSensitive, setFilters])

  // 清除所有过滤条件
  const handleClearFilters = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  // 所有标签类型
  const allTags: TagType[] = ['basic', 'block', 'entity', 'condition', 'data', 'game', 'message', 'world']

  return (
    <div className={cn('space-y-3', className)}>
      {/* 过滤条件头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>过滤条件</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {filters.tags.length + (!filters.searchInName ? 1 : 0) + (!filters.searchInDescription ? 1 : 0) + (!filters.searchInTags ? 1 : 0) + (filters.caseSensitive ? 1 : 0)}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleClearFilters}
          >
            <X className="h-3 w-3 mr-1" />
            清除
          </Button>
        )}
      </div>

      {/* 标签过滤 */}
      {showTagFilter && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>按标签类型</span>
          </div>
          <div className={cn('flex flex-wrap gap-1.5', compact && 'text-xs')}>
            {allTags.map((tag) => {
              const isActive = filters.tags.includes(tag)
              return (
                <Badge
                  key={tag}
                  variant={isActive ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors select-none',
                    compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
                    isActive && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {TAG_LABELS[tag]}
                  {isActive && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* 搜索范围选项 */}
      {showSearchScope && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>搜索范围</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterToggle
              active={filters.searchInName}
              onClick={() => toggleSearchScope('name')}
              compact={compact}
            >
              <Type className="h-3 w-3 mr-1" />
              名称
            </FilterToggle>
            <FilterToggle
              active={filters.searchInDescription}
              onClick={() => toggleSearchScope('description')}
              compact={compact}
            >
              <FileText className="h-3 w-3 mr-1" />
              描述
            </FilterToggle>
            <FilterToggle
              active={filters.searchInTags}
              onClick={() => toggleSearchScope('tags')}
              compact={compact}
            >
              <Tag className="h-3 w-3 mr-1" />
              标签
            </FilterToggle>
          </div>
        </div>
      )}

      {/* 大小写选项 */}
      {showCaseOption && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CaseSensitive className="h-3 w-3" />
            <span>搜索选项</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterToggle
              active={filters.caseSensitive}
              onClick={toggleCaseSensitive}
              compact={compact}
            >
              <CaseSensitive className="h-3 w-3 mr-1" />
              区分大小写
            </FilterToggle>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 辅助组件: FilterToggle
// ============================================================================

interface FilterToggleProps {
  active: boolean
  onClick: () => void
  compact?: boolean
  children: React.ReactNode
}

function FilterToggle({ active, onClick, compact, children }: FilterToggleProps) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      className={cn(
        'cursor-pointer transition-colors select-none',
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        active && 'bg-primary text-primary-foreground'
      )}
      onClick={onClick}
    >
      {children}
    </Badge>
  )
}

// ============================================================================
// 导出
// ============================================================================

export default SearchFilter
