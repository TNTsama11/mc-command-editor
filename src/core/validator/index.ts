// Command Validator - 命令验证器

import type { CommandAST, CommandArgument, Target, ResourceLocation, Position } from '../parser/ast'
import { getCommandDefinition, type CommandDefinition } from '../parser/commands'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  code: string
  message: string
  position?: number
  line?: number
  column?: number
}

export interface ValidationWarning {
  code: string
  message: string
  suggestion?: string
}

export class CommandValidator {
  /**
   * 验证命令 AST
   */
  validate(ast: CommandAST): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // 获取命令定义
    const definition = getCommandDefinition(ast.command)

    if (!definition) {
      warnings.push({
        code: 'UNKNOWN_COMMAND',
        message: `未知命令类型: ${ast.command}`,
        suggestion: '请检查命令拼写是否正确',
      })
    } else {
      // 验证参数数量和类型
      this.validateArguments(ast.arguments, definition, errors, warnings)
    }

    // 验证参数值
    for (let i = 0; i < ast.arguments.length; i++) {
      const argErrors = this.validateArgumentValue(ast.arguments[i], i)
      errors.push(...argErrors)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 验证参数与命令定义的匹配
   */
  private validateArguments(
    args: CommandArgument[],
    definition: CommandDefinition,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const params = definition.parameters
    const requiredParams = params.filter(p => p.required)

    // 检查必需参数数量
    if (args.length < requiredParams.length) {
      errors.push({
        code: 'MISSING_REQUIRED_ARGUMENT',
        message: `缺少必需参数: ${requiredParams[args.length]?.name || '未知'}`,
        position: args.length,
      })
    }

    // 按位置验证参数类型
    for (let i = 0; i < args.length && i < params.length; i++) {
      const arg = args[i]
      const param = params[i]

      if (!this.isTypeCompatible(arg.type, param.type)) {
        warnings.push({
          code: 'TYPE_MISMATCH',
          message: `参数 ${param.name} 期望类型 ${param.type}，实际是 ${arg.type}`,
          suggestion: `请检查参数 ${param.name} 的类型`,
        })
      }

      // 检查选项值
      if (param.options && typeof arg.value === 'string' && !param.options.includes(arg.value)) {
        errors.push({
          code: 'INVALID_OPTION',
          message: `参数 ${param.name} 的值 "${arg.value}" 不在有效选项中: ${param.options.join(', ')}`,
          position: i,
        })
      }
    }
  }

  /**
   * 检查类型兼容性
   */
  private isTypeCompatible(actualType: string, expectedType: string): boolean {
    // 类型映射
    const typeMap: Record<string, string[]> = {
      'entity': ['entity', 'selector', 'player'],
      'position': ['position', 'block_pos', 'vec3', 'vec2'],
      'resource': ['resource', 'resource_or_tag', 'item', 'block', 'entity_type'],
      'number': ['number', 'integer', 'float', 'double'],
      'string': ['string', 'greedy_string', 'quotable_phrase', 'word'],
      'boolean': ['boolean', 'bool'],
      'nbt': ['nbt', 'nbt_compound', 'nbt_path'],
      'range': ['range', 'int_range', 'float_range'],
    }

    if (actualType === expectedType) return true
    const compatibleTypes = typeMap[actualType] || [actualType]
    return compatibleTypes.includes(expectedType)
  }

  /**
   * 验证参数值
   */
  private validateArgumentValue(arg: CommandArgument, index: number): ValidationError[] {
    const errors: ValidationError[] = []

    switch (arg.type) {
      case 'entity':
        errors.push(...this.validateEntity(arg.value as Target | Target[], index))
        break
      case 'position':
      case 'block_pos':
      case 'vec3':
        errors.push(...this.validatePosition(arg.value as Position, index))
        break
      case 'resource':
      case 'resource_or_tag':
        errors.push(...this.validateResource(arg.value as ResourceLocation, index))
        break
    }

    return errors
  }

  /**
   * 验证目标选择器
   */
  private validateEntity(target: Target | Target[], index: number): ValidationError[] {
    const errors: ValidationError[] = []
    const targets = Array.isArray(target) ? target : [target]

    for (const t of targets) {
      if (typeof t === 'object' && 'type' in t) {
        const selectorType = t.type

        // 验证选择器类型
        if (selectorType.startsWith('@')) {
          const validTypes = ['@p', '@a', '@e', '@r', '@s']
          if (!validTypes.includes(selectorType)) {
            errors.push({
              code: 'INVALID_SELECTOR_TYPE',
              message: `无效的选择器类型: ${selectorType}`,
              position: index,
            })
          }

          // 验证选择器参数
          if ('arguments' in t && t.arguments) {
            const validArgs = [
              'x', 'y', 'z', 'dx', 'dy', 'dz',
              'limit', 'sort', 'distance', 'level', 'x_rotation', 'y_rotation',
              'type', 'name', 'team', 'tag', 'nbt', 'scores', 'gamemode', 'predicate'
            ]

            for (const key of Object.keys(t.arguments)) {
              if (!validArgs.includes(key)) {
                errors.push({
                  code: 'UNKNOWN_SELECTOR_ARGUMENT',
                  message: `未知的选择器参数: ${key}`,
                  position: index,
                })
              }
            }
          }
        }
      }
    }

    return errors
  }

  /**
   * 验证坐标
   */
  private validatePosition(pos: Position, index: number): ValidationError[] {
    const errors: ValidationError[] = []
    const coords = [pos.x, pos.y, pos.z]

    // 检查是否混合使用本地坐标和其他坐标类型
    const hasLocal = coords.some(c => c.type === 'local')
    const hasOther = coords.some(c => c.type !== 'local')

    if (hasLocal && hasOther) {
      errors.push({
        code: 'MIXED_COORDINATE_TYPES',
        message: '不能混合使用本地坐标 (^) 和世界坐标 (~ 或绝对坐标)',
        position: index,
      })
    }

    return errors
  }

  /**
   * 验证资源位置
   */
  private validateResource(loc: ResourceLocation, index: number): ValidationError[] {
    const errors: ValidationError[] = []

    // 验证命名空间格式
    if (!/^[a-z0-9_.-]+$/.test(loc.namespace)) {
      errors.push({
        code: 'INVALID_NAMESPACE',
        message: `无效的命名空间: ${loc.namespace}`,
        position: index,
      })
    }

    // 验证路径格式
    if (!/^[a-z0-9/_.-]+$/.test(loc.path)) {
      errors.push({
        code: 'INVALID_RESOURCE_PATH',
        message: `无效的资源路径: ${loc.path}`,
        position: index,
      })
    }

    return errors
  }

  /**
   * 快速验证命令字符串
   */
  validateString(input: string): ValidationResult {
    // 简单的字符串验证
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!input.trim().startsWith('/')) {
      warnings.push({
        code: 'MISSING_SLASH',
        message: '命令应以 / 开头',
        suggestion: '在命令开头添加 /',
      })
    }

    // 检查基本语法
    const trimmed = input.trim().replace(/^\//, '')
    const parts = trimmed.split(/\s+/)

    if (parts.length === 0 || parts[0] === '') {
      errors.push({
        code: 'EMPTY_COMMAND',
        message: '命令不能为空',
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}

export const validator = new CommandValidator()
