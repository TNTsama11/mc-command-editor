/**
 * 命令方块链导出面板组件
 *
 * 提供将命令方块链导出为不同格式的功能:
 * - .nbt 结构文件（可在游戏中使用结构方块加载）
 * - .mcfunction 函数文件（可用于数据包）
 *
 * @module ExportPanel
 */

import * as React from 'react'
import {
  Download,
  FileCode,
  Box,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  exportToStructure,
  exportToMcFunction,
  downloadExportedFile,
  type ExportResult
} from '@/core/commandBlock/exporter'
import type { CommandBlockChain } from '@/core/commandBlock/types'

// ============================================================================
// 类型定义
// ============================================================================

/** 导出格式 */
export type ExportFormat = 'nbt' | 'mcfunction' | 'both'

/** 导出状态 */
type ExportState = 'idle' | 'exporting' | 'success' | 'error'

/** 组件 Props */
export interface ExportPanelProps {
  /** 要导出的命令方块链 */
  chain: CommandBlockChain
  /** 导出完成回调 */
  onExportComplete?: (results: ExportResult[]) => void
  /** 导出错误回调 */
  onExportError?: (error: string) => void
  /** 自定义类名 */
  className?: string
  /** 是否显示为对话框模式 */
  dialogMode?: boolean
}

// ============================================================================
// 子组件
// ============================================================================

