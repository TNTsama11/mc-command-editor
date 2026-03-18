/**
 * 模板编辑器组件
 *
 * 功能:
 * - 创建/编辑模板
 * - JSON 格式 NBT 编辑
 * - 实时预览
 * - 表单验证
 */

import { useState, useEffect, useMemo } from 'react'
import {
  useTemplateStore,
  CATEGORY_LABELS,
  type TemplateCategory,
  type CommandTemplate,
} from '@/store/templateStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  Plus,
  Eye,
  Save,
  AlertCircle,
  Check,
  Star,
} from 'lucide-react'

// ============================================================================
// 类型定义
// ============================================================================

interface TemplateEditorProps {
  onSave?: (template: Partial<CommandTemplate>) => void
}

// ============================================================================
// 子组件
// ============================================================================

/** 标签输入组件 */
function TagInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const newTag = inputValue.trim()
      if (!value.includes(newTag)) {
        onChange([...value, newTag])
      }
      setInputValue('')
    }
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        placeholder="输入标签后按 Enter 添加"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}

/** NBT 编辑器组件 */
function NBTEditor({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const validateAndChange = (val: string) => {
    setLocalValue(val)
    if (!val.trim()) {
      setIsValid(true)
      onChange(val)
      return
    }

    try {
      JSON.parse(val)
      setIsValid(true)
      onChange(val)
    } catch {
      setIsValid(false)
    }
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(localValue)
      const formatted = JSON.stringify(parsed, null, 2)
      setLocalValue(formatted)
      onChange(formatted)
      setIsValid(true)
    } catch {
      // 无法格式化
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>NBT 数据 (JSON 格式，可选)</Label>
        <div className="flex items-center gap-2">
          {localValue.trim() && (
            <>
              {isValid ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="h-3 w-3 mr-1" /> 有效 JSON
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  <AlertCircle className="h-3 w-3 mr-1" /> 无效 JSON
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={formatJson}>
                格式化
              </Button>
            </>
          )}
        </div>
      </div>
      <Textarea
        placeholder='{"key": "value"}'
        value={localValue}
        onChange={(e) => validateAndChange(e.target.value)}
        className={`font-mono text-sm min-h-[100px] ${error ? 'border-red-500' : isValid ? '' : 'border-yellow-500'}`}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

/** 命令预览组件 */
function CommandPreview({
  command,
  nbt,
}: {
  command: string
  nbt?: string
}) {
  const fullCommand = useMemo(() => {
    if (!command) return ''
    // 如果命令中包含 NBT 占位符，替换它
    if (nbt && command.includes('{}')) {
      return command.replace('{}', nbt)
    }
    return command
  }, [command, nbt])

  if (!fullCommand) {
    return (
      <Card className="bg-muted/50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            命令预览
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <p className="text-muted-foreground text-sm">输入命令后显示预览</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-muted/50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          命令预览
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        <code className="block text-sm font-mono bg-background p-3 rounded border break-all">
          {fullCommand}
        </code>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function TemplateEditor({ onSave }: TemplateEditorProps) {
  const store = useTemplateStore()
  const { editor, closeEditor, updateEditorForm, saveEditor, setEditorError, clearEditorErrors } = store

  // 从 editor.formData 获取表单数据
  const formData = editor.formData
  const errors = editor.errors

  // 本地状态（用于实时预览）
  const [localCommand, setLocalCommand] = useState(formData.command || '')
  const [localNbt, setLocalNbt] = useState(formData.nbt || '')

  // 同步表单数据到本地状态
  useEffect(() => {
    setLocalCommand(formData.command || '')
    setLocalNbt(formData.nbt || '')
  }, [formData.command, formData.nbt])

  // 处理字段更新
  const handleFieldChange = (field: keyof CommandTemplate, value: unknown) => {
    updateEditorForm({ [field]: value })
    // 清除该字段的错误
    if (errors[field]) {
      setEditorError(field, null)
    }
  }

  // 处理命令输入
  const handleCommandChange = (value: string) => {
    setLocalCommand(value)
    handleFieldChange('command', value)
  }

  // 处理 NBT 输入
  const handleNbtChange = (value: string) => {
    setLocalNbt(value)
    handleFieldChange('nbt', value)
  }

  // 处理保存
  const handleSave = () => {
    const success = saveEditor()
    if (success && onSave) {
      onSave(formData)
    }
  }

  // 获取对话框标题
  const getDialogTitle = () => {
    switch (editor.mode) {
      case 'create':
        return '创建新模板'
      case 'edit':
        return '编辑模板'
      case 'view':
        return '查看模板'
      default:
        return '模板'
    }
  }

  const isReadOnly = editor.mode === 'view'

  return (
    <Dialog open={editor.isOpen} onOpenChange={(open) => !open && closeEditor()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                模板名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="例如：给予钻石"
                value={formData.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                disabled={isReadOnly}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">分类</Label>
              <Select
                value={formData.category || 'custom'}
                onValueChange={(value) => handleFieldChange('category', value as TemplateCategory)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="模板的详细描述..."
              value={formData.description || ''}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              disabled={isReadOnly}
              rows={2}
            />
          </div>

          {/* 命令 */}
          <div className="space-y-2">
            <Label htmlFor="command">
              命令 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="command"
              placeholder="/give @p minecraft:diamond 64"
              value={localCommand}
              onChange={(e) => handleCommandChange(e.target.value)}
              disabled={isReadOnly}
              className={`font-mono text-sm ${errors.command ? 'border-red-500' : ''}`}
              rows={3}
            />
            {errors.command && (
              <p className="text-sm text-red-500">{errors.command}</p>
            )}
          </div>

          {/* NBT 编辑器 */}
          {!isReadOnly && (
            <NBTEditor
              value={localNbt}
              onChange={handleNbtChange}
              error={errors.nbt}
            />
          )}

          {/* 标签 */}
          <div className="space-y-2">
            <Label>标签</Label>
            {isReadOnly ? (
              <div className="flex flex-wrap gap-2">
                {(formData.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {(!formData.tags || formData.tags.length === 0) && (
                  <span className="text-muted-foreground text-sm">无标签</span>
                )}
              </div>
            ) : (
              <TagInput
                value={formData.tags || []}
                onChange={(tags) => handleFieldChange('tags', tags)}
              />
            )}
          </div>

          {/* 收藏 */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={formData.isFavorite ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFieldChange('isFavorite', !formData.isFavorite)}
              disabled={isReadOnly}
            >
              <Star className={`h-4 w-4 mr-2 ${formData.isFavorite ? 'fill-current' : ''}`} />
              {formData.isFavorite ? '已收藏' : '添加到收藏'}
            </Button>
          </div>

          {/* 命令预览 */}
          <CommandPreview command={localCommand} nbt={localNbt} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeEditor}>
            {isReadOnly ? '关闭' : '取消'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateEditor
