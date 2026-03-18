/**
 * Minecraft 命令类型定义
 *
 * 定义各种命令的结构和参数
 */

import type { CommandAST, CommandArgument, Position, Target, ResourceLocation, NBTCompound } from './ast'

// ============================================================================
// 基础命令接口
// ============================================================================

/** 命令类型枚举 */
export enum CommandType {
  // 基础命令
  GIVE = 'give',
  CLEAR = 'clear',
  KILL = 'kill',
  TP = 'tp',
  TELEPORT = 'teleport',

  // 方块操作
  SETBLOCK = 'setblock',
  FILL = 'fill',
  CLONE = 'clone',

  // 实体操作
  SUMMON = 'summon',
  EFFECT = 'effect',

  // 条件执行
  EXECUTE = 'execute',

  // 数据操作
  DATA = 'data',
  SCOREBOARD = 'scoreboard',
  TAG = 'tag',

  // 游戏设置
  GAMEMODE = 'gamemode',
  GAMERULE = 'gamerule',
  TIME = 'time',
  WEATHER = 'weather',
  DIFFICULTY = 'difficulty',

  // 玩家操作
  XP = 'xp',
  ENCHANT = 'enchant',

  // 世界操作
  LOCATE = 'locate',
  SPREADPLAYERS = 'spreadplayers',
  WORLDBORDER = 'worldborder',

  // 消息
  TELL = 'tell',
  TELLRAW = 'tellraw',
  TITLE = 'title',
  SAY = 'say',

  // 函数和标签
  FUNCTION = 'function',
}

// ============================================================================
// 命令参数构建器
// ============================================================================

export function createEntityArgument(value: Target | Target[]): CommandArgument {
  return { type: 'entity', value }
}

export function createPositionArgument(value: Position): CommandArgument {
  return { type: 'position', value }
}

export function createResourceArgument(value: ResourceLocation): CommandArgument {
  return { type: 'resource', value }
}

export function createNumberArgument(value: number): CommandArgument {
  return { type: 'number', value }
}

export function createStringArgument(value: string): CommandArgument {
  return { type: 'string', value }
}

export function createBooleanArgument(value: boolean): CommandArgument {
  return { type: 'boolean', value }
}

export function createNBTArgument(value: NBTCompound): CommandArgument {
  return { type: 'nbt', value }
}

// ============================================================================
// 命令定义
// ============================================================================

/** /give 命令参数 */
export interface GiveCommandParams {
  targets: Target | Target[]
  item: ResourceLocation
  count?: number
  nbt?: NBTCompound
}

/** /summon 命令参数 */
export interface SummonCommandParams {
  entity: ResourceLocation
  pos?: Position
  nbt?: NBTCompound
}

/** /tp 命令参数 */
export interface TeleportCommandParams {
  targets: Target | Target[]
  destination: Position | Target
  facing?: Position | Target
}

/** /fill 命令参数 */
export interface FillCommandParams {
  from: Position
  to: Position
  block: ResourceLocation
  mode?: 'destroy' | 'keep' | 'replace' | 'hollow' | 'outline'
  nbt?: NBTCompound
}

/** /setblock 命令参数 */
export interface SetblockCommandParams {
  pos: Position
  block: ResourceLocation
  mode?: 'destroy' | 'keep' | 'replace'
  nbt?: NBTCompound
}

/** /execute 子命令 */
export type ExecuteSubcommandType =
  | 'as' | 'at' | 'positioned' | 'align' | 'facing' | 'rotated'
  | 'in' | 'anchored' | 'if' | 'unless' | 'store' | 'run'

export interface ExecuteSubcommand {
  type: ExecuteSubcommandType
  args: CommandArgument[]
}

/** /execute 命令参数 */
export interface ExecuteCommandParams {
  subcommands: ExecuteSubcommand[]
  run?: CommandAST
}

/** /effect 命令参数 */
export interface EffectCommandParams {
  action: 'give' | 'clear'
  entity: Target | Target[]
  effect?: ResourceLocation
  seconds?: number
  amplifier?: number
  hideParticles?: boolean
}

/** /gamemode 命令参数 */
export interface GamemodeCommandParams {
  mode: 'survival' | 'creative' | 'adventure' | 'spectator'
  target?: Target
}

/** /kill 命令参数 */
export interface KillCommandParams {
  targets?: Target | Target[]
}

/** /clear 命令参数 */
export interface ClearCommandParams {
  targets?: Target | Target[]
  item?: ResourceLocation
  maxCount?: number
}

/** /data 命令参数 */
export interface DataCommandParams {
  action: 'get' | 'set' | 'merge' | 'remove' | 'modify'
  target: 'block' | 'entity' | 'storage'
  targetPos: Position | Target
  path?: string
  value?: unknown
}