/** 导出格式选择卡片 */
function FormatCard({
  format,
  selected,
  onSelect,
  disabled
}: {
  format: 'nbt' | 'mcfunction'
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  const formatInfo = {
    nbt: {
      title: '结构文件 (.nbt)',
      description: '可在游戏中使用结构方块加载',
      icon: Box,
      badge: '推荐'
    },
    mcfunction: {
      title: '函数文件 (.mcfunction)',
      description: '可用于数据包中',
      icon: FileCode,
      badge: null
    }
  }

  const info = formatInfo[format]
  const Icon = info.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full p-4 rounded-lg border-2 text-left transition-all',
        'hover:border-primary/50 hover:bg-muted/50',
        selected ? 'border-primary bg-primary/5' : 'border-border',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-md',
          selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{info.title}</span>
            {info.badge && (
              <Badge variant="secondary" className="text-xs">{info.badge}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
        </div>
        {selected && (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        )}
      </div>
    </button>
  )
}

/** 导出结果消息 */
function ExportResultMessage({
  result,
  format
}: {
  result: ExportResult
  format: ExportFormat
}) {
  if (result.success) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>{format === 'nbt' ? '结构文件' : '函数文件'}导出成功: {result.filename}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      <span>{result.error || '导出失败'}</span>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function ExportPanel({
  chain,
  onExportComplete,
  onExportError,
  className,
  dialogMode = false
}: ExportPanelProps) {
  // 状态
  const [format, setFormat] = React.useState<ExportFormat>('nbt')
  const [exportName, setExportName] = React.useState(chain.name || 'command-chain')
  const [exportState, setExportState] = React.useState<ExportState>('idle')
  const [exportResults, setExportResults] = React.useState<ExportResult[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // 方块数量
  const blockCount = chain.blocks?.length || 0

  // 执行导出
  const handleExport = React.useCallback(async () => {
    if (blockCount === 0) {
      onExportError?.('命令方块链为空，无法导出')
      return
    }

    setExportState('exporting')
    setExportResults([])

    try {
      const results: ExportResult[] = []

      if (format === 'nbt' || format === 'both') {
        const nbtResult = await exportToStructure(chain, { name: exportName })
        results.push(nbtResult)
        if (nbtResult.success && nbtResult.data) {
          downloadExportedFile(nbtResult.filename, nbtResult.data)
        }
      }

      if (format === 'mcfunction' || format === 'both') {
        const mcfunctionResult = exportToMcFunction(chain, { name: exportName })
        results.push(mcfunctionResult)
        if (mcfunctionResult.success && mcfunctionResult.data) {
          downloadExportedFile(mcfunctionResult.filename, mcfunctionResult.data)
        }
      }

      setExportResults(results)
      setExportState(results.every(r => r.success) ? 'success' : 'error')

      if (results.every(r => r.success)) {
        onExportComplete?.(results)
      } else {
        const errorMsg = results.find(r => !r.success)?.error || '导出失败'
        onExportError?.(errorMsg)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setExportState('error')
      onExportError?.(message)
    }
  }, [chain, format, exportName, blockCount, onExportComplete, onExportError])

  // 导出按钮渲染
  const renderExportButton = () => (
    <Button
      onClick={handleExport}
      disabled={exportState === 'exporting' || blockCount === 0}
      className="w-full"
    >
      {exportState === 'exporting' ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          导出中...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          导出 {format === 'both' ? '两种格式' : format === 'nbt' ? '.nbt' : '.mcfunction'}
        </>
      )}
    </Button>
  )

  // 对话框模式
  if (dialogMode) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className={className}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出命令方块链</DialogTitle>
            <DialogDescription>
              将命令方块链导出为可用的文件格式
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 链信息 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">命令方块数量:</span>
              <Badge variant="secondary">{blockCount} 个</Badge>
            </div>

            {/* 文件名输入 */}
            <div className="space-y-2">
              <Label htmlFor="export-name">文件名</Label>
              <Input
                id="export-name"
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                placeholder="输入文件名"
              />
            </div>

            {/* 格式选择 */}
            <div className="space-y-2">
              <Label>选择导出格式</Label>
              <div className="space-y-2">
                <FormatCard
                  format="nbt"
                  selected={format === 'nbt'}
                  onSelect={() => setFormat('nbt')}
                  disabled={exportState === 'exporting'}
                />
                <FormatCard
                  format="mcfunction"
                  selected={format === 'mcfunction'}
                  onSelect={() => setFormat('mcfunction')}
                  disabled={exportState === 'exporting'}
                />
                <button
                  type="button"
                  onClick={() => setFormat('both')}
                  disabled={exportState === 'exporting'}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 text-left transition-all',
                    'hover:border-primary/50 hover:bg-muted/50',
                    format === 'both' ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-md',
                      format === 'both' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      <FileCode className="h-5 w-5" />
                    </div>
                    <span className="font-medium">两种格式</span>
                    {format === 'both' && (
                      <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* 导出结果 */}
            {exportResults.length > 0 && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                {exportResults.map((result, index) => (
                  <ExportResultMessage
                    key={index}
                    result={result}
                    format={index === 0 && format === 'both' ? 'nbt' : format === 'both' ? 'mcfunction' : format}
                  />
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            {renderExportButton()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // 面板模式
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5" />
          导出命令方块链
        </CardTitle>
        <CardDescription>
          将命令方块链导出为可用的文件格式
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 链信息 */}
        <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md">
          <span className="text-muted-foreground">链名称:</span>
          <span className="font-medium">{chain.name || '未命名'}</span>
        </div>

        <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md">
          <span className="text-muted-foreground">命令方块数量:</span>
          <Badge variant="secondary">{blockCount} 个</Badge>
        </div>

        {/* 文件名输入 */}
        <div className="space-y-2">
          <Label htmlFor="export-name-panel">文件名</Label>
          <Input
            id="export-name-panel"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            placeholder="输入文件名"
          />
        </div>

        {/* 格式选择 */}
        <div className="space-y-2">
          <Label>选择导出格式</Label>
          <div className="space-y-2">
            <FormatCard
              format="nbt"
              selected={format === 'nbt'}
              onSelect={() => setFormat('nbt')}
              disabled={exportState === 'exporting'}
            />
            <FormatCard
              format="mcfunction"
              selected={format === 'mcfunction'}
              onSelect={() => setFormat('mcfunction')}
              disabled={exportState === 'exporting'}
            />
            <button
              type="button"
              onClick={() => setFormat('both')}
              disabled={exportState === 'exporting'}
              className={cn(
                'w-full p-3 rounded-lg border-2 text-left transition-all',
                'hover:border-primary/50 hover:bg-muted/50',
                format === 'both' ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-md',
                  format === 'both' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <FileCode className="h-5 w-5" />
                </div>
                <span className="font-medium">两种格式</span>
                {format === 'both' && (
                  <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* 导出结果 */}
        {exportResults.length > 0 && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-md">
            {exportResults.map((result, index) => (
              <ExportResultMessage
                key={index}
                result={result}
                format={index === 0 && format === 'both' ? 'nbt' : format === 'both' ? 'mcfunction' : format}
              />
            ))}
          </div>
        )}

        {/* 导出按钮 */}
        {renderExportButton()}
      </CardContent>
    </Card>
  )
}

export default ExportPanel
