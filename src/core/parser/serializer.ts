/**
 * AST → 命令字符串序列化器
 *
 * 将 AST 转换回 Minecraft 命令字符串
 */

import type { CommandAST, CommandArgument, Position, Coordinate, Target, ResourceLocation, NBTCompound } from './ast'

export class CommandSerializer {
  serialize(ast: CommandAST): string {
    const parts: string[] = [`/${ast.command}`]

    for (const arg of ast.arguments) {
      parts.push(this.serializeArgument(arg))
    }

    return parts.join(' ')
  }

  private serializeArgument(arg: CommandArgument): string {
    switch (arg.type) {
      case 'entity':
        return this.serializeTarget(arg.value as Target | Target[])
      case 'position':
      case 'block_pos':
      case 'vec3':
        return this.serializePosition(arg.value as Position)
      case 'resource':
      case 'resource_or_tag':
        return this.serializeResourceLocation(arg.value as ResourceLocation)
      case 'number':
      case 'integer':
      case 'float':
        return String(arg.value)
      case 'string':
      case 'greedy_string':
      case 'quotable_phrase':
        return this.serializeString(arg.value as string)
      case 'boolean':
      case 'bool':
        return String(arg.value)
      case 'nbt':
        return this.serializeNBT(arg.value as NBTCompound)
      case 'nbt_path':
        return String(arg.value)
      case 'range':
      case 'int_range':
      case 'float_range':
        return this.serializeRange(arg.value as { min?: number; max?: number; exact?: number })
      case 'gamemode':
        return String(arg.value)
      case 'time':
        return this.serializeTime(arg.value as { value: number; unit?: string })
      case 'component':
        return JSON.stringify(arg.value)
      default:
        return String(arg.value)
    }
  }

  private serializeTarget(target: Target | Target[]): string {
    if (Array.isArray(target)) {
      return target.map(t => this.serializeSingleTarget(t)).join(',')
    }
    return this.serializeSingleTarget(target)
  }

  private serializeSingleTarget(target: Target): string {
    if ('type' in target) {
      if (target.type === '@p' || target.type === '@a' || target.type === '@e' ||
          target.type === '@r' || target.type === '@s') {
        const selector = target as { type: string; arguments?: Record<string, unknown> }
        if (selector.arguments && Object.keys(selector.arguments).length > 0) {
          const args = Object.entries(selector.arguments)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}=${value.join(',')}`
              }
              return `${key}=${value}`
            })
            .join(',')
          return `${selector.type}[${args}]`
        }
        return selector.type
      }
      // PlayerReference
      return (target as { value: string }).value
    }
    return String(target)
  }

  private serializePosition(pos: Position): string {
    return `${this.serializeCoordinate(pos.x)} ${this.serializeCoordinate(pos.y)} ${this.serializeCoordinate(pos.z)}`
  }

  private serializeCoordinate(coord: Coordinate): string {
    const prefix = coord.type === 'relative' ? '~' : coord.type === 'local' ? '^' : ''
    const value = coord.value === 0 && coord.type !== 'absolute' ? '' : String(coord.value)
    return `${prefix}${value}`
  }

  private serializeResourceLocation(loc: ResourceLocation): string {
    if (loc.namespace === 'minecraft') {
      return loc.path
    }
    return `${loc.namespace}:${loc.path}`
  }

  private serializeString(value: string): string {
    // 如果字符串包含空格或特殊字符，需要引号
    if (/^[a-zA-Z0-9_\-:.]+$/.test(value)) {
      return value
    }
    // 转义引号
    const escaped = value.replace(/"/g, '\\"')
    return `"${escaped}"`
  }

  private serializeNBT(nbt: NBTCompound): string {
    return this.serializeNBTValue(nbt)
  }

  private serializeNBTValue(value: unknown): string {
    if (typeof value === 'string') {
      const escaped = value.replace(/"/g, '\\"')
      return `"${escaped}"`
    }
    if (typeof value === 'number') {
      return String(value)
    }
    if (typeof value === 'boolean') {
      return value ? '1b' : '0b'
    }
    if (Array.isArray(value)) {
      const elements = value.map(v => this.serializeNBTValue(v)).join(',')
      return `[${elements}]`
    }
    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, val]) => `${key}:${this.serializeNBTValue(val)}`)
        .join(',')
      return `{${entries}}`
    }
    return String(value)
  }

  private serializeRange(range: { min?: number; max?: number; exact?: number }): string {
    if (range.exact !== undefined) {
      return String(range.exact)
    }
    const parts: string[] = []
    if (range.min !== undefined) parts.push(String(range.min))
    parts.push('..')
    if (range.max !== undefined) parts.push(String(range.max))
    return parts.join('')
  }

  private serializeTime(time: { value: number; unit?: string }): string {
    const unit = time.unit || ''
    return `${time.value}${unit}`
  }
}

export const serializer = new CommandSerializer()