/** /scoreboard 命令参数 */
export interface ScoreboardCommandParams {
  objectType: 'objectives' | 'players'
  action: string
  args: CommandArgument[]
}

// ============================================================================
// 命令注册表
// ============================================================================

/** 命令定义 */
export interface CommandDefinition {
  name: string
  aliases?: string[]
  description: string
  permission?: string
  parameters: CommandParameterDefinition[]
}

/** 参数定义 */
export interface CommandParameterDefinition {
  name: string
  type: string
  required: boolean
  description?: string
  defaultValue?: unknown
  options?: string[]
}

/** 命令注册表 */
export const COMMAND_REGISTRY: Record<string, CommandDefinition> = {
  give: {
    name: 'give',
    description: 'Give items to players',
    parameters: [
      { name: 'targets', type: 'entity', required: true, description: 'Target players' },
      { name: 'item', type: 'resource', required: true, description: 'Item to give' },
      { name: 'count', type: 'integer', required: false, defaultValue: 1, description: 'Number of items' },
    ],
  },

  summon: {
    name: 'summon',
    description: 'Summon an entity',
    parameters: [
      { name: 'entity', type: 'resource', required: true, description: 'Entity type to summon' },
      { name: 'pos', type: 'position', required: false, description: 'Position to summon at' },
    ],
  },

  tp: {
    name: 'tp',
    aliases: ['teleport'],
    description: 'Teleport entities',
    parameters: [
      { name: 'targets', type: 'entity', required: true, description: 'Entities to teleport' },
      { name: 'destination', type: 'position_or_entity', required: true, description: 'Destination' },
    ],
  },

  fill: {
    name: 'fill',
    description: 'Fill a region with blocks',
    parameters: [
      { name: 'from', type: 'position', required: true, description: 'Start position' },
      { name: 'to', type: 'position', required: true, description: 'End position' },
      { name: 'block', type: 'resource', required: true, description: 'Block to fill with' },
      {
        name: 'mode',
        type: 'string',
        required: false,
        options: ['destroy', 'keep', 'replace', 'hollow', 'outline'],
        description: 'Fill mode'
      },
    ],
  },

  setblock: {
    name: 'setblock',
    description: 'Set a single block',
    parameters: [
      { name: 'pos', type: 'position', required: true, description: 'Block position' },
      { name: 'block', type: 'resource', required: true, description: 'Block type' },
      {
        name: 'mode',
        type: 'string',
        required: false,
        options: ['destroy', 'keep', 'replace'],
        description: 'Set mode'
      },
    ],
  },

  kill: {
    name: 'kill',
    description: 'Kill entities',
    parameters: [
      { name: 'targets', type: 'entity', required: false, defaultValue: '@s', description: 'Targets to kill' },
    ],
  },

  clear: {
    name: 'clear',
    description: 'Clear items from players',
    parameters: [
      { name: 'targets', type: 'entity', required: false, description: 'Target players' },
      { name: 'item', type: 'resource', required: false, description: 'Item to clear' },
      { name: 'maxCount', type: 'integer', required: false, description: 'Maximum items to clear' },
    ],
  },

  gamemode: {
    name: 'gamemode',
    description: 'Set game mode',
    parameters: [
      {
        name: 'mode',
        type: 'string',
        required: true,
        options: ['survival', 'creative', 'adventure', 'spectator'],
        description: 'Game mode'
      },
      { name: 'target', type: 'entity', required: false, description: 'Target player' },
    ],
  },

  effect: {
    name: 'effect',
    description: 'Give or remove effects',
    parameters: [
      {
        name: 'action',
        type: 'string',
        required: true,
        options: ['give', 'clear'],
        description: 'Effect action'
      },
      { name: 'entity', type: 'entity', required: true, description: 'Target entity' },
      { name: 'effect', type: 'resource', required: false, description: 'Effect type' },
      { name: 'seconds', type: 'integer', required: false, description: 'Duration' },
      { name: 'amplifier', type: 'integer', required: false, description: 'Effect amplifier' },
    ],
  },

  execute: {
    name: 'execute',
    description: 'Execute commands with conditions',
    parameters: [
      { name: 'subcommands', type: 'execute_subcommand', required: true, description: 'Execute subcommands' },
      { name: 'run', type: 'command', required: false, description: 'Command to run' },
    ],
  },
}

/** 获取命令定义 */
export function getCommandDefinition(name: string): CommandDefinition | undefined {
  // 检查主名称
  if (COMMAND_REGISTRY[name]) {
    return COMMAND_REGISTRY[name]
  }

  // 检查别名
  for (const def of Object.values(COMMAND_REGISTRY)) {
    if (def.aliases?.includes(name)) {
      return def
    }
  }

  return undefined
}

/** 检查命令是否存在 */
export function isKnownCommand(name: string): boolean {
  return getCommandDefinition(name) !== undefined
}
