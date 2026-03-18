/**
 * 坐标输入组件
 * 支持三种坐标类型：绝对坐标、相对坐标(~)、本地坐标(^)
 */
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  type Position,
  type Coordinate,
  type CoordinateType,
  positionToString
} from '@/core/parser/ast'

// 坐标类型选项
const COORDINATE_TYPES: { value: CoordinateType; label: string; prefix: string }[] = [
  { value: 'absolute', label: '绝对', prefix: '' },
  { value: 'relative', label: '相对', prefix: '~' },
  { value: 'local', label: '本地', prefix: '^' }
]

// 坐标轴配置
const AXES: { key: 'x' | 'y' | 'z'; label: string }[] = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'z', label: 'Z' }
]

export interface PositionInputProps {
  /** 当前位置值 */
  value?: Position
  /** 值变化回调 */
  onChange?: (position: Position) => void
  /** 占位符配置 */
  placeholders?: { x: string; y: string; z: string }
  /** 禁用状态 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 标签 */
  label?: string
}

/**
 * 检查位置是否有效（不允许混合本地坐标和其他类型）
 */
function validatePosition(position: Position): { valid: boolean; error?: string } {
  const types = [position.x.type, position.y.type, position.z.type]
  const hasLocal = types.includes('local')
  const hasNonLocal = types.some(t => t !== 'local')

  if (hasLocal && hasNonLocal) {
    return {
      valid: false,
      error: '本地坐标(^)不能与绝对/相对坐标混用'
    }
  }

  return { valid: true }
}

/**
 * 获取坐标的统一类型（用于显示当前选中的类型）
 */
function getUniformType(position: Position): CoordinateType {
  // 如果有任何本地坐标，返回 local
  if (position.x.type === 'local' || position.y.type === 'local' || position.z.type === 'local') {
    return 'local'
  }
  // 如果全部是绝对坐标，返回 absolute
  if (position.x.type === 'absolute' && position.y.type === 'absolute' && position.z.type === 'absolute') {
    return 'absolute'
  }
  // 否则返回 relative
  return 'relative'
}

/**
 * 创建默认位置
 */
function createDefaultPosition(): Position {
  return {
    x: { type: 'absolute', value: 0 },
    y: { type: 'absolute', value: 0 },
    z: { type: 'absolute', value: 0 }
  }
}

/**
 * 将位置转换为指定类型
 */
function convertPositionType(position: Position, newType: CoordinateType): Position {
  return {
    x: { type: newType, value: position.x.value },
    y: { type: newType, value: position.y.value },
    z: { type: newType, value: position.z.value }
  }
}

/**
 * 坐标输入组件
 */
export const PositionInput = React.forwardRef<HTMLDivElement, PositionInputProps>(
  (
    {
      value,
      onChange,
      placeholders = { x: 'X 坐标', y: 'Y 坐标', z: 'Z 坐标' },
      disabled = false,
      className,
      label = '坐标'
    },
    ref
  ) => {
    // 内部状态：当 value 未提供时使用
    const [internalPosition, setInternalPosition] = React.useState<Position>(createDefaultPosition)

    // 当前使用的位置（受控或非受控）
    const position = value ?? internalPosition

    // 验证结果
    const validation = React.useMemo(() => validatePosition(position), [position])

    // 当前统一类型
    const currentType = React.useMemo(() => getUniformType(position), [position])

    // 生成的坐标字符串预览
    const previewString = React.useMemo(() => {
      if (!validation.valid) return ''
      return positionToString(position)
    }, [position, validation.valid])

    // 更新单个坐标轴的值
    const handleAxisChange = (axis: 'x' | 'y' | 'z', inputValue: string) => {
      const numValue = parseFloat(inputValue)
      const newCoord: Coordinate = {
        type: position[axis].type,
        value: isNaN(numValue) ? 0 : numValue
      }

      const newPosition = {
        ...position,
        [axis]: newCoord
      }

      // 非受控模式更新内部状态
      if (!value) {
        setInternalPosition(newPosition)
      }

      // 触发回调
      if (validation.valid) {
        onChange?.(newPosition)
      }
    }

    // 切换坐标类型
    const handleTypeChange = (newType: CoordinateType) => {
      const newPosition = convertPositionType(position, newType)

      // 非受控模式更新内部状态
      if (!value) {
        setInternalPosition(newPosition)
      }

      onChange?.(newPosition)
    }

    // 获取坐标轴的显示值（不含前缀）
    const getAxisDisplayValue = (axis: 'x' | 'y' | 'z'): string => {
      return String(position[axis].value)
    }

    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        {/* 标签 */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">{label}</label>
          {/* 坐标类型切换按钮组 */}
          <div className="flex gap-1">
            {COORDINATE_TYPES.map((type) => (
              <Button
                key={type.value}
                type="button"
                variant={currentType === type.value ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                onClick={() => handleTypeChange(type.value)}
                className="h-7 px-2 text-xs"
              >
                {type.prefix || '无'} {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 三轴输入框 */}
        <div className="flex gap-2">
          {AXES.map((axis) => {
            const typeInfo = COORDINATE_TYPES.find(t => t.value === position[axis.key].type)
            const prefix = typeInfo?.prefix || ''

            return (
              <div key={axis.key} className="flex-1">
                <div className="relative">
                  {/* 前缀标签 */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                    {axis.key.toUpperCase()}{prefix}
                  </div>
                  <Input
                    type="number"
                    step="0.5"
                    value={getAxisDisplayValue(axis.key)}
                    onChange={(e) => handleAxisChange(axis.key, e.target.value)}
                    placeholder={placeholders[axis.key]}
                    disabled={disabled}
                    className="pl-10"
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* 验证错误提示 */}
        {!validation.valid && (
          <p className="text-sm text-destructive">{validation.error}</p>
        )}

        {/* 坐标字符串预览 */}
        {validation.valid && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">预览:</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {previewString}
            </code>
          </div>
        )}
      </div>
    )
  }
)

PositionInput.displayName = 'PositionInput'

export default PositionInput
