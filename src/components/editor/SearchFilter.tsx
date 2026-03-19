import { useCallback } from 'react'
import { CaseSensitive, FileText, Filter, Tag, Type, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TAG_LABELS, type TagType, useSearchStore } from '@/store/searchStore'

export interface SearchFilterProps {
  className?: string
  showTagFilter?: boolean
  showSearchScope?: boolean
  showCaseOption?: boolean
  compact?: boolean
}

const ALL_TAGS: TagType[] = ['basic', 'block', 'entity', 'condition', 'data', 'game', 'message', 'world']

export function SearchFilter({
  className,
  showTagFilter = true,
  showSearchScope = true,
  showCaseOption = true,
  compact = false,
}: SearchFilterProps) {
  const filters = useSearchStore((state) => state.filters)
  const setFilters = useSearchStore((state) => state.setFilters)
  const resetFilters = useSearchStore((state) => state.resetFilters)

  const activeFilterCount =
    filters.tags.length +
    Number(!filters.searchInName) +
    Number(!filters.searchInDescription) +
    Number(!filters.searchInTags) +
    Number(filters.caseSensitive)

  const toggleTag = useCallback(
    (tag: TagType) => {
      setFilters({
        tags: filters.tags.includes(tag)
          ? filters.tags.filter((item) => item !== tag)
          : [...filters.tags, tag],
      })
    },
    [filters.tags, setFilters]
  )

  const toggleScope = useCallback(
    (scope: 'searchInName' | 'searchInDescription' | 'searchInTags') => {
      setFilters({ [scope]: !filters[scope] })
    },
    [filters, setFilters]
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>过滤条件</span>
          {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetFilters}>
            <X className="mr-1 h-3 w-3" />
            清除
          </Button>
        )}
      </div>

      {showTagFilter && (
        <section className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>按标签筛选</span>
          </div>
          <div className={cn('flex flex-wrap gap-1.5', compact && 'text-xs')}>
            {ALL_TAGS.map((tag) => (
              <ToggleBadge
                key={tag}
                active={filters.tags.includes(tag)}
                compact={compact}
                onClick={() => toggleTag(tag)}
              >
                {TAG_LABELS[tag]}
              </ToggleBadge>
            ))}
          </div>
        </section>
      )}

      {showSearchScope && (
        <section className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>搜索范围</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ToggleBadge
              active={filters.searchInName}
              compact={compact}
              onClick={() => toggleScope('searchInName')}
            >
              <Type className="mr-1 h-3 w-3" />
              名称
            </ToggleBadge>
            <ToggleBadge
              active={filters.searchInDescription}
              compact={compact}
              onClick={() => toggleScope('searchInDescription')}
            >
              <FileText className="mr-1 h-3 w-3" />
              描述
            </ToggleBadge>
            <ToggleBadge
              active={filters.searchInTags}
              compact={compact}
              onClick={() => toggleScope('searchInTags')}
            >
              <Tag className="mr-1 h-3 w-3" />
              标签
            </ToggleBadge>
          </div>
        </section>
      )}

      {showCaseOption && (
        <section className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CaseSensitive className="h-3 w-3" />
            <span>大小写</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ToggleBadge
              active={filters.caseSensitive}
              compact={compact}
              onClick={() => setFilters({ caseSensitive: !filters.caseSensitive })}
            >
              <CaseSensitive className="mr-1 h-3 w-3" />
              区分大小写
            </ToggleBadge>
          </div>
        </section>
      )}
    </div>
  )
}

function ToggleBadge({
  active,
  compact,
  onClick,
  children,
}: {
  active: boolean
  compact?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Badge
      variant={active ? 'default' : 'outline'}
      className={cn(
        'cursor-pointer select-none transition-colors',
        compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        active && 'bg-primary text-primary-foreground'
      )}
      onClick={onClick}
    >
      {children}
    </Badge>
  )
}

export default SearchFilter
