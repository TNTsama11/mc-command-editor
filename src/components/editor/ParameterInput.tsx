/**
 * ParameterInput - 参数输入组件
 *
 * 根据参数类型渲染不同的输入控件:
 * - 文本输入 (string)
 * - 数字输入 (integer, float) - 带增减按钮
 * - 布尔开关 (boolean) - Switch 组件
 * - 选择器 (options) - 下拉选择
 * - 范围输入 (range) - min/max 输入
 */

import React, { useCallback, useMemo } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
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

// ============================================================================
// 类型定义
// ============================================================================

/** 参数值类型 */
export type ParameterValue = string | number | boolean | null | { min?: number; max?: number }

/** 验证错误 */
export interface ValidationError {
  message: string
  type: 'error' | 'warning'
}

/** 参数输入组件属性 */
export interface ParameterInputProps {
  /** 参数定义 */
  definition: CommandParameterDefinition
  /** 当前值 */
  value: ParameterValue
  /** 值变更回调 */
  onChange: (value: ParameterValue) => void
  /** 验证错误 */
  error?: ValidationError
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
}

/** 数字输入组件属性 */
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

/** 范围输入组件属性 */
interface RangeInputProps {
  value: { min?: number; max?: number }
  onChange: (value: { min?: number; max?: number }) => void
  disabled?: boolean
  error?: ValidationError
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// 工具函数
// ============================================================================

/** 获取数字步长 */
function getStep(paramType: string): number {
  switch (paramType) {
    case 'integer':
      return 1
    case 'float':
      return 0.1
    default:
      return 1
  }
}

/** 获取尺寸相关类名 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): {
  input: string
  button: string
  label: string
} {
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

// ============================================================================
// 子组件
// ============================================================================

/** 数字输入组件（带增减按钮） */
const NumberInput: React.FC<NumberInputProps> = React.memo(({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  error,
  size = 'md',
}) => {
  const sizeClasses = getSizeClasses(size)

  const handleIncrement = useCallback(() => {
    const newValue = (value ?? 0) + step
    if (max !== undefined && newValue > max) return
    onChange(Number(newValue.toFixed(10)))
  }, [value, step, max, onChange])

  const handleDecrement = useCallback(() => {
    const newValue = (value ?? 0) - step
    if (min !== undefined && newValue < min) return
    onChange(Number(newValue.toFixed(10)))
  }, [value, step, min, onChange])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value)
      if (!isNaN(newValue)) {
        onChange(newValue)
      }
    },
    [onChange]
  )

  const canIncrement = max === undefined || value < max
  const canDecrement = min === undefined || value > min

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || !canDecrement}
        className={cn(
          'flex items-center justify-center rounded-l-md border border-r-0 border-input bg-muted hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          sizeClasses.button
        )}
        aria-label="减少"
      >
        <Minus className="h-4 w-4" />
      </button>
      <Input
        type="number"
        value={value ?? ''}
        onChange={handleInputChange}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={cn(
          'text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          sizeClasses.input,
          error && 'border-destructive focus-visible:ring-destructive'
        )}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || !canIncrement}
        className={cn(
          'flex items-center justify-center rounded-r-md border border-l-0 border-input bg-muted hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          sizeClasses.button
        )}
        aria-label="增加"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
})

NumberInput.displayName = 'NumberInput'

