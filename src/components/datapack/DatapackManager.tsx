/**
 * DatapackManager - 数据包预览和管理界面组件
 *
 * 提供以下功能:
 * - 显示数据包结构树
 * - 创建/删除/重命名命名空间
 * - 添加/删除函数文件
 * - 预览函数内容
 * - 多格式导出 (.zip, .mcfunction, .nbt)
 * - 导入现有命令
 * - 按名称和标签类型搜索过滤
 * - 统计信息显示
 *
 * @module DatapackManager
 */

import * as React from 'react'
import {
  Folder,
  FolderOpen,
  FileCode,
  Plus,
  Edit2,
  Download,
  ChevronRight,
  ChevronDown,
  File,
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  X,
  Save,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  type Datapack,
  type Namespace,
  type FunctionFile,
  type FileNode,
  type DatapackStats,
  type ValidationIssue,
  createDatapack,
  createNamespace,
  createFunctionFile,
  createCommandLine,
  addNamespaceToDatapack,
  addFunctionToNamespace,
  updateFunctionCommands,
  functionToMcfunction,
  getDatapackFileTree,
  getDatapackStats,
  validateDatapack,
  isValidNamespaceName,
  isValidResourcePath,
  PACK_FORMATS
} from '@/core/datapack'

// ============================================================================
// 类型定义
// ============================================================================

/** 组件 Props */
export interface DatapackManagerProps {
  /** 初始数据包（可选） */
  initialDatapack?: Datapack
  /** 数据包变更回调 */
  onDatapackChange?: (datapack: Datapack) => void
  /** 导出完成回调 */
  onExportComplete?: (blob: Blob, filename: string) => void
  /** 自定义类名 */
  className?: string
}

/** 对话框状态 */
type DialogType = 'none' | 'createNamespace' | 'createFunction' | 'renameNamespace' | 'renameFunction' | 'deleteConfirm' | 'importCommands' | 'exportOptions'

/** 导出格式 */
type ExportFormat = 'zip' | 'mcfunction' | 'nbt'

// ============================================================================
// 工具函数
// ============================================================================

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 获取 Minecraft 版本对应的 pack_format */
function getMcVersion(format: number): string {
  const versions: Record<number, string> = {
    [PACK_FORMATS.FORMAT_1_20]: '1.20-1.20.1',
    [PACK_FORMATS.FORMAT_1_20_2]: '1.20.2',
    [PACK_FORMATS.FORMAT_1_20_3]: '1.20.3-1.20.4',
    [PACK_FORMATS.FORMAT_1_20_5]: '1.20.5-1.20.6',
    [PACK_FORMATS.FORMAT_1_21]: '1.21',
  }
  return versions[format] || `Pack Format ${format}`
}

/** 下载 Blob */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============================================================================
// 子组件: 文件树节点
// ============================================================================

interface TreeNodeProps {
  node: FileNode
  level: number
  expanded: boolean
  selected: boolean
  onToggle: () => void
  onSelect: () => void
  onDoubleClick?: () => void
  childNodes?: React.ReactNode
}

