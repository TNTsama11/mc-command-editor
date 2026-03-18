/**
 * SearchInput - 搜索输入组件
 *
 * 提供命令搜索的输入功能:
 * - 实时搜索输入
 * - 搜索按钮
 * - 清除按钮
 * - 搜索历史下拉
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Search,
  X,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { useSearchStore, useSearchHistory } from '@/store/searchStore'

// ============================================================================
// 组件 Props 定义
// ============================================================================

export interface SearchInputProps {
  /** 占位符文本 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 输入框大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示搜索按钮 */
  showSearchButton?: boolean
  /** 是否显示历史记录 */
  showHistory?: boolean
  /** 自动聚焦 */
  autoFocus?: boolean
  /** 搜索回调 */
  onSearch?: (query: string) => void
  /** 清除回调 */
  onClear?: () => void
  /** 选择历史记录回调 */
  onSelectHistory?: (query: string) => void
}

// ============================================================================
// SearchInput 组件
// ============================================================================

export function SearchInput({
  placeholder = '搜索命令、模板或描述...',
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
  // 状态
  const [isFocused, setIsFocused] = useState(false)
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Store
  const query = useSearchStore((state) => state.query)
  const setQuery = useSearchStore((state) => state.setQuery)
  const addToSearchHistory = useSearchStore((state) => state.addToSearchHistory)
  const results = useSearchStore((state) => state.results)
  const searchHistory = useSearchHistory()
  const removeFromSearchHistory = useSearchStore((state) => state.removeFromSearchHistory)

  // 输入变化处理
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    },
    [setQuery]
  )

  // 执行搜索
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      addToSearchHistory(query.trim(), results.length)
      onSearch?.(query.trim())
    }
  }, [query, results.length, addToSearchHistory, onSearch])

  // 清除搜索
  const handleClear = useCallback(() => {
    setQuery('')
    inputRef.current?.focus()
    onClear?.()
  }, [setQuery, onClear])

  // 选择历史记录
  const handleSelectHistoryItem = useCallback(
    (historyQuery: string) => {
      setQuery(historyQuery)
      setShowHistoryDropdown(false)
      onSelectHistory?.(historyQuery)
    },
    [setQuery, onSelectHistory]
  )

  // 删除历史记录项
  const handleDeleteHistoryItem = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      removeFromSearchHistory(id)
    },
    [removeFromSearchHistory]
  )

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch()
      } else if (e.key === 'Escape') {
        handleClear()
      }
    },
    [handleSearch, handleClear]
  )

  // 点击外部关闭历史下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowHistoryDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 大小样式映射
  const sizeStyles = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center gap-2">
        {/* 搜索图标 */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="h-4 w-4" />
        </div>

        {/* 输入框 */}
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true)
            if (showHistory && searchHistory.length > 0) {
              setShowHistoryDropdown(true)
            }
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            sizeStyles[size],
            'pl-10 pr-20',
            isFocused && 'ring-2 ring-primary ring-offset-1'
          )}
        />

        {/* 操作按钮组 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* 清除按钮 */}
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          {/* 搜索按钮 */}
          {showSearchButton && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-7 px-2"
              onClick={handleSearch}
              disabled={disabled || !query.trim()}
            >
              <Search className="h-3 w-3 mr-1" />
              搜索
            </Button>
          )}
        </div>
      </div>

      {/* 搜索历史下拉 */}
      {showHistory && showHistoryDropdown && searchHistory.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          <div className="p-2 border-b bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              搜索历史
            </span>
          </div>
          <div className="p-1">
            {searchHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer group"
                onClick={() => handleSelectHistoryItem(item.query)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate">{item.query}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({item.resultCount} 结果)
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleDeleteHistoryItem(e, item.id)}
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

// ============================================================================
// 导出
// ============================================================================

export default SearchInput