/** 范围输入组件 */
const RangeInput: React.FC<RangeInputProps> = React.memo(({
  value,
  onChange,
  disabled,
  error,
  size = 'md',
}) => {
  const sizeClasses = getSizeClasses(size)

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value === '' ? undefined : parseFloat(e.target.value)
      onChange({ ...value, min: newValue })
    },
    [value, onChange]
  )

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value === '' ? undefined : parseFloat(e.target.value)
      onChange({ ...value, max: newValue })
    },
    [value, onChange]
  )

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <label className={cn('text-muted-foreground mb-1 block', sizeClasses.label)}>
          最小值
        </label>
        <Input
          type="number"
          value={value.min ?? ''}
          onChange={handleMinChange}
          disabled={disabled}
          placeholder="无限制"
          className={cn(
            sizeClasses.input,
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>
      <span className="text-muted-foreground pt-5">~</span>
      <div className="flex-1">
        <label className={cn('text-muted-foreground mb-1 block', sizeClasses.label)}>
          最大值
        </label>
        <Input
          type="number"
          value={value.max ?? ''}
          onChange={handleMaxChange}
          disabled={disabled}
          placeholder="无限制"
          className={cn(
            sizeClasses.input,
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>
    </div>
  )
})

RangeInput.displayName = 'RangeInput'

// ============================================================================
// 主组件
// ============================================================================

/**
 * ParameterInput - 参数输入组件
 *
 * @example
 * ```tsx
 * <ParameterInput
 *   definition={{ name: 'count', type: 'integer', required: true }}
 *   value={5}
 *   onChange={setValue}
 * />
 * ```
 */
export const ParameterInput: React.FC<ParameterInputProps> = React.memo(({
  definition,
  value,
  onChange,
  error,
  disabled,
  className,
  size = 'md',
}) => {
  const { name, type, options, required, description } = definition
  const sizeClasses = getSizeClasses(size)

  // 确定输入控件类型
  const inputMode = useMemo(() => {
    // 如果有 options，使用选择器
    if (options && options.length > 0) {
      return 'select'
    }

    switch (type) {
      case 'integer':
        return 'number'
      case 'float':
        return 'number'
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
  }, [type, options])

  // 渲染文本输入
  const renderTextInput = useCallback(() => (
    <Input
      type="text"
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={description ?? `输入 ${name}`}
      className={cn(
        sizeClasses.input,
        error && 'border-destructive focus-visible:ring-destructive'
      )}
    />
  ), [value, onChange, disabled, name, description, sizeClasses, error])

  // 渲染数字输入
  const renderNumberInput = useCallback(() => (
    <NumberInput
      value={(value as number) ?? 0}
      onChange={(v) => onChange(v)}
      step={getStep(type)}
      disabled={disabled}
      error={error}
      size={size}
    />
  ), [value, onChange, type, disabled, error, size])

  // 渲染布尔开关
  const renderBooleanInput = useCallback(() => (
    <div className="flex items-center gap-2">
      <Switch
        checked={(value as boolean) ?? false}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled}
      />
      <span className={cn('text-muted-foreground', sizeClasses.label)}>
        {(value as boolean) ? '是' : '否'}
      </span>
    </div>
  ), [value, onChange, disabled, sizeClasses])

  // 渲染选择器
  const renderSelectInput = useCallback(() => (
    <Select
      value={(value as string) ?? ''}
      onValueChange={(v) => onChange(v)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          sizeClasses.input,
          error && 'border-destructive focus-visible:ring-destructive'
        )}
      >
        <SelectValue placeholder={`选择 ${name}`} />
      </SelectTrigger>
      <SelectContent>
        {options?.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ), [value, onChange, disabled, options, name, sizeClasses, error])

  // 渲染范围输入
  const renderRangeInput = useCallback(() => (
    <RangeInput
      value={(value as { min?: number; max?: number }) ?? {}}
      onChange={(v) => onChange(v)}
      disabled={disabled}
      error={error}
      size={size}
    />
  ), [value, onChange, disabled, error, size])

  // 渲染 NBT 输入（文本域）
  const renderNBTInput = useCallback(() => (
    <textarea
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={description ?? `输入 ${name} (NBT 格式)`}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
        sizeClasses.input,
        error && 'border-destructive focus-visible:ring-destructive'
      )}
    />
  ), [value, onChange, disabled, name, description, sizeClasses, error])

  // 根据输入模式渲染对应控件
  const renderInput = useCallback(() => {
    switch (inputMode) {
      case 'number':
        return renderNumberInput()
      case 'boolean':
        return renderBooleanInput()
      case 'select':
        return renderSelectInput()
      case 'range':
        return renderRangeInput()
      case 'textarea':
        return renderNBTInput()
      default:
        return renderTextInput()
    }
  }, [
    inputMode,
    renderNumberInput,
    renderBooleanInput,
    renderSelectInput,
    renderRangeInput,
    renderNBTInput,
    renderTextInput,
  ])

  return (
    <div className={cn('space-y-2', className)}>
      {/* 标签 */}
      <div className="flex items-center gap-1">
        <label className={cn('font-medium', sizeClasses.label)}>
          {name}
        </label>
        {required && (
          <span className="text-destructive text-xs">*</span>
        )}
        {description && (
          <span className="text-muted-foreground text-xs ml-2">
            ({description})
          </span>
        )}
      </div>

      {/* 输入控件 */}
      {renderInput()}

      {/* 错误提示 */}
      {error && (
        <p
          className={cn(
            'text-xs',
            error.type === 'error' ? 'text-destructive' : 'text-yellow-500'
          )}
        >
          {error.message}
        </p>
      )}
    </div>
  )
})

ParameterInput.displayName = 'ParameterInput'

export default ParameterInput
