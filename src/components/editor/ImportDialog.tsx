import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Settings,
  Upload,
  X,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  formatParseError,
  pasteFromClipboard,
  useImportStore,
  validateSingleCommand,
  type ImportOptions,
  type ImportValidationResult,
} from '@/store/importStore'
import { useHistoryStore } from '@/store/historyStore'

function ValidationSummary({ result }: { result: ImportValidationResult | null }) {
  if (!result) return null

  if (result.isValid) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>当前命令校验通过</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{result.errors.length} 个错误</span>
      </div>
      {result.warnings.length > 0 && (
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span>{result.warnings.length} 个警告</span>
        </div>
      )}
    </div>
  )
}

function ValidationList({
  errors,
  warnings,
}: {
  errors: ImportValidationResult['errors']
  warnings: ImportValidationResult['warnings']
}) {
  if (errors.length === 0 && warnings.length === 0) {
    return null
  }

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
      {errors.map((error, index) => (
        <div key={`error-${index}`} className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formatParseError(error)}</span>
        </div>
      ))}
      {warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="flex items-start gap-2 text-sm text-amber-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  )
}

function OptionSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <Select value={value ? 'true' : 'false'} onValueChange={(next) => onChange(next === 'true')}>
        <SelectTrigger className="h-8 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">开启</SelectItem>
          <SelectItem value="false">关闭</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onImport?: (commands: string[]) => void
}

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const inputText = useImportStore((state) => state.inputText)
  const validationResult = useImportStore((state) => state.validationResult)
  const options = useImportStore((state) => state.options)
  const importHistory = useImportStore((state) => state.importHistory)
  const setInputText = useImportStore((state) => state.setInputText)
  const clearInput = useImportStore((state) => state.clearInput)
  const updateOptions = useImportStore((state) => state.updateOptions)
  const addToImportHistory = useImportStore((state) => state.addToImportHistory)
  const addToHistory = useHistoryStore((state) => state.addToHistory)

  const [showOptions, setShowOptions] = useState(false)
  const [isPasting, setIsPasting] = useState(false)

  const parsedCommands = useMemo(() => {
    return inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (options.skipEmptyLines && line.length === 0) return false
        if (options.removeComments && (line.startsWith('#') || line.startsWith('//'))) return false
        return true
      })
  }, [inputText, options.removeComments, options.skipEmptyLines])

  const multipleResults = useMemo(
    () => parsedCommands.map((command) => validateSingleCommand(command)),
    [parsedCommands]
  )

  const stats = useMemo(() => {
    const total = multipleResults.length
    const valid = multipleResults.filter((result) => result.isValid).length
    const warnings = multipleResults.reduce((count, result) => count + result.warnings.length, 0)
    const errors = multipleResults.reduce((count, result) => count + result.errors.length, 0)

    return { total, valid, warnings, errors }
  }, [multipleResults])

  const canImport = parsedCommands.length > 0 && stats.errors === 0

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

  const handleImport = useCallback(() => {
    if (!canImport) {
      return
    }

    if (options.addToHistory) {
      parsedCommands.forEach((command) => {
        addToHistory({
          action: 'execute',
          description: `导入命令: ${command}`,
          data: { command },
          type: 'command',
        })
        addToImportHistory(command)
      })
    }

    onImport?.(parsedCommands)
    clearInput()
    onClose()
  }, [addToHistory, addToImportHistory, canImport, clearInput, onClose, onImport, options.addToHistory, parsedCommands])

  const applyHistoryCommand = useCallback(
    (command: string) => {
      setInputText(command)
    },
    [setInputText]
  )

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => clearInput(), 150)
      return () => window.clearTimeout(timer)
    }
  }, [clearInput, open])

  const singleResult = parsedCommands.length <= 1 ? validationResult : null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            导入命令
          </DialogTitle>
          <DialogDescription>
            支持单行或多行导入。每行一条命令，可保留原生命令写法。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="import-command-text">命令输入</Label>
              <div className="flex items-center gap-2">
                {parsedCommands.length > 0 && (
                  <Badge variant="outline">{parsedCommands.length} 条命令</Badge>
                )}
                <Button variant="outline" size="sm" onClick={handlePaste} disabled={isPasting}>
                  <Clipboard className="mr-2 h-4 w-4" />
                  {isPasting ? '粘贴中...' : '从剪贴板粘贴'}
                </Button>
                {inputText && (
                  <Button variant="ghost" size="sm" onClick={clearInput}>
                    <X className="mr-2 h-4 w-4" />
                    清空
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              id="import-command-text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={`/give @p minecraft:diamond 64
/execute as @a at @s run summon lightning_bolt
# 以 # 或 // 开头的注释可按选项忽略`}
              className="min-h-56 font-mono text-sm"
              autoFocus
            />
          </div>

          {singleResult && (
            <div className="space-y-2">
              <ValidationSummary result={singleResult} />
              <ValidationList errors={singleResult.errors} warnings={singleResult.warnings} />
            </div>
          )}

          {parsedCommands.length > 1 && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap gap-3">
                <span>总数 {stats.total}</span>
                <span className="text-emerald-600">有效 {stats.valid}</span>
                {stats.errors > 0 && <span className="text-destructive">错误 {stats.errors}</span>}
                {stats.warnings > 0 && <span className="text-amber-600">警告 {stats.warnings}</span>}
              </div>
            </div>
          )}

          {importHistory.length > 0 && (
            <div className="space-y-2">
              <Label>最近导入</Label>
              <div className="flex flex-wrap gap-2">
                {importHistory.slice(0, 6).map((command, index) => (
                  <Badge
                    key={`${command}-${index}`}
                    variant="outline"
                    className="max-w-[320px] cursor-pointer truncate font-mono"
                    onClick={() => applyHistoryCommand(command)}
                  >
                    {command}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border p-3">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium"
              onClick={() => setShowOptions((value) => !value)}
            >
              <Settings className="h-4 w-4" />
              导入选项
            </button>
            {showOptions && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <OptionSelect
                  label="写入导入历史"
                  value={options.addToHistory}
                  onChange={(next) => updateOptions({ addToHistory: next })}
                />
                <OptionSelect
                  label="忽略警告"
                  value={options.ignoreWarnings}
                  onChange={(next) => updateOptions({ ignoreWarnings: next })}
                />
                <OptionSelect
                  label="跳过空行"
                  value={options.skipEmptyLines}
                  onChange={(next) => updateOptions({ skipEmptyLines: next })}
                />
                <OptionSelect
                  label="移除注释"
                  value={options.removeComments}
                  onChange={(next) => updateOptions({ removeComments: next })}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            <Upload className="mr-2 h-4 w-4" />
            导入{parsedCommands.length > 0 ? ` (${parsedCommands.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportDialog
