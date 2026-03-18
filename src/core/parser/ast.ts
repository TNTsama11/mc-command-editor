/**
 * Minecraft 命令 AST 数据结构
 */

// 基础类型
export type SelectorType = '@p' | '@a' | '@e' | '@r' | '@s'
export type CoordinateType = 'absolute' | 'relative' | 'local'
export type CommandBlockType = 'impulse' | 'chain' | 'repeat'
export type GameMode = 'survival' | 'creative' | 'adventure' | 'spectator'

// 坐标
export interface Coordinate {
  type: CoordinateType
  value: number
}

export interface Position {
  x: Coordinate
  y: Coordinate
  z: Coordinate
}

// 目标选择器
export interface TargetSelector {
  type: SelectorType
  arguments?: Record<string, unknown>
}

// 玩家引用
export interface PlayerReference {
  type: 'player'
  value: string
}

// UUID 引用
export interface UUIDReference {
  type: 'uuid'
  value: string
}

export type Target = TargetSelector | PlayerReference | UUIDReference

// 范围
export interface Range {
  min?: number
  max?: number
  exact?: number
}

// NBT
export type NBTValue = number | string | boolean | NBTValue[] | NBTCompound
export interface NBTCompound { [key: string]: NBTValue }

// NBT 带类型值
export interface NBTTypedValue {
  value: number
  type: 'b' | 's' | 'l' | 'f' | 'd' | 'B' | 'S' | 'L' | 'F' | 'D'
}

// 资源位置
export interface ResourceLocation {
  namespace: string
  path: string
}

// 命令参数类型
export interface CommandArgument {
  type: string
  value: unknown
}

// 命令 AST
export interface CommandAST {
  command: string
  raw: string
  arguments: CommandArgument[]
  parsed: boolean
  error?: { message: string; start: number; end: number }
}

// 工具函数
export function createCoordinate(value: number | string): Coordinate {
  if (typeof value === 'string') {
    if (value.startsWith('~')) return { type: 'relative', value: parseFloat(value.slice(1)) || 0 }
    if (value.startsWith('^')) return { type: 'local', value: parseFloat(value.slice(1)) || 0 }
    return { type: 'absolute', value: parseFloat(value) }
  }
  return { type: 'absolute', value }
}

export function createPosition(x: number | string, y: number | string, z: number | string): Position {
  return {
    x: createCoordinate(x),
    y: createCoordinate(y),
    z: createCoordinate(z)
  }
}

export function coordinateToString(coord: Coordinate): string {
  const prefix = coord.type === 'relative' ? '~' : coord.type === 'local' ? '^' : ''
  return `${prefix}${coord.value}`
}

export function positionToString(pos: Position): string {
  return `${coordinateToString(pos.x)} ${coordinateToString(pos.y)} ${coordinateToString(pos.z)}`
}

export function isValidSelector(input: string): boolean {
  return /^@[parse](\s|$|\[)/.test(input)
}

export function parseResourceLocation(input: string): ResourceLocation {
  if (input.includes(':')) {
    const [namespace, path] = input.split(':')
    return { namespace, path }
  }
  return { namespace: 'minecraft', path: input }
}
