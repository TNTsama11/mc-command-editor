/**
 * Minecraft 命令方块数据模型
 *
 * 本模块定义了命令方块编辑器所需的核心类型和工具函数。
 * 参考 Minecraft 1.20+ 命令方块的实际属性设计。
 */

import type { CommandAST, CommandBlockType, Position } from '../parser/ast'

// 从 parser/ast.ts 重用已定义的 CommandBlockType
export type { CommandBlockType } from '../parser/ast'

// ============================================================================
// 枚举类型定义
// ============================================================================

/**
 * 条件模式枚举
 * - unconditional: 无条件执行
 * - conditional: 仅在前一个方块成功执行时才执行
 */
export type ConditionMode = 'unconditional' | 'conditional'

/**
 * 方块朝向枚举
 * 定义命令方块的放置方向，影响命令执行和红石信号传播
 */
export type FacingDirection = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

// ============================================================================
// 接口定义
// ============================================================================

/**
 * 命令方块状态接口
 * 包含方块的运行时状态信息
 */
export interface CommandBlockState {
  /** 方块是否被红石信号激活 */
  powered: boolean
  /** 命令是否正在执行中 */
  executing: boolean
  /** 命令执行的成功次数（影响条件判断） */
  successCount: number
  /** 上次命令执行的输出信息 */
  lastOutput: string | null
  /** 命令执行的输出是否被追踪 */
  trackOutput: boolean
}

/**
 * 命令方块配置接口
 * 包含方块的可配置属性
 */
export interface CommandBlockConfig {
  /** 方块类型 */
  type: CommandBlockType
  /** 条件模式 */
  conditionMode: ConditionMode
  /** 是否始终激活（不需要红石信号） */
  alwaysActive: boolean
  /** 方块朝向 */
  facing: FacingDirection
}

/**
 * 单个命令方块数据结构
 * 表示编辑器中的一个命令方块实例
 */
