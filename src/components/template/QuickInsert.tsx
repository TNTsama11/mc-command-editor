/**
 * 快速插入模板组件
 *
 * 功能:
 * - 显示常用模板列表
 * - 快速选择插入
 * - 支持搜索
 */

import { useState, useMemo } from 'react'
import { useTemplateStore, type CommandTemplate } from '@/store/templateStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Search,
  Zap,
  Star,
  Clock,
  ChevronRight,
} from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

interface QuickInsertProps {
  onInsert: (command: string) => void
  className?: string
}

// ============================================================================
// 子组件
// ============================================================================

function TemplateItem({
  template,
  onClick,
}: {
  template: CommandTemplate
  onClick: () => void
}) {
  return (
    <button
      className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm truncate flex-1">{template.name}</span>
        {template.isFavorite && (
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}
      </div>
      <code className="text-xs text-muted-foreground block truncate mt-0.5">
        {template.command}
      </code>
    </button>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function QuickInsert({ onInsert, className }: QuickInsertProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'quick' | 'favorites' | 'recent'>('quick')

  const {
    getQuickInsertTemplates,
    getFavoriteTemplates,
    getRecentTemplates,
    incrementUsage,
    templates,
  } = useTemplateStore()

  // 获取模板列表
  const quickTemplates = useMemo(() => getQuickInsertTemplates(), [getQuickInsertTemplates, templates])
  const favoriteTemplates = useMemo(() => getFavoriteTemplates(), [getFavoriteTemplates, templates])
  const recentTemplates = useMemo(() => getRecentTemplates(10), [getRecentTemplates, templates])

  // 根据标签页过滤
  const displayTemplates = useMemo(() => {
    let list: CommandTemplate[] = []
    switch (activeTab) {
      case 'quick':
        list = quickTemplates
        break
      case 'favorites':
        list = favoriteTemplates
        break
      case 'recent':
        list = recentTemplates
        break
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.command.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      )
    }

    return list.slice(0, 10)
  }, [activeTab, quickTemplates, favoriteTemplates, recentTemplates, searchQuery])

  // 处理插入
  const handleInsert = (template: CommandTemplate) => {
    incrementUsage(template.id)
    onInsert(template.command)
    setOpen(false)
    setSearchQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Zap className="h-4 w-4 mr-2" />
          快速插入
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* 搜索框 */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8"
            />
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors
              ${activeTab === 'quick' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('quick')}
          >
            <Zap className="h-3 w-3 inline-block mr-1" />
            常用
          </button>
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors
              ${activeTab === 'favorites' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Star className="h-3 w-3 inline-block mr-1" />
            收藏
          </button>
          <button
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors
              ${activeTab === 'recent' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('recent')}
          >
            <Clock className="h-3 w-3 inline-block mr-1" />
            最近
          </button>
        </div>

        {/* 模板列表 */}
        <div className="max-h-[300px] overflow-y-auto">
          {displayTemplates.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              {searchQuery ? '没有找到匹配的模板' : '暂无模板'}
            </div>
          ) : (
            <div className="py-2">
              {displayTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  onClick={() => handleInsert(template)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            点击模板快速插入命令
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default QuickInsert
