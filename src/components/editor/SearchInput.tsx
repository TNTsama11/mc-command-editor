import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Clock, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSearchHistory, useSearchStore } from '@/store/searchStore'

export interface SearchInputProps {
  placeholder?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showSearchButton?: boolean
  showHistory?: boolean
  autoFocus?: boolean
  onSearch?: (query: string) => void
  onClear?: () => void
  onSelectHistory?: (query: string) => void
}

export function SearchInput({
  placeholder = '搜索命令、模板或描述',
  disabled = false,
  className,
  size = 'md',
  showSearchButton = true,
  showHistory = true,
  autoFocus = false,
  onSearch,
  onClear,
  onSelectHistory,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [isFocused, setIsFocused] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)

  const query = useSearchStore((state) => state.query)
  const setQuery = useSearchStore((state) => state.setQuery)
  const addToSearchHistory = useSearchStore((state) => state.addToSearchHistory)
  const removeFromSearchHistory = useSearchStore((state) => state.removeFromSearchHistory)
  const results = useSearchStore((state) => state.results)
  const searchHistory = useSearchHistory()

  const handleSearch = useCallback(() => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) return

    addToSearchHistory(normalizedQuery, results.length)
    onSearch?.(normalizedQuery)
  }, [addToSearchHistory, onSearch, query, results.length])

  const handleClear = useCallback(() => {
    setQuery('')
    inputRef.current?.focus()
    onClear?.()
  }, [onClear, setQuery])

  const handleSelectHistoryItem = useCallback(
    (historyQuery: string) => {
      setQuery(historyQuery)
      setShowHistoryDropdown(false)
      onSelectHistory?.(historyQuery)
    },
    [onSelectHistory, setQuery]
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setShowHistoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sizeClassName = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  }[size]

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center gap-2">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="h-4 w-4" />
        </div>

        <Input
          ref={inputRef}
          value={query}
          type="text"
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={cn(sizeClassName, 'pl-10 pr-20', isFocused && 'ring-2 ring-primary ring-offset-1')}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            setIsFocused(true)
            if (showHistory && searchHistory.length > 0) {
              setShowHistoryDropdown(true)
            }
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSearch()
            }
            if (event.key === 'Escape') {
              handleClear()
            }
          }}
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleClear}>
              <X className="h-3 w-3" />
            </Button>
          )}
          {showSearchButton && (
            <Button
              type="button"
              size="sm"
              className="h-7 px-2"
              disabled={disabled || !query.trim()}
              onClick={handleSearch}
            >
              <Search className="mr-1 h-3 w-3" />
              搜索
            </Button>
          )}
        </div>
      </div>

      {showHistory && showHistoryDropdown && searchHistory.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover shadow-lg"
        >
          <div className="border-b bg-muted/50 p-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              搜索历史
            </span>
          </div>
          <div className="p-1">
            {searchHistory.map((item) => (
              <div
                key={item.id}
                className="group flex cursor-pointer items-center justify-between rounded p-2 hover:bg-accent"
                onClick={() => handleSelectHistoryItem(item.query)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{item.query}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">({item.resultCount} 个结果)</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(event) => {
                      event.stopPropagation()
                      removeFromSearchHistory(item.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchInput
