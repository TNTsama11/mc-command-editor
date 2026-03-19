import React, { useCallback, useMemo } from 'react'
import { Minus, Plus } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { CommandParameterDefinition } from '@/core/parser/commands'
import { cn } from '@/lib/utils'

export type ParameterValue =
  | string
  | number
  | boolean
  | null
  | { min?: number; max?: number }

export interface ValidationError {
  message: string
  type: 'error' | 'warning'
}

export interface ParameterInputProps {
  definition: CommandParameterDefinition
  value: ParameterValue
  onChange: (value: ParameterValue) => void
  error?: ValidationError
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  error?: ValidationError
  size?: 'sm' | 'md' | 'lg'
}

interface RangeInputProps {
  value: { min?: number; max?: number }
  onChange: (value: { min?: number; max?: number }) => void
  disabled?: boolean
  error?: ValidationError
  size?: 'sm' | 'md' | 'lg'
}

function getStep(parameterType: string) {
  return parameterType === 'float' ? 0.1 : 1
}

function getSizeClasses(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return {
        input: 'h-8 text-xs',
        button: 'h-8 w-8',
        label: 'text-xs',
      }
    case 'lg':
      return {
        input: 'h-12 text-base',
        button: 'h-12 w-12',
        label: 'text-base',
      }
    default:
      return {
        input: 'h-10 text-sm',
        button: 'h-10 w-10',
        label: 'text-sm',
      }
  }
}

const NumberInput: React.FC<NumberInputProps> = React.memo(
  ({ value, onChange, min, max, step = 1, disabled, error, size = 'md' }) => {
    const sizeClasses = getSizeClasses(size)

    const changeValue = useCallback(
      (nextValue: number) => {
        if (min !== undefined && nextValue < min) return
        if (max !== undefined && nextValue > max) return
        onChange(Number(nextValue.toFixed(10)))
      },
      [max, min, onChange]
    )

    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="减少"
          disabled={disabled}
          className={cn(
            'flex items-center justify-center rounded-l-md border border-input border-r-0 bg-muted transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
            sizeClasses.button
          )}
          onClick={() => changeValue((value ?? 0) - step)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <Input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            sizeClasses.input,
            'text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
          onChange={(event) => {
            const nextValue = parseFloat(event.target.value)
            onChange(Number.isNaN(nextValue) ? 0 : nextValue)
          }}
        />
        <button
          type="button"
          aria-label="增加"
          disabled={disabled}
          className={cn(
            'flex items-center justify-center rounded-r-md border border-input border-l-0 bg-muted transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
            sizeClasses.button
          )}
          onClick={() => changeValue((value ?? 0) + step)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    )
  }
)

NumberInput.displayName = 'NumberInput'

const RangeInput: React.FC<RangeInputProps> = React.memo(
  ({ value, onChange, disabled, error, size = 'md' }) => {
    const sizeClasses = getSizeClasses(size)

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className={cn('mb-1 block text-muted-foreground', sizeClasses.label)}>最小值</label>
          <Input
            type="number"
            value={value.min ?? ''}
            disabled={disabled}
            placeholder="不限"
            className={cn(sizeClasses.input, error && 'border-destructive focus-visible:ring-destructive')}
            onChange={(event) =>
              onChange({
                ...value,
                min: event.target.value === '' ? undefined : parseFloat(event.target.value),
              })
            }
          />
        </div>
        <span className="pt-5 text-muted-foreground">~</span>
        <div className="flex-1">
          <label className={cn('mb-1 block text-muted-foreground', sizeClasses.label)}>最大值</label>
          <Input
            type="number"
            value={value.max ?? ''}
            disabled={disabled}
            placeholder="不限"
            className={cn(sizeClasses.input, error && 'border-destructive focus-visible:ring-destructive')}
            onChange={(event) =>
              onChange({
                ...value,
                max: event.target.value === '' ? undefined : parseFloat(event.target.value),
              })
            }
          />
        </div>
      </div>
    )
  }
)

RangeInput.displayName = 'RangeInput'

export const ParameterInput: React.FC<ParameterInputProps> = React.memo(
  ({ definition, value, onChange, error, disabled, className, size = 'md' }) => {
    const sizeClasses = getSizeClasses(size)

    const inputMode = useMemo(() => {
      if (definition.options?.length) return 'select'

      switch (definition.type) {
        case 'integer':
        case 'float':
        case 'number':
          return 'number'
        case 'boolean':
          return 'boolean'
        case 'range':
          return 'range'
        case 'nbt':
          return 'textarea'
        default:
          return 'text'
      }
    }, [definition.options, definition.type])

    const renderInput = () => {
      if (inputMode === 'select') {
        return (
          <Select
            value={(value as string) ?? ''}
            onValueChange={(nextValue) => onChange(nextValue)}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(sizeClasses.input, error && 'border-destructive focus-visible:ring-destructive')}
            >
              <SelectValue placeholder={`选择 ${definition.name}`} />
            </SelectTrigger>
            <SelectContent>
              {definition.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      if (inputMode === 'number') {
        return (
          <NumberInput
            value={typeof value === 'number' ? value : Number(definition.defaultValue ?? 0)}
            onChange={(nextValue) => onChange(nextValue)}
            disabled={disabled}
            error={error}
            step={getStep(definition.type)}
            size={size}
          />
        )
      }

      if (inputMode === 'boolean') {
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={Boolean(value)}
              disabled={disabled}
              onCheckedChange={(nextChecked) => onChange(nextChecked)}
            />
            <span className={cn('text-muted-foreground', sizeClasses.label)}>
              {Boolean(value) ? '开启' : '关闭'}
            </span>
          </div>
        )
      }

      if (inputMode === 'range') {
        return (
          <RangeInput
            value={(value as { min?: number; max?: number }) ?? {}}
            onChange={(nextValue) => onChange(nextValue)}
            disabled={disabled}
            error={error}
            size={size}
          />
        )
      }

      if (inputMode === 'textarea') {
        return (
          <textarea
            value={(value as string) ?? ''}
            disabled={disabled}
            placeholder={definition.description ?? `输入 ${definition.name}`}
            className={cn(
              'flex min-h-[96px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
            onChange={(event) => onChange(event.target.value)}
          />
        )
      }

      return (
        <Input
          type="text"
          value={(value as string) ?? ''}
          disabled={disabled}
          placeholder={definition.description ?? `输入 ${definition.name}`}
          className={cn(sizeClasses.input, error && 'border-destructive focus-visible:ring-destructive')}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    }

    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-1">
          <label className={cn('font-medium', sizeClasses.label)}>{definition.name}</label>
          {definition.required && <span className="text-xs text-destructive">*</span>}
          {definition.description && (
            <span className="ml-2 text-xs text-muted-foreground">({definition.description})</span>
          )}
        </div>

        {renderInput()}

        {error && (
          <p
            className={cn(
              'text-xs',
              error.type === 'error' ? 'text-destructive' : 'text-yellow-600 dark:text-yellow-400'
            )}
          >
            {error.message}
          </p>
        )}
      </div>
    )
  }
)

ParameterInput.displayName = 'ParameterInput'

export default ParameterInput
