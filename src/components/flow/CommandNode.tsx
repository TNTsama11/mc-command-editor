/**
 * 命令节点组件
 * 渲染单个命令节点，包含输入/输出引脚
 */

import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import {
  CommandNodeData,
  getPinColor,
  PinDataType,
  PinDefinition,
} from '@/store/flowStore'
import { cn } from '@/lib/utils'

export function getPinSemanticKind(dataType: PinDataType): 'execute' | 'data' {
  return dataType === 'execute' ? 'execute' : 'data'
}

export function getPinHandleClassName(dataType: PinDataType): string {
  return cn(
    'w-4 h-4 md:w-3 md:h-3 border-2 transition-all touch-manipulation',
    getPinSemanticKind(dataType) === 'execute' ? 'rounded-full' : 'rounded-sm'
  )
}

const PinHandle = memo(function PinHandle({
  type,
  id,
  position,
  dataType,
}: {
  type: 'source' | 'target'
  id: string
  position: Position
  dataType: PinDataType
}) {
  const color = getPinColor(dataType)
  const semanticKind = getPinSemanticKind(dataType)
  const isExecute = semanticKind === 'execute'

  return (
    <Handle
      type={type}
      id={id}
      position={position}
      data-testid={`pin-handle-${id}`}
      data-pin-kind={semanticKind}
      className={getPinHandleClassName(dataType)}
      style={{
        backgroundColor: isExecute ? color : `${color}33`,
        borderColor: color,
        touchAction: 'none',
      }}
    />
  )
})

const InputPinRow = memo(function InputPinRow({
  pin,
}: {
  pin: PinDefinition
}) {
  return (
    <div className="relative flex min-h-6 items-center pl-5 pr-2 text-xs group">
      <PinHandle
        type="target"
        id={pin.id}
        position={Position.Left}
        dataType={pin.type}
      />
      <span className="block truncate leading-5 text-muted-foreground">
        {pin.name}
        {pin.required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="absolute left-0 -translate-x-full pr-2 hidden group-hover:block z-10">
        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md whitespace-nowrap">
          {pin.type}
        </div>
      </div>
    </div>
  )
})

const OutputPinRow = memo(function OutputPinRow({
  pin,
}: {
  pin: PinDefinition
}) {
  return (
    <div className="relative flex min-h-6 items-center justify-end pl-2 pr-5 text-xs group">
      <div className="absolute right-0 translate-x-full pl-2 hidden group-hover:block z-10">
        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md whitespace-nowrap">
          {pin.type}
        </div>
      </div>
      <span className="block truncate leading-5 text-right text-muted-foreground">{pin.name}</span>
      <PinHandle
        type="source"
        id={pin.id}
        position={Position.Right}
        dataType={pin.type}
      />
    </div>
  )
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CommandNodeComponent({ data, selected }: any) {
  const nodeData = data as CommandNodeData
  const hasErrors = nodeData.errors && nodeData.errors.length > 0

  return (
    <div
      data-testid={`flow-node-${nodeData.commandType}`}
      className={cn(
        'bg-card border-2 rounded-lg shadow-lg min-w-[220px] max-w-[280px] transition-all',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        hasErrors && 'border-destructive'
      )}
    >
      <div
        className={cn(
          'px-3 py-2 border-b border-border font-medium text-sm',
          hasErrors ? 'bg-destructive/10' : 'bg-muted/50'
        )}
      >
        <div className="flex items-center gap-2">
          <span>{nodeData.label}</span>
          {hasErrors && (
            <span className="text-destructive text-xs">!</span>
          )}
        </div>
        {nodeData.description && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {nodeData.description}
          </div>
        )}
      </div>

      <div className="px-3 py-2 space-y-1">
        {nodeData.inputs.length > 0 && (
          <div className="space-y-1">
            {nodeData.inputs.map((pin: PinDefinition) => (
              <InputPinRow key={pin.id} pin={pin} />
            ))}
          </div>
        )}

        {nodeData.outputs.length > 0 && (
          <div className="space-y-1 mt-2">
            {nodeData.outputs.map((pin: PinDefinition) => (
              <OutputPinRow key={pin.id} pin={pin} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const CommandNode = memo(CommandNodeComponent)
