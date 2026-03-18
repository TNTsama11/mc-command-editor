/**
 * Minecraft 命令方块链导出器
 *
 * 将 CommandBlockChain 导出为 Minecraft 结构文件格式 (.nbt)
 * 支持 Minecraft 1.20+ 版本
 *
 * @module exporter
 */

import { writeUncompressed } from 'prismarine-nbt'
import type { CommandBlockChain, CommandBlock, FacingDirection } from './types'
import type { CommandBlockType } from '../parser/ast'

// ============================================================================
// 类型定义
// ============================================================================

/** 导出选项 */
export interface ExportOptions {
  /** 结构名称（用于文件名） */
  name?: string
  /** 是否包含空气方块（默认 false） */
  includeAir?: boolean
  /** 作者名称 */
  author?: string
  /** 导出版本（默认 1.20） */
  version?: '1.20' | '1.21'
}

/** 导出结果 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean
  /** 文件名 */
  filename: string
  /** 文件数据（ArrayBuffer） */
  data: ArrayBuffer | null
  /** 错误信息 */
  error?: string
}

/** NBT 标签类型 */
type NBTValue =
  | string
  | number
  | boolean
  | NBTValue[]
  | { [key: string]: NBTValue }
  | null

/** NBT Compound 类型 */
interface NBTCompound {
  [key: string]: NBTValue
}

// ============================================================================
// 常量
// ============================================================================

/** 命令方块方块 ID 映射 */
const COMMAND_BLOCK_IDS: Record<CommandBlockType, string> = {
  impulse: 'minecraft:command_block',
  chain: 'minecraft:chain_command_block',
  repeat: 'minecraft:repeating_command_block'
}

/** 方向到 facing 值映射 */
const FACING_TO_STRING: Record<FacingDirection, string> = {
  north: 'north',
  south: 'south',
  east: 'east',
  west: 'west',
  up: 'up',
  down: 'down'
}

/** 结构文件版本 */
const STRUCTURE_VERSION: number[] = [1, 20, 0]

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取坐标转换为相对位置
 * 注意: index 参数是传入但在此未使用，是留给未来扩展使用
 */
function getBlockPosition(_block: CommandBlock, index: number): [number, number, number] {
  // 使用索引计算相对位置，保持方块在同一水平线上
  // 未来可以根据 block.position 计算实际位置
  return [index, 0, 0]
}

/**
 * 获取命令字符串
 */
function getCommandString(block: CommandBlock): string {
  if (!block.command) return ''
  if (block.command.raw) return block.command.raw

  // 如果没有原始命令，尝试从 AST 重建
  if (block.command.command) {
    let cmd = block.command.command
    if (block.command.arguments) {
      for (const arg of block.command.arguments) {
        cmd += ' ' + (typeof arg.value === 'string' ? arg.value : JSON.stringify(arg.value))
      }
    }
    return '/' + cmd
  }

  return ''
}

/**
 * 构建命令方块的 NBT 数据
 */
function buildCommandBlockNBT(block: CommandBlock): NBTCompound {
  const nbt: NBTCompound = {
    Command: getCommandString(block),
    auto: block.config.alwaysActive ? 1 : 0,
    conditionMet: block.config.conditionMode === 'conditional' ? 1 : 0,
    CustomName: block.customName || '@',
    LastExecution: 0,
    LastOutput: '',
    SuccessCount: block.state.successCount,
    TrackOutput: block.state.trackOutput ? 1 : 0,
    UpdateLastExecution: 1
  }

  return nbt
}

/**
 * 构建方块状态
 */
function buildBlockState(block: CommandBlock): NBTCompound {
  return {
    Name: COMMAND_BLOCK_IDS[block.config.type],
    Properties: {
      conditional: block.config.conditionMode === 'conditional' ? 'true' : 'false',
      facing: FACING_TO_STRING[block.config.facing]
    }
  }
}

/**
 * 查找或创建调色板索引
 */
function findOrCreatePaletteIndex(
  palette: NBTCompound[],
  blockState: NBTCompound
): number {
  const stateKey = JSON.stringify(blockState)
  const existingIndex = palette.findIndex(p => JSON.stringify(p) === stateKey)

  if (existingIndex >= 0) {
    return existingIndex
  }

  palette.push(blockState)
  return palette.length - 1
}

/**
 * 构建 NBT 标签结构
 */
function buildStructureNBT(
  chain: CommandBlockChain,
  _options: ExportOptions
): NBTCompound {
  const palette: NBTCompound[] = []
  const blocks: NBTCompound[] = []

  // 计算结构大小
  const sizeX = Math.max(chain.blocks.length, 1)
  const sizeY = 1
  const sizeZ = 1

  // 构建方块列表
  for (let i = 0; i < chain.blocks.length; i++) {
    const block = chain.blocks[i]
    const [x, y, z] = getBlockPosition(block, i)
    const blockState = buildBlockState(block)
    const paletteIndex = findOrCreatePaletteIndex(palette, blockState)
    const blockNBT = buildCommandBlockNBT(block)

    blocks.push({
      pos: [x, y, z],
      state: paletteIndex,
      nbt: blockNBT
    })
  }

  // 构建完整的结构 NBT
  const structure: NBTCompound = {
    DataVersion: 3465, // 1.20.4 data version
    size: [sizeX, sizeY, sizeZ],
    palette,
    blocks,
    entities: [],
    // 结构元数据
    Author: 'MC Command Visual Editor',
    Version: STRUCTURE_VERSION
  }

  return structure
}

