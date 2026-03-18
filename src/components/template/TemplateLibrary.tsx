/**
 * 命令模板库组件
 *
 * 功能:
 * - 分类展示模板
 * - 搜索过滤
 * - 模板预览
 * - 快速插入
 * - 导入/导出
 */

import { useState, useMemo, useCallback } from 'react'
import { useTemplateStore, CATEGORY_LABELS, type TemplateCategory, type CommandTemplate, type TemplateFilters } from '@/store/templateStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Search,
  Star,
  StarOff,
  Copy,
  Trash2,
  Download,
  Upload,
  Plus,
  Edit,
  Filter,
  Grid,
  List,
  MoreVertical,
  FileJson,
  ChevronDown,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TemplateEditor } from './TemplateEditor'

// ============================================================================
// 子组件
// ============================================================================

/** 分类标签组件 */
function CategoryTabs({
  activeCategory,
  onChange,
}: {
  activeCategory: TemplateCategory | 'all'
  onChange: (category: TemplateCategory | 'all') => void
}) {
  const stats = useTemplateStore((state) => state.stats)

  const categories: Array<TemplateCategory | 'all'> = [
    'all',
    'favorite',
    'common',
    'custom',
    'imported',
    'game',
    'entity',
    'block',
    'condition',
    'data',
  ]

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {categories.map((cat) => {
        const count = cat === 'all'
          ? stats.totalTemplates
          : cat === 'favorite'
            ? stats.favoritesCount
            : stats.byCategory[cat] || 0

        return (
          <Badge
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1"
            onClick={() => onChange(cat)}
          >
            {cat === 'all' ? '全部' : CATEGORY_LABELS[cat]}
            <span className="ml-1.5 text-xs opacity-70">({count})</span>
          </Badge>
        )
      })}
    </div>
  )
}

