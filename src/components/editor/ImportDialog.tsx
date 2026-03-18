/**
 * 命令导入对话框组件
 *
 * 功能:
 * - 支持导入命令字符串（单行或多行）
 * - 实时验证命令有效性
 * - 显示解析错误和警告
 * - 支持将命令添加到历史记录
 * - 支持从剪贴板粘贴
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Upload,
  Clipboard,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  History,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  useImportStore,
  validateSingleCommand,
  pasteFromClipboard,
  formatParseError,
  type ImportValidationResult,
  type ImportOptions,
} from '@/store/importStore'
import { useHistoryStore } from '@/store/historyStore'

// ============================================================================
// 子组件
// ============================================================================

/** 验证结果指示器 */
function ValidationIndicator({ result }: { result: ImportValidationResult | null }) {
  if (!result) return null

  const { isValid, errors, warnings } = result

  return (
    <div className="flex items-center gap-3 text-sm">
      {isValid ? (
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>命令有效</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{errors.length} 个错误</span>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="flex items-center gap-1.5 text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <span>{warnings.length} 个警告</span>
        </div>
      )}
    </div>
  )
}

/** 错误/警告列表 */
function ValidationMessages({
  errors,
  warnings,
  maxVisible = 5,
}: {
  errors: ImportValidationResult['errors']
  warnings: ImportValidationResult['warnings']
  maxVisible?: number
}) {
  const [showAll, setShowAll] = useState(false)

  if (errors.length === 0 && warnings.length === 0) return null

  const displayErrors = showAll ? errors : errors.slice(0, maxVisible)
  const displayWarnings = showAll ? warnings : warnings.slice(0, maxVisible)
  const hasMore = errors.length + warnings.length > maxVisible && !showAll

  return (
    <div className="space-y-2 max-h-[150px] overflow-y-auto">
      {/* 错误 */}
      {displayErrors.map((error, index) => (
        <div
          key={`error-${index}`}
          className="flex items-start gap-2 text-xs p-2 rounded bg-red-500/10 text-red-600"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{formatParseError(error)}</span>
        </div>
      ))}

      {/* 警告 */}
      {displayWarnings.map((warning, index) => (
        <div
          key={`warning-${index}`}
          className="flex items-start gap-2 text-xs p-2 rounded bg-yellow-500/10 text-yellow-600"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      ))}

      {/* 显示更多按钮 */}
      {hasMore && (
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(true)}
        >
          显示全部 ({errors.length + warnings.length} 条)
        </button>
      )}
    </div>
  )
}

/** 历史命令快速选择 */
function HistorySelector({
  history,
  onSelect,
}: {
  history: string[]
  onSelect: (command: string) => void
}) {
  if (history.length === 0) return null

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">最近导入</Label>
      <div className="flex flex-wrap gap-1">
        {history.slice(0, 5).map((cmd, index) => (
          <Badge
            key={index}
            variant="outline"
            className="cursor-pointer hover:bg-accent text-xs font-mono truncate max-w-[200px]"
            onClick={() => onSelect(cmd)}
          >
            {cmd}
          </Badge>
        ))}
      </div>
    </div>
  )
}

