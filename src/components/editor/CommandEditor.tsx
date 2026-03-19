import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

import { CommandPreview } from './CommandPreview'
import { NBTEditor as NBTEditorComponent } from './NBTEditor'
import { ParameterInput, type ParameterValue } from './ParameterInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CommandType, getCommandDefinition } from '@/core/parser/commands'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/store'
import type { Command } from '@/types'

function buildCommandString(commandType: string, params: Record<string, unknown>) {
  if (!commandType) return ''

  const definition = getCommandDefinition(commandType)
  const parts = [commandType]

  if (definition) {
    definition.parameters.forEach((parameter) => {
      const value = params[parameter.name] ?? parameter.defaultValue
      if (value === undefined || value === null || value === '' || value === false) {
        return
      }

      if (typeof value === 'object') {
        parts.push(JSON.stringify(value))
        return
      }

      parts.push(String(value))
    })
  }

  return `/${parts.join(' ')}`
}

function createCommandRecord(commandType: string, raw: string): Command {
  return {
    id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: commandType || 'unknown',
    raw,
    parsed: true,
  }
}

function CommandTypeSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const commandTypes = useMemo(() => Object.values(CommandType).sort(), [])

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
                    <span className="text-xs text-muted-foreground">{definition.description}</span>
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

function ParameterPanel({
  commandType,
  params,
  onParamChange,
}: {
  commandType: string
  params: Record<string, unknown>
  onParamChange: (name: string, value: ParameterValue) => void
}) {
  const definition = useMemo(() => getCommandDefinition(commandType), [commandType])

  if (!definition) {
    return <div className="p-4 text-center text-sm text-muted-foreground">请先选择命令类型</div>
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
        {definition.parameters.map((parameter) => (
          <ParameterInput
            key={parameter.name}
            definition={parameter}
            value={(params[parameter.name] as ParameterValue) ?? null}
            onChange={(value) => onParamChange(parameter.name, value)}
          />
        ))}
      </div>
    </div>
  )
}

export function CommandEditor() {
  const addToHistory = useEditorStore((state) => state.addToHistory)

  const [commandType, setCommandType] = useState('')
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [nbtString, setNbtString] = useState('')
  const [nbtCollapsed, setNbtCollapsed] = useState(false)

  const commandString = useMemo(() => buildCommandString(commandType, params), [commandType, params])

  const handleCommandTypeChange = useCallback((type: string) => {
    setCommandType(type)

    const definition = getCommandDefinition(type)
    if (!definition) {
      setParams({})
      return
    }

    const nextParams: Record<string, unknown> = {}
    definition.parameters.forEach((parameter) => {
      if (parameter.defaultValue !== undefined) {
        nextParams[parameter.name] = parameter.defaultValue
      }
    })
    setParams(nextParams)
  }, [])

  const handleParamChange = useCallback((name: string, value: ParameterValue) => {
    setParams((current) => ({
      ...current,
      [name]: value,
    }))
  }, [])

  const handleClear = useCallback(() => {
    setCommandType('')
    setParams({})
    setNbtString('')
  }, [])

  const handleCopySuccess = useCallback(() => {
    if (!commandString) return
    addToHistory(createCommandRecord(commandType, commandString))
  }, [addToHistory, commandString, commandType])

  return (
    <div className="flex h-full gap-4 p-4">
      <Card className="flex w-[320px] flex-shrink-0 flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">命令编辑</CardTitle>
              <CardDescription>选择命令类型并配置参数</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 overflow-auto">
          <CommandTypeSelector value={commandType} onChange={handleCommandTypeChange} />
          <div className="border-t" />
          <ParameterPanel commandType={commandType} params={params} onParamChange={handleParamChange} />
        </CardContent>
      </Card>

      <Card className="flex min-w-[300px] flex-1 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">实时预览</CardTitle>
          <CardDescription>自动生成当前命令字符串</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <CommandPreview commandType={commandType} params={params} onCopySuccess={handleCopySuccess} />
        </CardContent>
      </Card>

      <Card
        className={cn(
          'flex flex-col transition-all duration-300',
          nbtCollapsed ? 'w-[52px]' : 'w-[320px]'
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            {!nbtCollapsed && (
              <div>
                <CardTitle className="text-lg">NBT 编辑器</CardTitle>
                <CardDescription>编辑高级数据标签</CardDescription>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => setNbtCollapsed((value) => !value)}>
              {nbtCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {!nbtCollapsed && (
          <CardContent className="flex-1 overflow-auto">
            <NBTEditorComponent
              value={nbtString}
              onChange={setNbtString}
              showValidation
              showTreeView
              height={350}
            />
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default CommandEditor