/** 模板卡片组件 */
function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onInsert,
  onSelect,
  isSelected,
  viewMode,
}: {
  template: CommandTemplate
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onInsert: () => void
  onSelect: () => void
  isSelected: boolean
  viewMode: 'grid' | 'list'
}) {
  const [showMenu, setShowMenu] = useState(false)

  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
          ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
        onClick={onSelect}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{template.name}</span>
            {template.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
          </div>
          <p className="text-sm text-muted-foreground truncate">{template.description}</p>
        </div>
        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
          {template.command}
        </code>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onInsert() }}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}>
            {template.isFavorite ? (
              <StarOff className="h-4 w-4" />
            ) : (
              <Star className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit() }}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md
        ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="truncate">{template.name}</span>
              {template.isFavorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {CATEGORY_LABELS[template.category]}
            </CardDescription>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg z-10 min-w-[120px]">
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit() }}
                >
                  <Edit className="h-4 w-4" /> 编辑
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDuplicate() }}
                >
                  <Copy className="h-4 w-4" /> 复制
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onToggleFavorite() }}
                >
                  {template.isFavorite ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  {template.isFavorite ? '取消收藏' : '收藏'}
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete() }}
                >
                  <Trash2 className="h-4 w-4" /> 删除
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        <code className="block text-xs bg-muted p-2 rounded font-mono break-all">
          {template.command}
        </code>
        <div className="flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            使用 {template.usageCount} 次
          </span>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onInsert() }}>
            插入
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** 导入对话框 */
function ImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onImport: (json: string) => { success: boolean; imported: number; errors: string[] }
}) {
  const [jsonInput, setJsonInput] = useState('')
  const [result, setResult] = useState<{ success: boolean; imported: number; errors: string[] } | null>(null)

  const handleImport = () => {
    const importResult = onImport(jsonInput)
    setResult(importResult)
    if (importResult.success) {
      setTimeout(() => {
        onClose()
        setJsonInput('')
        setResult(null)
      }, 1500)
    }
  }

  const handleClose = () => {
    onClose()
    setJsonInput('')
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入模板</DialogTitle>
          <DialogDescription>
            粘贴 JSON 格式的模板数据，支持单个模板或模板数组
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder='[
  {
    "name": "模板名称",
    "description": "模板描述",
    "command": "/give @p minecraft:diamond 64",
    "category": "custom",
    "tags": ["物品"]
  }
]'
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          {result && (
            <div className={`p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {result.success ? (
                <p>成功导入 {result.imported} 个模板</p>
              ) : (
                <div>
                  <p className="font-medium">导入失败</p>
                  <ul className="text-sm mt-1">
                    {result.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button onClick={handleImport} disabled={!jsonInput.trim()}>
            导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 导出对话框 */
function ExportDialog({
  open,
  onClose,
  templates,
  onExport,
}: {
  open: boolean
  onClose: () => void
  templates: CommandTemplate[]
  onExport: (ids?: string[]) => string
}) {
  const [exportedJson, setExportedJson] = useState('')
  const [copied, setCopied] = useState(false)

  const handleExport = () => {
    const json = onExport(templates.map((t) => t.id))
    setExportedJson(json)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportedJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([exportedJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mc-templates-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导出模板</DialogTitle>
          <DialogDescription>
            将导出 {templates.length} 个选中的模板
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {exportedJson ? (
            <>
              <Textarea
                value={exportedJson}
                readOnly
                className="min-h-[200px] font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? '已复制' : '复制到剪贴板'}
                </Button>
                <Button variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  下载文件
                </Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <FileJson className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">点击下方按钮生成 JSON</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
          <Button onClick={handleExport} disabled={!!exportedJson}>
            生成 JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 删除确认对话框 */
function DeleteConfirmDialog({
  open,
  onClose,
  count,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  count: number
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除 {count} 个模板吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="destructive" onClick={onConfirm}>
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function TemplateLibrary({
  onInsertCommand,
}: {
  /** 插入命令回调 */
  onInsertCommand?: (command: string) => void
}) {
  // Store
  const store = useTemplateStore()
  const {
    templates,
    filters,
    selectedTemplateIds,
    setFilters,
    setSearchQuery,
    selectAll,
    clearSelection,
    toggleSelectTemplate,
    selectTemplate,
    openEditor,
    updateTemplate,
    removeTemplates,
    duplicateTemplate,
    toggleFavorite,
    incrementUsage,
    exportTemplates,
    importTemplates,
    getFilteredTemplates,
  } = store

  // Local state
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Computed
  const filteredTemplates = useMemo(() => {
    let result = getFilteredTemplates()
    if (activeCategory !== 'all') {
      if (activeCategory === 'favorite') {
        result = result.filter((t) => t.isFavorite)
      } else {
        result = result.filter((t) => t.category === activeCategory)
      }
    }
    return result
  }, [getFilteredTemplates, activeCategory])

  const isAllSelected = filteredTemplates.length > 0 && filteredTemplates.length === selectedTemplateIds.length

  // Handlers
  const handleInsert = useCallback((template: CommandTemplate) => {
    incrementUsage(template.id)
    onInsertCommand?.(template.command)
  }, [incrementUsage, onInsertCommand])

  const handleBulkDelete = useCallback(() => {
    if (selectedTemplateIds.length > 0) {
      removeTemplates(selectedTemplateIds)
      clearSelection()
    }
    setShowDeleteDialog(false)
  }, [selectedTemplateIds, removeTemplates, clearSelection])

  const handleSelectAll = useCallback(() => {
    selectAll(!isAllSelected)
  }, [selectAll, isAllSelected])

  // Effects
  const handleCategoryChange = useCallback((category: TemplateCategory | 'all') => {
    setActiveCategory(category)
    clearSelection()
  }, [clearSelection])

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex flex-col gap-3 p-4 border-b">
        {/* 搜索和操作按钮 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板名称、描述、命令..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button onClick={() => openEditor('create')}>
            <Plus className="h-4 w-4 mr-2" />
            新建
          </Button>
        </div>

        {/* 分类标签 */}
        <CategoryTabs
          activeCategory={activeCategory}
          onChange={handleCategoryChange}
        />

        {/* 排序和过滤 */}
        <div className="flex items-center gap-2 text-sm">
          <Select
            value={filters.sortBy}
            onValueChange={(value) => setFilters({ sortBy: value as TemplateFilters['sortBy'] })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">最近更新</SelectItem>
              <SelectItem value="createdAt">创建时间</SelectItem>
              <SelectItem value="name">名称</SelectItem>
              <SelectItem value="usageCount">使用次数</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
          >
            {filters.sortOrder === 'asc' ? '升序' : '降序'}
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${filters.sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </Button>

          <div className="flex-1" />

          {/* 批量操作 */}
          {selectedTemplateIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                已选 {selectedTemplateIds.length} 项
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
              >
                <Download className="h-4 w-4 mr-1" />
                导出
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                删除
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            导入
          </Button>
        </div>
      </div>

      {/* 模板列表 */}
      <div className="flex-1 overflow-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Search className="h-12 w-12 mb-4" />
            <p>没有找到匹配的模板</p>
            <Button
              variant="link"
              onClick={() => {
                setSearchQuery('')
                setActiveCategory('all')
              }}
            >
              清除过滤条件
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                isSelected={selectedTemplateIds.includes(template.id)}
                onSelect={() => toggleSelectTemplate(template.id)}
                onEdit={() => openEditor('edit', template.id)}
                onDuplicate={() => duplicateTemplate(template.id)}
                onDelete={() => {
                  selectTemplate(template.id)
                  setShowDeleteDialog(true)
                }}
                onToggleFavorite={() => toggleFavorite(template.id)}
                onInsert={() => handleInsert(template)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 border-b text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="rounded"
              />
              <span>全选</span>
            </div>
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                isSelected={selectedTemplateIds.includes(template.id)}
                onSelect={() => toggleSelectTemplate(template.id)}
                onEdit={() => openEditor('edit', template.id)}
                onDuplicate={() => duplicateTemplate(template.id)}
                onDelete={() => {
                  selectTemplate(template.id)
                  setShowDeleteDialog(true)
                }}
                onToggleFavorite={() => toggleFavorite(template.id)}
                onInsert={() => handleInsert(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 模板编辑器 */}
      <TemplateEditor
        onSave={(template) => {
          if (store.editor.templateId) {
            updateTemplate(store.editor.templateId, template)
          }
        }}
      />

      {/* 导入对话框 */}
      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={(json) => importTemplates(json)}
      />

      {/* 导出对话框 */}
      <ExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        templates={templates.filter((t) => selectedTemplateIds.includes(t.id))}
        onExport={exportTemplates}
      />

      {/* 删除确认对话框 */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        count={selectedTemplateIds.length || 1}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}

export default TemplateLibrary