/** 选项面板 */
function OptionsPanel({
  options,
  onChange,
}: {
  options: ImportOptions
  onChange: (options: Partial<ImportOptions>) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">添加到历史记录</Label>
        <Select
          value={options.addToHistory ? 'true' : 'false'}
          onValueChange={(v) => onChange({ addToHistory: v === 'true' })}
        >
          <SelectTrigger className="w-[80px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">是</SelectItem>
            <SelectItem value="false">否</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">忽略警告</Label>
        <Select
          value={options.ignoreWarnings ? 'true' : 'false'}
          onValueChange={(v) => onChange({ ignoreWarnings: v === 'true' })}
        >
          <SelectTrigger className="w-[80px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">是</SelectItem>
            <SelectItem value="false">否</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">跳过空行</Label>
        <Select
          value={options.skipEmptyLines ? 'true' : 'false'}
          onValueChange={(v) => onChange({ skipEmptyLines: v === 'true' })}
        >
          <SelectTrigger className="w-[80px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">是</SelectItem>
            <SelectItem value="false">否</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">移除注释</Label>
        <Select
          value={options.removeComments ? 'true' : 'false'}
          onValueChange={(v) => onChange({ removeComments: v === 'true' })}
        >
          <SelectTrigger className="w-[80px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">是</SelectItem>
            <SelectItem value="false">否</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export interface ImportDialogProps {
  /** 对话框是否打开 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 导入成功回调 */
  onImport?: (commands: string[]) => void
}

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  // Store 状态
  const inputText = useImportStore((state) => state.inputText)
  const validationResult = useImportStore((state) => state.validationResult)
  const options = useImportStore((state) => state.options)
  const importHistory = useImportStore((state) => state.importHistory)
  const setInputText = useImportStore((state) => state.setInputText)
  const clearInput = useImportStore((state) => state.clearInput)
  const updateOptions = useImportStore((state) => state.updateOptions)
  const addToImportHistory = useImportStore((state) => state.addToImportHistory)
  const validateMultipleCommands = useImportStore((state) => state.validateMultipleCommands)

  // History store
  const addToHistory = useHistoryStore((state) => state.addToHistory)

  // 本地状态
  const [showOptions, setShowOptions] = useState(false)
  const [isPasting, setIsPasting] = useState(false)

  // 解析输入的命令
  const parsedCommands = useMemo(() => {
    const lines = inputText.split('\n')
    return lines
      .map((line) => line.trim())
      .filter((line) => {
        if (options.skipEmptyLines && line.length === 0) return false
        if (options.removeComments && (line.startsWith('#') || line.startsWith('//'))) return false
        return true
      })
  }, [inputText, options.skipEmptyLines, options.removeComments])

  // 验证所有命令
  const allValidationResults = useMemo(() => {
    return parsedCommands.map((cmd) => validateSingleCommand(cmd))
  }, [parsedCommands])

  // 计算统计信息
  const stats = useMemo(() => {
    const total = allValidationResults.length
    const valid = allValidationResults.filter((r) => r.isValid).length
    const invalid = total - valid
    const hasWarnings = allValidationResults.some((r) => r.warnings.length > 0)
    return { total, valid, invalid, hasWarnings }
  }, [allValidationResults])

  // 是否可以导入
  const canImport = useMemo(() => {
    if (parsedCommands.length === 0) return false
    if (stats.invalid > 0 && !options.ignoreWarnings) return false
    return true
  }, [parsedCommands.length, stats.invalid, options.ignoreWarnings])

  // 处理输入变化
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(e.target.value)
    },
    [setInputText]
  )

  // 从剪贴板粘贴
  const handlePaste = useCallback(async () => {
    setIsPasting(true)
    try {
      const text = await pasteFromClipboard()
      if (text) {
        setInputText(text)
      }
    } finally {
      setIsPasting(false)
    }
  }, [setInputText])

  // 从历史选择
  const handleSelectFromHistory = useCallback(
    (command: string) => {
      setInputText(command)
    },
    [setInputText]
  )

  // 执行导入
  const handleImport = useCallback(() => {
    if (!canImport) return

    // 过滤有效命令
    const validCommands = parsedCommands.filter((_, index) => {
      const result = allValidationResults[index]
      return result.isValid || (options.ignoreWarnings && result.errors.length === 0)
    })

    // 添加到历史记录
    if (options.addToHistory) {
      validCommands.forEach((cmd) => {
        addToHistory({
          action: 'execute',
          description: `导入命令: ${cmd}`,
          data: { command: cmd },
          type: 'command',
        })
        addToImportHistory(cmd)
      })
    }

    // 回调
    onImport?.(validCommands)

    // 清空并关闭
    clearInput()
    onClose()
  }, [
    canImport,
    parsedCommands,
    allValidationResults,
    options.addToHistory,
    options.ignoreWarnings,
    addToHistory,
    addToImportHistory,
    onImport,
    clearInput,
    onClose,
  ])

  // 关闭时清空
  useEffect(() => {
    if (!open) {
      // 延迟清空，避免关闭动画期间显示空白
      const timer = setTimeout(() => {
        clearInput()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open, clearInput])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            导入命令
          </DialogTitle>
          <DialogDescription>
            粘贴或输入 Minecraft 命令，支持多行导入。每行一个命令，以 / 开头。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* 输入区域 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>命令输入</Label>
              <div className="flex items-center gap-2">
                {inputText.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {parsedCommands.length} 行命令
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePaste}
                  disabled={isPasting}
                  className="h-7"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  {isPasting ? '粘贴中...' : '从剪贴板粘贴'}
                </Button>
                {inputText.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearInput}
                    className="h-7"
                  >
                    <X className="h-3 w-3" />
                    清空
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              placeholder={`输入命令，例如：
/give @p minecraft:diamond 64
/tp @a ~ ~ ~
/effect give @s minecraft:speed 60 1

每行一个命令，以 / 开头`}
              value={inputText}
              onChange={handleInputChange}
              className="min-h-[200px] font-mono text-sm"
              autoFocus
            />
          </div>

          {/* 验证结果 */}
          {validationResult && (
            <div className="space-y-2">
              <ValidationIndicator result={validationResult} />
              <ValidationMessages
                errors={validationResult.errors}
                warnings={validationResult.warnings}
              />
            </div>
          )}

          {/* 多行命令统计 */}
          {parsedCommands.length > 1 && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="secondary">总计: {stats.total}</Badge>
              <Badge variant="outline" className="text-green-600 border-green-600">
                有效: {stats.valid}
              </Badge>
              {stats.invalid > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-600">
                  无效: {stats.invalid}
                </Badge>
              )}
            </div>
          )}

          {/* 历史命令 */}
          {importHistory.length > 0 && (
            <HistorySelector
              history={importHistory}
              onSelect={handleSelectFromHistory}
            />
          )}

          {/* 选项折叠面板 */}
          <div className="border-t pt-3">
            <button
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowOptions(!showOptions)}
            >
              <Settings className="h-4 w-4" />
              导入选项
              {showOptions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showOptions && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <OptionsPanel options={options} onChange={updateOptions} />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            <Upload className="h-4 w-4 mr-2" />
            导入 {parsedCommands.length > 0 ? `(${parsedCommands.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportDialog
