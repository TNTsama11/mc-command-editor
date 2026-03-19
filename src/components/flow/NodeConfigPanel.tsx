/**
 * 节点配置面板
 * 选中节点后显示分区式参数编辑界面
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ResourceKind } from '@/core/resources/types'
import { cn } from '@/lib/utils'
import {
  type MCEdge,
  type MCNode,
  type PinDataType,
  useFlowStore,
} from '@/store/flowStore'
import { ResourcePicker } from './ResourcePicker'

interface NodeConfigPanelProps {
  className?: string
}

type ConfigFieldType = 'text' | 'number' | 'select' | 'resource' | 'position' | 'selector'

export interface ConfigFieldDefinition {
  key: string
  label: string
  type: ConfigFieldType
  resourceKind?: ResourceKind
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: Array<{ value: string; label: string }>
}

export interface ConfigSections {
  common: ConfigFieldDefinition[]
  advanced: ConfigFieldDefinition[]
}

export interface InputSourceSummary {
  key: string
  label: string
  sourceType: 'connection' | 'manual'
  summary: string
}

const SELECTOR_OPTIONS = [
  { value: '@p', label: '最近玩家' },
  { value: '@a', label: '所有玩家' },
  { value: '@e', label: '所有实体' },
  { value: '@s', label: '自己' },
  { value: '@r', label: '随机玩家' },
]

const CONFIG_SECTION_MAP: Record<string, ConfigSections> = {
  give: {
    common: [
      { key: 'target', label: '目标', type: 'selector' },
      {
        key: 'item',
        label: '物品',
        type: 'resource',
        resourceKind: 'item',
        placeholder: 'minecraft:diamond',
      },
      { key: 'count', label: '数量', type: 'number', min: 1, max: 64, step: 1 },
    ],
    advanced: [{ key: 'nbt', label: 'NBT', type: 'text', placeholder: '{Enchantments:[...]}' }],
  },
  tp: {
    common: [
      { key: 'target', label: '目标', type: 'selector' },
      { key: 'destination', label: '目的地', type: 'position', placeholder: '~ ~ ~' },
    ],
    advanced: [],
  },
  summon: {
    common: [
      {
        key: 'entity',
        label: '实体类型',
        type: 'resource',
        resourceKind: 'entity_type',
        placeholder: 'minecraft:zombie',
      },
      { key: 'pos', label: '位置', type: 'position', placeholder: '~ ~ ~' },
    ],
    advanced: [{ key: 'nbt', label: 'NBT', type: 'text', placeholder: '{CustomName:"\\"Boss\\""}' }],
  },
  kill: {
    common: [{ key: 'target', label: '目标', type: 'selector' }],
    advanced: [],
  },
  setblock: {
    common: [
      { key: 'pos', label: '位置', type: 'position', placeholder: '~ ~ ~' },
      {
        key: 'block',
        label: '方块',
        type: 'resource',
        resourceKind: 'block',
        placeholder: 'minecraft:stone',
      },
    ],
    advanced: [{ key: 'nbt', label: 'NBT', type: 'text', placeholder: '{Items:[...]}' }],
  },
  fill: {
    common: [
      { key: 'from', label: '起点', type: 'position', placeholder: '~ ~ ~' },
      { key: 'to', label: '终点', type: 'position', placeholder: '~ ~ ~' },
      {
        key: 'block',
        label: '方块',
        type: 'resource',
        resourceKind: 'block',
        placeholder: 'minecraft:stone',
      },
    ],
    advanced: [],
  },
  effect: {
    common: [
      { key: 'target', label: '目标', type: 'selector' },
      {
        key: 'effect',
        label: '效果',
        type: 'resource',
        resourceKind: 'effect',
        placeholder: 'minecraft:speed',
      },
      { key: 'duration', label: '持续时间(秒)', type: 'number', min: 0, step: 1 },
      { key: 'amplifier', label: '等级', type: 'number', min: 0, max: 255, step: 1 },
    ],
    advanced: [],
  },
  particle: {
    common: [
      { key: 'particle', label: '粒子', type: 'resource', placeholder: 'minecraft:flame' },
      { key: 'pos', label: '位置', type: 'position', placeholder: '~ ~ ~' },
      { key: 'count', label: '数量', type: 'number', min: 0, step: 1 },
    ],
    advanced: [],
  },
  playsound: {
    common: [
      { key: 'sound', label: '音效', type: 'resource', placeholder: 'minecraft:block.note_block.pling' },
      { key: 'target', label: '目标', type: 'selector' },
      { key: 'volume', label: '音量', type: 'number', min: 0, step: 0.1 },
    ],
    advanced: [],
  },
  time: {
    common: [
      {
        key: 'action',
        label: '操作',
        type: 'select',
        options: [
          { value: 'set', label: '设置' },
          { value: 'add', label: '增加' },
        ],
      },
      { key: 'value', label: '时间值', type: 'number', min: 0, step: 1 },
    ],
    advanced: [],
  },
  weather: {
    common: [
      {
        key: 'type',
        label: '天气',
        type: 'select',
        options: [
          { value: 'clear', label: '晴朗' },
          { value: 'rain', label: '下雨' },
          { value: 'thunder', label: '雷暴' },
        ],
      },
    ],
    advanced: [],
  },
  'score-set': {
    common: [
      { key: 'objective', label: '目标名称', type: 'text', placeholder: 'my_score' },
      { key: 'target', label: '目标', type: 'selector' },
      { key: 'value', label: '分数值', type: 'number', step: 1 },
    ],
    advanced: [],
  },
  'storage-set': {
    common: [
      { key: 'namespace', label: '命名空间', type: 'text', placeholder: 'mypack:data' },
      { key: 'path', label: '数据路径', type: 'text', placeholder: 'player.count' },
    ],
    advanced: [],
  },
  title: {
    common: [
      { key: 'target', label: '目标', type: 'selector' },
      {
        key: 'type',
        label: '标题类型',
        type: 'select',
        options: [
          { value: 'title', label: '主标题' },
          { value: 'subtitle', label: '副标题' },
          { value: 'actionbar', label: '快捷栏' },
        ],
      },
      { key: 'text', label: '文本', type: 'text', placeholder: '显示的文本' },
    ],
    advanced: [],
  },
}

export function getNodeConfigSections(commandType: string): ConfigSections {
  return CONFIG_SECTION_MAP[commandType] ?? { common: [], advanced: [] }
}

export function getInputSourceSummaries(
  selectedNode: MCNode,
  nodes: MCNode[],
  edges: MCEdge[]
): InputSourceSummary[] {
  return selectedNode.data.inputs.map((input) => {
    const incomingEdge = edges.find(
      (edge) => edge.target === selectedNode.id && edge.targetHandle === input.id
    )

    if (!incomingEdge) {
      return {
        key: input.id,
        label: input.name,
        sourceType: 'manual',
        summary: '当前使用面板填写的值',
      }
    }

    const sourceNode = nodes.find((node) => node.id === incomingEdge.source)
    const sourcePin = sourceNode?.data.outputs.find((pin) => pin.id === incomingEdge.sourceHandle)

    return {
      key: input.id,
      label: input.name,
      sourceType: 'connection',
      summary: `来自 ${sourceNode?.data.label ?? incomingEdge.source} · ${sourcePin?.name ?? incomingEdge.sourceHandle ?? '输出'}`,
    }
  })
}

const DEFAULT_VALUES_BY_TYPE: Record<ConfigFieldType, string | number> = {
  text: '',
  number: 0,
  select: '',
  resource: '',
  position: '~ ~ ~',
  selector: '@s',
}

const INPUT_TYPE_BY_PIN: Partial<Record<PinDataType, ConfigFieldType>> = {
  position: 'position',
  entity: 'selector',
  number: 'number',
  string: 'text',
  nbt: 'text',
  resource: 'resource',
}

function buildFallbackFields(node: MCNode): ConfigSections {
  const common = node.data.inputs
    .filter((input) => input.type !== 'execute')
    .map<ConfigFieldDefinition>((input) => ({
      key: input.id,
      label: input.name,
      type: INPUT_TYPE_BY_PIN[input.type] ?? 'text',
    }))

  return { common, advanced: [] }
}

function getFieldValue(field: ConfigFieldDefinition, config: Record<string, unknown>) {
  const value = config[field.key]
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (field.type === 'number') {
    return DEFAULT_VALUES_BY_TYPE.number
  }

  return field.placeholder ?? DEFAULT_VALUES_BY_TYPE[field.type]
}

function isCustomSelector(value: string) {
  return !SELECTOR_OPTIONS.some((option) => option.value === value)
}

function renderSourceBadge(sourceType: InputSourceSummary['sourceType']) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-medium',
        sourceType === 'connection'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {sourceType === 'connection' ? '连线输入' : '手动输入'}
    </span>
  )
}

function SectionCard({
  title,
  children,
  testId,
}: {
  title: string
  children: ReactNode
  testId?: string
}) {
  return (
    <section
      className="space-y-3 rounded-lg border border-border bg-background/60 p-3"
      data-testid={testId}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </section>
  )
}

function ConfigField({
  field,
  value,
  connected,
  onChange,
}: {
  field: ConfigFieldDefinition
  value: string | number
  connected: boolean
  onChange: (value: string | number) => void
}) {
  const commonInputClassName = cn(
    'h-8 text-xs',
    (field.type === 'resource' || field.type === 'position') && 'font-mono',
    connected && 'cursor-not-allowed opacity-60'
  )

  return (
    <div className="space-y-1.5" data-testid={`config-field-${field.key}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium">{field.label}</label>
        {connected && <span className="text-[10px] text-primary">已由连线提供</span>}
      </div>

      {field.type === 'text' && (
        <Input
          type="text"
          value={value}
          placeholder={field.placeholder}
          disabled={connected}
          onChange={(event) => onChange(event.target.value)}
          className={commonInputClassName}
        />
      )}

      {field.type === 'number' && (
        <Input
          type="number"
          value={value}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          disabled={connected}
          onChange={(event) => onChange(Number(event.target.value))}
          className={commonInputClassName}
        />
      )}

      {field.type === 'select' && field.options && (
        <select
          value={String(value)}
          disabled={connected}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs',
            connected && 'cursor-not-allowed opacity-60'
          )}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === 'resource' && (
        <ResourcePicker
          fieldKey={field.key}
          kind={field.resourceKind}
          value={String(value)}
          placeholder={field.placeholder}
          disabled={connected}
          onChange={(nextValue) => onChange(nextValue)}
        />
      )}

      {field.type === 'position' && (
        <Input
          type="text"
          value={value}
          placeholder={field.placeholder ?? '~ ~ ~'}
          disabled={connected}
          onChange={(event) => onChange(event.target.value)}
          className={commonInputClassName}
        />
      )}

      {field.type === 'selector' && (
        <div className="space-y-2">
          <select
            value={typeof value === 'string' && !isCustomSelector(value) ? value : 'custom'}
            disabled={connected}
            onChange={(event) => {
              if (event.target.value !== 'custom') {
                onChange(event.target.value)
              }
            }}
            className={cn(
              'flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs',
              connected && 'cursor-not-allowed opacity-60'
            )}
          >
            {SELECTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">自定义</option>
          </select>

          {typeof value === 'string' && isCustomSelector(value) && (
            <Input
              type="text"
              value={value}
              disabled={connected}
              placeholder="player_name 或复杂选择器"
              onChange={(event) => onChange(event.target.value)}
              className={commonInputClassName}
            />
          )}
        </div>
      )}
    </div>
  )
}

export function NodeConfigPanel({ className }: NodeConfigPanelProps) {
  const {
    nodes,
    edges,
    selectedNodeId,
    updateNodeData,
    setSelectedNode,
  } = useFlowStore()
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const selectedNode = nodes.find((node) => node.id === selectedNodeId)

  useEffect(() => {
    setLocalConfig(selectedNode?.data.config ?? {})
    setAdvancedOpen(false)
  }, [selectedNode?.data.config, selectedNodeId])

  const sections = useMemo(() => {
    if (!selectedNode) {
      return { common: [], advanced: [] }
    }

    const configuredSections = getNodeConfigSections(selectedNode.data.commandType)
    if (configuredSections.common.length > 0 || configuredSections.advanced.length > 0) {
      return configuredSections
    }

    return buildFallbackFields(selectedNode)
  }, [selectedNode])

  const inputSources = useMemo(() => {
    if (!selectedNode) {
      return []
    }

    return getInputSourceSummaries(selectedNode, nodes, edges)
  }, [edges, nodes, selectedNode])

  if (!selectedNode || !selectedNodeId) {
    return null
  }

  const connectedInputs = new Set(
    edges
      .filter((edge) => edge.target === selectedNode.id && edge.targetHandle)
      .map((edge) => edge.targetHandle as string)
  )

  const handleConfigChange = (key: string, value: string | number) => {
    const nextConfig = { ...localConfig, [key]: value }
    setLocalConfig(nextConfig)
    updateNodeData(selectedNodeId, { config: nextConfig })
  }

  const handleReset = () => {
    const nextConfig = {}
    setLocalConfig(nextConfig)
    updateNodeData(selectedNodeId, { config: nextConfig })
  }

  return (
    <div
      className={cn('flex w-80 flex-col border-l border-border bg-card', className)}
      data-testid="node-config-panel"
    >
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">{selectedNode.data.label}</div>
          <div className="text-xs text-muted-foreground">
            {selectedNode.data.description || '调整当前节点的常用参数与输入来源。'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelectedNode(null)}
          className="rounded p-1 transition-colors hover:bg-muted"
          aria-label="关闭节点配置"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <SectionCard title="常用参数" testId="config-common-section">
          {sections.common.length > 0 ? (
            <div className="space-y-3">
              {sections.common.map((field) => (
                <ConfigField
                  key={field.key}
                  field={field}
                  value={getFieldValue(field, localConfig)}
                  connected={connectedInputs.has(field.key)}
                  onChange={(value) => handleConfigChange(field.key, value)}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">当前节点没有可编辑的常用参数。</div>
          )}
        </SectionCard>

        {sections.advanced.length > 0 && (
          <SectionCard title="高级参数" testId="config-advanced-section">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/60"
              onClick={() => setAdvancedOpen((value) => !value)}
            >
              <span>{advancedOpen ? '收起高级参数' : '展开高级参数'}</span>
              {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {advancedOpen && (
              <div className="space-y-3">
                {sections.advanced.map((field) => (
                  <ConfigField
                    key={field.key}
                    field={field}
                    value={getFieldValue(field, localConfig)}
                    connected={connectedInputs.has(field.key)}
                    onChange={(value) => handleConfigChange(field.key, value)}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard title="输入来源" testId="config-source-section">
          {inputSources.length > 0 ? (
            <div className="space-y-2">
              {inputSources.map((source) => (
                <div
                  key={source.key}
                  className="rounded-md border border-border bg-card px-3 py-2 text-xs"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium">{source.label}</span>
                    {renderSourceBadge(source.sourceType)}
                  </div>
                  <div className="text-muted-foreground">{source.summary}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">当前节点没有可追踪的输入来源。</div>
          )}
        </SectionCard>
      </div>

      <div className="border-t border-border p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          重置当前节点参数
        </Button>
      </div>
    </div>
  )
}