function TreeNode({
  node,
  level,
  expanded,
  selected,
  onToggle,
  onSelect,
  onDoubleClick,
  childNodes
}: TreeNodeProps) {
  const isDirectory = node.type === 'directory'
  const hasChildren = isDirectory && node.children && node.children.length > 0

  const getIcon = () => {
    if (isDirectory) {
      return expanded ? (
        <FolderOpen className="h-4 w-4 text-amber-500" />
      ) : (
        <Folder className="h-4 w-4 text-amber-500" />
      )
    }

    if (node.name.endsWith('.mcfunction')) {
      return <FileCode className="h-4 w-4 text-green-500" />
    }

    if (node.name.endsWith('.json')) {
      return <FileCode className="h-4 w-4 text-blue-500" />
    }

    if (node.name === 'pack.mcmeta') {
      return <FileCode className="h-4 w-4 text-purple-500" />
    }

    return <File className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-colors',
          'hover:bg-accent/50',
          selected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
      >
        {isDirectory ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {hasChildren ? (
              expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )
            ) : (
              <span className="w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {getIcon()}
        <span className="text-sm truncate ml-1">{node.name}</span>
      </div>
      {isDirectory && expanded && childNodes}
    </div>
  )
}

// ============================================================================
// 子组件: 验证结果面板
// ============================================================================

interface ValidationPanelProps {
  issues: ValidationIssue[]
}

function ValidationPanel({ issues }: ValidationPanelProps) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm">数据包验证通过，无错误</span>
      </div>
    )
  }

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{errors.length} 个错误</span>
          </div>
          <ul className="text-xs space-y-1">
            {errors.slice(0, 5).map((issue, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="font-mono text-muted-foreground">[{issue.code}]</span>
                <span>{issue.message}</span>
                {issue.path && (
                  <span className="text-muted-foreground">({issue.path})</span>
                )}
              </li>
            ))}
            {errors.length > 5 && (
              <li className="text-muted-foreground">...还有 {errors.length - 5} 个错误</li>
            )}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{warnings.length} 个警告</span>
          </div>
          <ul className="text-xs space-y-1">
            {warnings.slice(0, 3).map((issue, index) => (
              <li key={index}>
                <span className="font-mono text-muted-foreground">[{issue.code}]</span>
                <span> {issue.message}</span>
              </li>
            ))}
            {warnings.length > 3 && (
              <li className="text-muted-foreground">...还有 {warnings.length - 3} 个警告</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 子组件: 统计面板
// ============================================================================

interface StatsPanelProps {
  stats: DatapackStats
}

function StatsPanel({ stats }: StatsPanelProps) {
  const items = [
    { label: '命名空间', value: stats.namespaceCount, icon: Folder },
    { label: '函数文件', value: stats.functionCount, icon: FileCode },
    { label: '命令行', value: stats.commandCount, icon: Package },
    { label: '预估大小', value: formatSize(stats.estimatedSize), icon: Package },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
        >
          <item.icon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="text-sm font-medium">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 子组件: 函数预览面板
// ============================================================================

interface FunctionPreviewProps {
  func: FunctionFile | null
  namespaceName: string
  onEdit?: (func: FunctionFile) => void
  onClose?: () => void
}

function FunctionPreview({ func, namespaceName, onEdit, onClose }: FunctionPreviewProps) {
  if (!func) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center h-full">
        <FileCode className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">选择一个函数文件以预览</p>
      </div>
    )
  }

  const content = functionToMcfunction(func)
  const lineCount = func.commands.length

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between py-2 px-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">{namespaceName}:{func.name}</span>
          <Badge variant="outline" className="text-xs">{lineCount} 行</Badge>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(func)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑函数</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="text-sm font-mono whitespace-pre-wrap break-all">
          {content || <span className="text-muted-foreground italic">空函数</span>}
        </pre>
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function DatapackManager({
  initialDatapack,
  onDatapackChange,
  onExportComplete,
  className
}: DatapackManagerProps) {
  // ============================================================================
  // 状态管理
  // ============================================================================

  // 数据包状态
  const [datapack, setDatapack] = React.useState<Datapack>(
    () => initialDatapack ?? createDatapack({ name: 'My Datapack' })
  )

  // 树展开状态
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set(['data']))

  // 选中的文件路径
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null)

  // 当前预览的函数
  const [previewFunction, setPreviewFunction] = React.useState<{
    func: FunctionFile
    namespaceName: string
  } | null>(null)

  // 对话框状态
  const [dialogType, setDialogType] = React.useState<DialogType>('none')
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // 对话框输入值
  const [inputValue, setInputValue] = React.useState('')
  const [inputError, setInputError] = React.useState<string | null>(null)

  // 操作上下文（用于删除/重命名）
  const [contextNamespace, setContextNamespace] = React.useState<string | null>(null)
  const [contextFunction, setContextFunction] = React.useState<string | null>(null)

  // 导出状态
  const [exportState, setExportState] = React.useState<'idle' | 'exporting' | 'success' | 'error'>('idle')
  const [exportError, setExportError] = React.useState<string | null>(null)
  const [, setExportSuccessMessage] = React.useState<string | null>(null)

  // 搜索过滤
  const [searchQuery, setSearchQuery] = React.useState('')

  // 编辑模式
  const [editingFunction, setEditingFunction] = React.useState<{
    func: FunctionFile
    namespaceName: string
  } | null>(null)
  const [editContent, setEditContent] = React.useState('')

  // ============================================================================
  // 计算属性
  // ============================================================================

  // 文件树
  const fileTree = React.useMemo(() => getDatapackFileTree(datapack), [datapack])

  // 统计信息
  const stats = React.useMemo(() => getDatapackStats(datapack), [datapack])

  // 验证结果
  const validation = React.useMemo(() => validateDatapack(datapack), [datapack])

  // ============================================================================
  // 回调函数
  // ============================================================================

  // 更新数据包并通知
  const updateDatapack = React.useCallback((newDatapack: Datapack) => {
    setDatapack(newDatapack)
    onDatapackChange?.(newDatapack)
  }, [onDatapackChange])

  // 切换节点展开状态
  const toggleNode = React.useCallback((path: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // 选择节点
  const selectNode = React.useCallback((node: FileNode) => {
    setSelectedPath(node.path)

    // 如果是函数文件，设置预览
    if (node.name.endsWith('.mcfunction')) {
      const pathParts = node.path.split('/')
      // data/namespace/functions/funcname.mcfunction
      if (pathParts.length >= 4 && pathParts[0] === 'data') {
        const namespaceName = pathParts[1]
        const funcName = pathParts[3].replace('.mcfunction', '')
        const namespace = datapack.namespaces.get(namespaceName)
        if (namespace) {
          const func = namespace.functions.get(funcName)
          if (func) {
            setPreviewFunction({ func, namespaceName })
          }
        }
      }
    }
  }, [datapack])

  // 打开创建命名空间对话框
  const openCreateNamespaceDialog = React.useCallback(() => {
    setInputValue('')
    setInputError(null)
    setContextNamespace(null)
    setContextFunction(null)
    setDialogType('createNamespace')
    setDialogOpen(true)
  }, [])

  // 打开创建函数对话框
  const openCreateFunctionDialog = React.useCallback((namespaceName: string) => {
    setInputValue('')
    setInputError(null)
    setContextNamespace(namespaceName)
    setContextFunction(null)
    setDialogType('createFunction')
    setDialogOpen(true)
  }, [])

  // 创建命名空间
  const handleCreateNamespace = React.useCallback(() => {
    const name = inputValue.trim().toLowerCase()

    if (!name) {
      setInputError('命名空间名称不能为空')
      return
    }

    if (!isValidNamespaceName(name)) {
      setInputError('命名空间只能包含小写字母、数字、下划线、连字符和点')
      return
    }

    if (datapack.namespaces.has(name)) {
      setInputError('命名空间已存在')
      return
    }

    try {
      const newNamespace = createNamespace(name)
      const newDatapack = addNamespaceToDatapack(datapack, newNamespace)
      updateDatapack(newDatapack)
      setDialogOpen(false)
      setExpandedNodes(prev => new Set([...prev, 'data', `data/${name}`]))
    } catch (error) {
      setInputError(error instanceof Error ? error.message : '创建失败')
    }
  }, [inputValue, datapack, updateDatapack])

  // 创建函数
  const handleCreateFunction = React.useCallback(() => {
    const name = inputValue.trim().toLowerCase()

    if (!name) {
      setInputError('函数名称不能为空')
      return
    }

    if (!isValidResourcePath(name)) {
      setInputError('函数名称只能包含小写字母、数字、下划线、连字符、点和斜杠')
      return
    }

    if (!contextNamespace) {
      setInputError('未选择命名空间')
      return
    }

    const namespace = datapack.namespaces.get(contextNamespace)
    if (!namespace) {
      setInputError('命名空间不存在')
      return
    }

    if (namespace.functions.has(name)) {
      setInputError('函数已存在')
      return
    }

    try {
      const newFunc = createFunctionFile(name)
      const updatedNamespace = addFunctionToNamespace(namespace, newFunc)
      const updatedNamespaces = new Map(datapack.namespaces)
      updatedNamespaces.set(contextNamespace, updatedNamespace)

      const newDatapack: Datapack = {
        ...datapack,
        namespaces: updatedNamespaces,
        updatedAt: Date.now()
      }
      updateDatapack(newDatapack)
      setDialogOpen(false)

      // 自动选中新创建的函数
      setPreviewFunction({ func: newFunc, namespaceName: contextNamespace })
    } catch (error) {
      setInputError(error instanceof Error ? error.message : '创建失败')
    }
  }, [inputValue, contextNamespace, datapack, updateDatapack])

  // 删除命名空间
  const handleDeleteNamespace = React.useCallback(() => {
    if (!contextNamespace) return

    const updatedNamespaces = new Map(datapack.namespaces)
    updatedNamespaces.delete(contextNamespace)

    const newDatapack: Datapack = {
      ...datapack,
      namespaces: updatedNamespaces,
      updatedAt: Date.now()
    }
    updateDatapack(newDatapack)

    // 清除预览（如果删除的命名空间包含预览的函数）
    if (previewFunction?.namespaceName === contextNamespace) {
      setPreviewFunction(null)
    }

    setDialogOpen(false)
  }, [contextNamespace, datapack, updateDatapack, previewFunction])

  // 删除函数
  const handleDeleteFunction = React.useCallback(() => {
    if (!contextNamespace || !contextFunction) return

    const namespace = datapack.namespaces.get(contextNamespace)
    if (!namespace) return

    const updatedFunctions = new Map(namespace.functions)
    updatedFunctions.delete(contextFunction)

    const updatedNamespace: Namespace = {
      ...namespace,
      functions: updatedFunctions,
      updatedAt: Date.now()
    }

    const updatedNamespaces = new Map(datapack.namespaces)
    updatedNamespaces.set(contextNamespace, updatedNamespace)

    const newDatapack: Datapack = {
      ...datapack,
      namespaces: updatedNamespaces,
      updatedAt: Date.now()
    }
    updateDatapack(newDatapack)

    // 清除预览（如果删除的是预览的函数）
    if (previewFunction?.func.name === contextFunction) {
      setPreviewFunction(null)
    }

    setDialogOpen(false)
  }, [contextNamespace, contextFunction, datapack, updateDatapack, previewFunction])

  // 开始编辑函数
  const startEditFunction = React.useCallback((func: FunctionFile, namespaceName: string) => {
    setEditingFunction({ func, namespaceName })
    setEditContent(functionToMcfunction(func))
  }, [])

  // 保存函数编辑
  const saveFunctionEdit = React.useCallback(() => {
    if (!editingFunction) return

    const lines = editContent.split('\n')
    const commands = lines.map(line => {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        return createCommandLine(trimmed.slice(1).trim(), true)
      }
      return createCommandLine(trimmed, false)
    }).filter(cmd => cmd.rawText.trim() !== '')

    const namespace = datapack.namespaces.get(editingFunction.namespaceName)
    if (!namespace) return

    const func = namespace.functions.get(editingFunction.func.name)
    if (!func) return

    const updatedFunc = updateFunctionCommands(func, commands)
    const updatedFunctions = new Map(namespace.functions)
    updatedFunctions.set(func.name, updatedFunc)

    const updatedNamespace: Namespace = {
      ...namespace,
      functions: updatedFunctions,
      updatedAt: Date.now()
    }

    const updatedNamespaces = new Map(datapack.namespaces)
    updatedNamespaces.set(editingFunction.namespaceName, updatedNamespace)

    const newDatapack: Datapack = {
      ...datapack,
      namespaces: updatedNamespaces,
      updatedAt: Date.now()
    }
    updateDatapack(newDatapack)

    // 更新预览
    setPreviewFunction({ func: updatedFunc, namespaceName: editingFunction.namespaceName })
    setEditingFunction(null)
  }, [editingFunction, editContent, datapack, updateDatapack])

  // 导出数据包
  const handleExport = React.useCallback(async (format: ExportFormat = 'zip') => {
    setExportState('exporting')
    setExportError(null)
    setExportSuccessMessage(null)

    try {
      if (format === 'zip') {
        // 导出完整 ZIP 数据包
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()

        // 添加 pack.mcmeta
        const packMcmeta = {
          pack: {
            pack_format: datapack.config.packFormat,
            description: datapack.config.description
          }
        }
        zip.file('pack.mcmeta', JSON.stringify(packMcmeta, null, 2))

        // 添加函数文件
        for (const [nsName, namespace] of datapack.namespaces) {
          for (const [funcName, func] of namespace.functions) {
            const content = functionToMcfunction(func)
            zip.file(`data/${nsName}/functions/${funcName}.mcfunction`, content)
          }

          // 添加标签文件
          for (const [tagType, tags] of namespace.tags) {
            for (const [tagName, tag] of tags) {
              const tagContent = {
                values: tag.values,
                ...(tag.replace !== undefined && { replace: tag.replace })
              }
              zip.file(
                `data/${nsName}/tags/${tagType}/${tagName}.json`,
                JSON.stringify(tagContent, null, 2)
              )
            }
          }
        }

        // 生成 ZIP
        const blob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        })

        const filename = `${datapack.config.name.replace(/[^a-z0-9_-]/gi, '_')}.zip`

        // 触发下载
        downloadBlob(blob, filename)
        setExportSuccessMessage(`成功导出 ${filename} (${formatSize(blob.size)})`)
        onExportComplete?.(blob, filename)

      } else if (format === 'mcfunction') {
        // 导出单个 mcfunction 文件
        if (!previewFunction) {
          setExportError('请先选择一个函数文件')
          setExportState('error')
          return
        }

        const content = functionToMcfunction(previewFunction.func)
        const filename = `${previewFunction.func.name}.mcfunction`
        const blob = new Blob([content], { type: 'text/plain' })
        downloadBlob(blob, filename)
        setExportSuccessMessage(`成功导出 ${filename} (${formatSize(blob.size)})`)
        onExportComplete?.(blob, filename)

      } else if (format === 'nbt') {
        // NBT 结构文件导出（需要额外的结构文件生成器）
        setExportError('NBT 结构文件导出功能即将推出')
        setExportState('error')
        return
      }

      setExportState('success')
      // 3秒后重置状态
      setTimeout(() => {
        setExportState('idle')
        setExportSuccessMessage(null)
      }, 3000)
    } catch (error) {
      setExportState('error')
      setExportError(error instanceof Error ? error.message : '导出失败')
    }
  }, [datapack, onExportComplete, previewFunction])

  // 处理对话框确认
  const handleDialogConfirm = React.useCallback(() => {
    switch (dialogType) {
      case 'createNamespace':
        handleCreateNamespace()
        break
      case 'createFunction':
        handleCreateFunction()
        break
      case 'renameNamespace':
        // 重命名命名空间需要特殊处理（创建新 + 删除旧）
        // 这里简化为显示提示
        setInputError('暂不支持重命名，请手动创建新的并删除旧的')
        break
      case 'renameFunction':
        setInputError('暂不支持重命名，请手动创建新的并删除旧的')
        break
      case 'deleteConfirm':
        if (contextFunction) {
          handleDeleteFunction()
        } else {
          handleDeleteNamespace()
        }
        break
    }
  }, [dialogType, handleCreateNamespace, handleCreateFunction, handleDeleteNamespace, handleDeleteFunction, contextFunction])

  // ============================================================================
  // 渲染文件树
  // ============================================================================

  const renderTreeNode = React.useCallback((node: FileNode, level: number = 0): React.ReactNode => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSelf = node.name.toLowerCase().includes(query)
      const matchesChildren = node.type === 'directory' && node.children?.some(
        child => child.name.toLowerCase().includes(query) ||
          (child.children && child.children.some(c => c.name.toLowerCase().includes(query)))
      )
      if (!matchesSelf && !matchesChildren) {
        return null
      }
    }

    const isExpanded = expandedNodes.has(node.path)
    const isSelected = selectedPath === node.path

    // 判断是否是命名空间目录
    const isNamespaceDir = level === 1 && node.type === 'directory' && node.path.startsWith('data/')

    return (
      <TreeNode
        key={node.path}
        node={node}
        level={level}
        expanded={isExpanded}
        selected={isSelected}
        onToggle={() => toggleNode(node.path)}
        onSelect={() => selectNode(node)}
        childNodes={
          isExpanded && node.children ? (
            <div>
              {node.children.map(child => renderTreeNode(child, level + 1))}
              {/* 添加按钮 */}
              {isNamespaceDir && (
                <div
                  className="flex items-center gap-1 py-1 px-2"
                  style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => openCreateFunctionDialog(node.name)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          添加函数
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>添加函数文件</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          ) : undefined
        }
      />
    )
  }, [expandedNodes, selectedPath, searchQuery, toggleNode, selectNode, openCreateFunctionDialog])

  // ============================================================================
  // 渲染
  // ============================================================================

  return (
    <div className={cn('flex h-full gap-4', className)}>
      {/* 左侧面板: 文件树 */}
      <Card className="w-[320px] flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {datapack.config.name}
              </CardTitle>
              <CardDescription>
                {getMcVersion(datapack.config.packFormat)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={openCreateNamespaceDialog}
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>添加命名空间</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExport('zip')}
                      disabled={exportState === 'exporting' || datapack.namespaces.size === 0}
                    >
                      {exportState === 'exporting' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>导出为 .zip</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
          {/* 搜索框 */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* 统计面板 */}
          <div className="px-4 pb-2">
            <StatsPanel stats={stats} />
          </div>

          {/* 文件树 */}
          <div className="flex-1 overflow-auto px-2 py-1">
            {fileTree.map(node => renderTreeNode(node))}
          </div>

          {/* 验证面板 */}
          <div className="px-4 py-2 border-t">
            <ValidationPanel issues={validation.issues} />
          </div>
        </CardContent>
      </Card>

      {/* 右侧面板: 预览/编辑 */}
      <Card className="flex-1 min-w-[400px] flex flex-col">
        {editingFunction ? (
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">编辑函数</CardTitle>
                  <CardDescription>
                    {editingFunction.namespaceName}:{editingFunction.func.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingFunction(null)}
                  >
                    取消
                  </Button>
                  <Button size="sm" onClick={saveFunctionEdit}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    保存
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="输入命令，每行一条..."
                className="h-full font-mono text-sm resize-none"
              />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                函数预览
              </CardTitle>
              <CardDescription>
                选择函数文件查看内容
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <FunctionPreview
                func={previewFunction?.func ?? null}
                namespaceName={previewFunction?.namespaceName ?? ''}
                onEdit={(func) => startEditFunction(func, previewFunction?.namespaceName ?? '')}
              />
            </CardContent>
          </>
        )}
      </Card>

      {/* 通用对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'createNamespace' && '创建命名空间'}
              {dialogType === 'createFunction' && '创建函数'}
              {dialogType === 'renameNamespace' && '重命名命名空间'}
              {dialogType === 'renameFunction' && '重命名函数'}
              {dialogType === 'deleteConfirm' && '确认删除'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'createNamespace' && '输入新命名空间的名称'}
              {dialogType === 'createFunction' && `在 ${contextNamespace} 中创建新函数`}
              {dialogType === 'renameNamespace' && '输入新的命名空间名称'}
              {dialogType === 'renameFunction' && '输入新的函数名称'}
              {dialogType === 'deleteConfirm' && `确定要删除 ${inputValue} 吗？此操作不可撤销。`}
            </DialogDescription>
          </DialogHeader>

          {dialogType !== 'deleteConfirm' && (
            <div className="space-y-2">
              <Label htmlFor="dialog-input">
                {dialogType.includes('Namespace') ? '命名空间名称' : '函数名称'}
              </Label>
              <Input
                id="dialog-input"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setInputError(null)
                }}
                placeholder={
                  dialogType.includes('Namespace')
                    ? '例如: my_pack'
                    : '例如: main 或 sub/tick'
                }
                className={cn(inputError && 'border-destructive')}
              />
              {inputError && (
                <p className="text-xs text-destructive">{inputError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                只能包含小写字母、数字、下划线、连字符、点
                {dialogType.includes('Function') && '和斜杠'}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleDialogConfirm}
              variant={dialogType === 'deleteConfirm' ? 'destructive' : 'default'}
            >
              {dialogType === 'deleteConfirm' ? '删除' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导出错误提示 */}
      {exportState === 'error' && (
        <div className="fixed bottom-4 right-4 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{exportError}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-inherit hover:bg-destructive/80"
            onClick={() => setExportState('idle')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// 缺失的 FolderPlus 图标（从 lucide-react 导入）
function FolderPlus(props: React.ComponentProps<typeof Folder>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 10v6" />
      <path d="M9 13h6" />
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  )
}

export default DatapackManager