/**
 * 将 NBT Compound 转换为 prismarine-nbt 格式
 */
function convertToPrismarineNBT(data: NBTCompound): unknown {
  // prismarine-nbt 期望的类型格式
  const convert = (value: NBTValue): unknown => {
    if (value === null) return null
    if (typeof value === 'string') return value
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value ? 1 : 0

    if (Array.isArray(value)) {
      return value.map(convert)
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) {
        result[k] = convert(v)
      }
      return result
    }

    return value
  }

  return convert(data)
}

// ============================================================================
// 主函数
// ============================================================================

/**
 * 将命令方块链导出为 Minecraft 结构文件
 *
 * @param chain - 要导出的命令方块链
 * @param options - 导出选项
 * @returns 导出结果
 *
 * @example
 * ```typescript
 * const chain = createCommandBlockChain('我的命令链')
 * // ... 添加方块 ...
 *
 * const result = await exportToStructure(chain, { name: 'my-chain' })
 * if (result.success && result.data) {
 *   // 下载文件
 *   downloadFile(result.filename, result.data)
 * }
 * ```
 */
export async function exportToStructure(
  chain: CommandBlockChain,
  options: ExportOptions = {}
): Promise<ExportResult> {
  try {
    // 验证链
    if (!chain.blocks || chain.blocks.length === 0) {
      return {
        success: false,
        filename: '',
        data: null,
        error: '命令方块链为空，无法导出'
      }
    }

    // 构建 NBT 结构
    const structureNBT = buildStructureNBT(chain, options)
    const prismarineData = convertToPrismarineNBT(structureNBT)

    // 使用 prismarine-nbt 写入
    const nbtData = {
      type: 'compound',
      name: '',
      value: prismarineData as Record<string, unknown>
    }

    // 写入为未压缩的 NBT 数据
    const buffer = await writeUncompressed(nbtData as unknown as Parameters<typeof writeUncompressed>[0])

    // 转换为 ArrayBuffer
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )

    // 生成文件名
    const sanitizedName = (options.name || chain.name || 'command-chain')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase()
    const filename = `${sanitizedName}.nbt`

    return {
      success: true,
      filename,
      data: arrayBuffer
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      filename: '',
      data: null,
      error: `导出失败: ${message}`
    }
  }
}

/**
 * 下载导出的文件
 *
 * @param filename - 文件名
 * @param data - 文件数据
 */
export function downloadExportedFile(filename: string, data: ArrayBuffer): void {
  const blob = new Blob([data], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * 导出为函数文件 (.mcfunction) 格式
 *
 * @param chain - 要导出的命令方块链
 * @param options - 导出选项
 * @returns 导出结果
 */
export function exportToMcFunction(
  chain: CommandBlockChain,
  options: ExportOptions = {}
): ExportResult {
  try {
    if (!chain.blocks || chain.blocks.length === 0) {
      return {
        success: false,
        filename: '',
        data: null,
        error: '命令方块链为空，无法导出'
      }
    }

    const lines: string[] = []

    // 添加文件头注释
    lines.push(`# Generated by MC Command Visual Editor`)
    lines.push(`# Chain: ${chain.name}`)
    if (chain.description) {
      lines.push(`# Description: ${chain.description}`)
    }
    lines.push('')

    // 添加每个命令
    for (let i = 0; i < chain.blocks.length; i++) {
      const block = chain.blocks[i]

      // 添加方块信息注释
      lines.push(`# Block ${i + 1}: ${block.config.type}${block.config.conditionMode === 'conditional' ? ' (conditional)' : ''}`)
      if (block.customName) {
        lines.push(`# Name: ${block.customName}`)
      }

      // 添加命令
      const command = getCommandString(block)
      if (command) {
        lines.push(command)
      } else {
        lines.push('# (no command)')
      }
      lines.push('')
    }

    // 转换为文本
    const content = lines.join('\n')
    const encoder = new TextEncoder()
    const data = encoder.encode(content).buffer

    // 生成文件名
    const sanitizedName = (options.name || chain.name || 'commands')
      .replace(/[^a-z0-9_]/g, '_')
      .toLowerCase()
    const filename = `${sanitizedName}.mcfunction`

    return {
      success: true,
      filename,
      data
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      filename: '',
      data: null,
      error: `导出失败: ${message}`
    }
  }
}

/**
 * 批量导出多个格式
 *
 * @param chain - 要导出的命令方块链
 * @param formats - 要导出的格式列表
 * @param options - 导出选项
 * @returns 导出结果数组
 */
export async function exportMultipleFormats(
  chain: CommandBlockChain,
  formats: ('nbt' | 'mcfunction')[],
  options: ExportOptions = {}
): Promise<ExportResult[]> {
  const results: ExportResult[] = []

  for (const format of formats) {
    if (format === 'nbt') {
      results.push(await exportToStructure(chain, options))
    } else if (format === 'mcfunction') {
      results.push(exportToMcFunction(chain, options))
    }
  }

  return results
}