export interface CommandBlock {
  /** 唯一标识符 */
  id: string
  /** 命令方块的配置 */
  config: CommandBlockConfig
  /** 命令内容（使用 CommandAST 类型支持解析后的命令） */
  command: CommandAST | null
  /** 在世界中的位置坐标 */
  position: Position
  /** 自定义显示名称（用于在编辑器中标识） */
  customName: string
  /** 备注信息（用于文档说明） */
  notes: string
  /** 运行时状态 */
  state: CommandBlockState
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

/**
 * 命令方块连接关系
 * 定义方块之间的执行顺序和依赖关系
 */
export interface CommandBlockConnection {
  /** 源方块 ID */
  sourceId: string
  /** 目标方块 ID */
  targetId: string
  /** 连接类型 */
  type: 'chain' | 'branch'
}

/**
 * 命令方块链数据结构
 * 表示一组有序连接的命令方块
 */
export interface CommandBlockChain {
  /** 链的唯一标识符 */
  id: string
  /** 链的名称 */
  name: string
  /** 链的描述 */
  description: string
  /** 链中包含的命令方块列表（按执行顺序） */
  blocks: CommandBlock[]
  /** 方块之间的连接关系 */
  connections: CommandBlockConnection[]
  /** 链的起始方块 ID（执行入口点） */
  entryBlockId: string | null
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

// ============================================================================
// 默认值常量
// ============================================================================

/**
 * 默认命令方块配置
 */
export const DEFAULT_CONFIG: CommandBlockConfig = {
  type: 'impulse',
  conditionMode: 'unconditional',
  alwaysActive: false,
  facing: 'south'
}

/**
 * 默认命令方块状态
 */
export const DEFAULT_STATE: CommandBlockState = {
  powered: false,
  executing: false,
  successCount: 0,
  lastOutput: null,
  trackOutput: true
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成唯一标识符
 * 使用时间戳和随机数组合确保唯一性
 */
function generateId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 创建新的命令方块
 *
 * @param position - 方块位置坐标
 * @param options - 可选的初始配置选项
 * @returns 新创建的命令方块实例
 *
 * @example
 * ```typescript
 * const block = createCommandBlock(
 *   { x: { type: 'absolute', value: 0 }, y: { type: 'absolute', value: 64 }, z: { type: 'absolute', value: 0 } },
 *   { type: 'chain', alwaysActive: true }
 * )
 * ```
 */
export function createCommandBlock(
  position: Position,
  options?: Partial<{
    type: CommandBlockType
    conditionMode: ConditionMode
    alwaysActive: boolean
    facing: FacingDirection
    customName: string
    notes: string
  }>
): CommandBlock {
  const now = Date.now()

  return {
    id: generateId(),
    config: {
      ...DEFAULT_CONFIG,
      ...options
    },
    command: null,
    position,
    customName: options?.customName ?? '',
    notes: options?.notes ?? '',
    state: { ...DEFAULT_STATE },
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 验证命令方块数据的有效性
 *
 * @param block - 要验证的命令方块
 * @returns 验证结果，包含是否有效和错误信息列表
 *
 * @example
 * ```typescript
 * const result = validateCommandBlock(block)
 * if (!result.valid) {
 *   console.error('验证失败:', result.errors)
 * }
 * ```
 */
export function validateCommandBlock(block: CommandBlock): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 验证 ID
  if (!block.id || typeof block.id !== 'string') {
    errors.push('命令方块必须有有效的 ID')
  }

  // 验证位置
  if (!block.position) {
    errors.push('命令方块必须有位置信息')
  } else {
    const { x, y, z } = block.position
    if (!x || !y || !z) {
      errors.push('命令方块的位置必须包含完整的 x, y, z 坐标')
    }
  }

  // 验证方块类型
  const validTypes: CommandBlockType[] = ['impulse', 'chain', 'repeat']
  if (!validTypes.includes(block.config.type)) {
    errors.push(`无效的命令方块类型: ${block.config.type}`)
  }

  // 验证条件模式
  const validConditions: ConditionMode[] = ['unconditional', 'conditional']
  if (!validConditions.includes(block.config.conditionMode)) {
    errors.push(`无效的条件模式: ${block.config.conditionMode}`)
  }

  // 验证朝向
  const validFacings: FacingDirection[] = ['north', 'south', 'east', 'west', 'up', 'down']
  if (!validFacings.includes(block.config.facing)) {
    errors.push(`无效的朝向: ${block.config.facing}`)
  }

  // 验证命令（如果存在）
  if (block.command && !block.command.parsed && block.command.error) {
    errors.push(`命令解析错误: ${block.command.error.message}`)
  }

  // 验证时间戳
  if (block.createdAt > block.updatedAt) {
    errors.push('创建时间不能晚于更新时间')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 创建新的命令方块链
 *
 * @param name - 链的名称
 * @param options - 可选的初始配置
 * @returns 新创建的命令方块链实例
 *
 * @example
 * ```typescript
 * const chain = createCommandBlockChain('自动农场控制系统')
 * chain.blocks.push(createCommandBlock(position))
 * ```
 */
export function createCommandBlockChain(
  name: string,
  options?: Partial<{
    description: string
    blocks: CommandBlock[]
    connections: CommandBlockConnection[]
  }>
): CommandBlockChain {
  const now = Date.now()

  return {
    id: `chain_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    description: options?.description ?? '',
    blocks: options?.blocks ?? [],
    connections: options?.connections ?? [],
    entryBlockId: null,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 验证命令方块链的有效性
 *
 * @param chain - 要验证的命令方块链
 * @returns 验证结果，包含是否有效和错误信息列表
 */
export function validateCommandBlockChain(chain: CommandBlockChain): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 验证 ID
  if (!chain.id || typeof chain.id !== 'string') {
    errors.push('命令方块链必须有有效的 ID')
  }

  // 验证名称
  if (!chain.name || chain.name.trim() === '') {
    errors.push('命令方块链必须有名称')
  }

  // 验证方块 ID 唯一性
  const blockIds = new Set<string>()
  for (const block of chain.blocks) {
    if (blockIds.has(block.id)) {
      errors.push(`重复的方块 ID: ${block.id}`)
    }
    blockIds.add(block.id)
  }

  // 验证连接关系的有效性
  for (const conn of chain.connections) {
    if (!blockIds.has(conn.sourceId)) {
      errors.push(`连接源方块不存在: ${conn.sourceId}`)
    }
    if (!blockIds.has(conn.targetId)) {
      errors.push(`连接目标方块不存在: ${conn.targetId}`)
    }
  }

  // 验证入口方块
  if (chain.entryBlockId && !blockIds.has(chain.entryBlockId)) {
    errors.push(`入口方块不存在: ${chain.entryBlockId}`)
  }

  // 验证每个方块
  for (const block of chain.blocks) {
    const blockValidation = validateCommandBlock(block)
    if (!blockValidation.valid) {
      errors.push(...blockValidation.errors.map(e => `方块 ${block.id}: ${e}`))
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 更新命令方块的命令内容
 *
 * @param block - 要更新的命令方块
 * @param command - 新的命令 AST
 * @returns 更新后的命令方块（新对象，不可变更新）
 */
export function updateCommandBlockCommand(
  block: CommandBlock,
  command: CommandAST | null
): CommandBlock {
  return {
    ...block,
    command,
    updatedAt: Date.now()
  }
}

/**
 * 更新命令方块的配置
 *
 * @param block - 要更新的命令方块
 * @param config - 部分配置更新
 * @returns 更新后的命令方块（新对象，不可变更新）
 */
export function updateCommandBlockConfig(
  block: CommandBlock,
  config: Partial<CommandBlockConfig>
): CommandBlock {
  return {
    ...block,
    config: {
      ...block.config,
      ...config
    },
    updatedAt: Date.now()
  }
}

/**
 * 向命令方块链添加方块
 *
 * @param chain - 目标命令方块链
 * @param block - 要添加的命令方块
 * @param connectToPrevious - 是否自动连接到前一个方块
 * @returns 更新后的命令方块链（新对象，不可变更新）
 */
export function addBlockToChain(
  chain: CommandBlockChain,
  block: CommandBlock,
  connectToPrevious: boolean = true
): CommandBlockChain {
  const newBlocks = [...chain.blocks, block]
  const newConnections = [...chain.connections]

  // 如果这是第一个方块，设置为入口
  const newEntryBlockId = chain.blocks.length === 0 ? block.id : chain.entryBlockId

  // 自动连接到前一个方块
  if (connectToPrevious && chain.blocks.length > 0) {
    const previousBlock = chain.blocks[chain.blocks.length - 1]
    newConnections.push({
      sourceId: previousBlock.id,
      targetId: block.id,
      type: 'chain'
    })
  }

  return {
    ...chain,
    blocks: newBlocks,
    connections: newConnections,
    entryBlockId: newEntryBlockId,
    updatedAt: Date.now()
  }
}
