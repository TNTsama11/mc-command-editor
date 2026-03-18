/**
 * 命令编辑器主组件
 *
 * 三栏布局：
 * - 左侧：命令类型选择和参数输入
 * - 中间：实时命令预览
 * - 右侧：NBT 编辑器（可折叠）
 */

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEditorStore } from '@/store'
import { CommandType, getCommandDefinition } from '@/core/parser/commands'
import { cn } from '@/lib/utils'
// 导入独立的命令预览组件
import { CommandPreview } from './CommandPreview'
// 导入独立的 NBT 编辑器组件
import { NBTEditor as NBTEditorComponent } from './NBTEditor'

// ============================================================================
// 子组件定义
// ============================================================================

/** 命令类型选择器 */
function CommandTypeSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const commandTypes = useMemo(() => {
    return Object.values(CommandType).sort()
  }, [])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">命令类型</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="选择命令类型" />
        </SelectTrigger>
        <SelectContent>
          {commandTypes.map((type) => {
            const definition = getCommandDefinition(type)
            return (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-mc-command">/{type}</span>
                  {definition && (
                    <span className="text-muted-foreground text-xs">
                      {definition.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}

/** 参数输入面板 */
function ParameterPanel({
  commandType,
  params,
  onParamChange,
}: {
  commandType: string
  params: Record<string, unknown>
  onParamChange: (key: string, value: unknown) => void
}) {
  const definition = useMemo(() => {
    return getCommandDefinition(commandType)
  }, [commandType])

  if (!definition) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        请先选择命令类型
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">参数设置</h3>
        <Badge variant="outline" className="text-xs">
          {definition.parameters.length} 个参数
        </Badge>
      </div>

      <div className="space-y-3">
        {definition.parameters.map((param) => (
          <ParameterInput
            key={param.name}
            param={param}
            value={params[param.name]}
            onChange={(value) => onParamChange(param.name, value)}
          />
        ))}
      </div>
    </div>
  )
}

/** 单个参数输入组件 */
function ParameterInput({
  param,
  value,
  onChange,
}: {
  param: {
    name: string
    type: string
    required: boolean
    description?: string
    defaultValue?: unknown
    options?: string[]
  }
  value: unknown
  onChange: (value: unknown) => void
}) {
  const inputId = `param-${param.name}`

  const renderInput = () => {
    // 下拉选择（有预定义选项）
    if (param.options && param.options.length > 0) {
      return (
        <Select
          value={String(value ?? param.defaultValue ?? '')}
          onValueChange={onChange}
        >
          <SelectTrigger id={inputId}>
            <SelectValue placeholder={`选择${param.name}`} />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // 布尔类型
    if (param.type === 'boolean') {
      return (
        <Select
          value={String(value ?? 'false')}
          onValueChange={(v) => onChange(v === 'true')}
        >
          <SelectTrigger id={inputId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    // 数字类型
    if (param.type === 'integer' || param.type === 'number') {
      return (
        <Input
          id={inputId}
          type="number"
          value={String(value ?? param.defaultValue ?? '')}
          onChange={(e) => {
            const val = param.type === 'integer'
              ? parseInt(e.target.value, 10)
              : parseFloat(e.target.value)
            onChange(isNaN(val) ? undefined : val)
          }}
          placeholder={String(param.defaultValue ?? '')}
        />
      )
    }

    // 实体/目标选择器
    if (param.type === 'entity' || param.type === 'target') {
      return (
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={String(value ?? param.defaultValue ?? '@s')}
            onChange={(e) => onChange(e.target.value)}
            placeholder="@p, @a, @e, @r, @s 或玩家名"
            className="flex-1"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" type="button">
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>目标选择器生成器</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )
    }

    // 位置类型
    if (param.type === 'position') {
      return (
        <Input
          id={inputId}
          value={String(value ?? '~ ~ ~')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="~ ~ ~ 或 x y z"
        />
      )
    }

    // 资源/物品/方块类型
    if (param.type === 'resource') {
      return (
        <Input
          id={inputId}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder="minecraft:diamond (命名空间:路径)"
        />
      )
    }

    // 默认文本输入
    return (
      <Input
        id={inputId}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.description}
      />
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="text-sm">
          {param.name}
        </label>
        {param.required && (
          <Badge variant="destructive" className="text-[10px] px-1 py-0">
            必填
          </Badge>
        )}
      </div>
      {renderInput()}
      {param.description && (
        <p className="text-xs text-muted-foreground">{param.description}</p>
      )}
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function CommandEditor() {
  // 状态管理
  const { addToHistory } = useEditorStore()
  // 注意: useUIStore 将在后续版本用于面板状态管理

  // 本地状态
  const [commandType, setCommandType] = useState<string>('')
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [nbtString, setNbtString] = useState<string>('')
  const [nbtCollapsed, setNbtCollapsed] = useState<boolean>(false)

  // 处理参数变更
  const handleParamChange = useCallback((key: string, value: unknown) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  // 处理命令类型变更
  const handleCommandTypeChange = useCallback((type: string) => {
    setCommandType(type)
    // 重置参数
    const definition = getCommandDefinition(type)
    if (definition) {
      const defaultParams: Record<string, unknown> = {}
      for (const param of definition.parameters) {
        if (param.defaultValue !== undefined) {
          defaultParams[param.name] = param.defaultValue
        }
      }
      setParams(defaultParams)
    } else {
      setParams({})
    }
  }, [])

  // 复制命令
  const handleCopy = useCallback(() => {
    if (!commandType) return

    const parts: string[] = [commandType]
    const definition = getCommandDefinition(commandType)

    if (definition) {
      for (const param of definition.parameters) {
        const value = params[param.name]
        if (!param.required && (value === undefined || value === '')) {
          continue
        }
        const finalValue = value ?? param.defaultValue
        if (finalValue !== undefined) {
          parts.push(String(finalValue))
        }
      }
    }

    const command = '/' + parts.join(' ')
    navigator.clipboard.writeText(command)

    // 添加到历史
    addToHistory({
      id: `cmd-${Date.now()}`,
      type: commandType,
      raw: command,
      parsed: true,
    })
  }, [commandType, params, addToHistory])

  // 清空表单
  const handleClear = useCallback(() => {
    setCommandType('')
    setParams({})
    setNbtString('')
  }, [])

  return (
    <div className="h-full flex gap-4 p-4">
      {/* 左侧面板：命令类型和参数 */}
      <Card className="w-[320px] flex-shrink-0 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">命令编辑</CardTitle>
              <CardDescription>选择类型并设置参数</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-4">
          {/* 命令类型选择 */}
          <CommandTypeSelector
            value={commandType}
            onChange={handleCommandTypeChange}
          />

          {/* 分隔线 */}
          <div className="border-t" />

          {/* 参数输入 */}
          <ParameterPanel
            commandType={commandType}
            params={params}
            onParamChange={handleParamChange}
          />
        </CardContent>
      </Card>

      {/* 中间面板：命令预览 */}
      <Card className="flex-1 min-w-[300px] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">实时预览</CardTitle>
          <CardDescription>自动生成的命令</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <CommandPreview
            commandType={commandType}
            params={params}
            onCopySuccess={handleCopy}
          />
        </CardContent>
      </Card>

      {/* 右侧面板：NBT 编辑器 */}
      <Card className={cn(
        "flex flex-col transition-all duration-300",
        nbtCollapsed ? "w-[50px]" : "w-[320px]"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            {!nbtCollapsed && (
              <div>
                <CardTitle className="text-lg">NBT 编辑器</CardTitle>
                <CardDescription>高级数据标签编辑</CardDescription>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNbtCollapsed(!nbtCollapsed)}
            >
              {nbtCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {!nbtCollapsed && (
          <CardContent className="flex-1 overflow-auto">
            <NBTEditorComponent
              value={nbtString}
              onChange={setNbtString}
              showValidation={true}
              showTreeView={true}
              height={350}
              onParsed={(data, error) => {
                // 可以在这里处理解析后的 NBT 数据
                // 例如：将 NBT 数据合并到命令参数中
                if (data && !error) {
                  // NBT 数据已成功解析
                }
              }}
            />
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default CommandEditor
