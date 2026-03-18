/**
 * 命令方块模块
 *
 * 提供 Minecraft 命令方块的数据模型和操作工具
 */

// 类型导出
export type {
  CommandBlockType,
  ConditionMode,
  FacingDirection,
  CommandBlockState,
  CommandBlockConfig,
  CommandBlock,
  CommandBlockConnection,
  CommandBlockChain
} from './types'

// 常量导出
export { DEFAULT_CONFIG, DEFAULT_STATE } from './types'

// 工具函数导出
export {
  createCommandBlock,
  validateCommandBlock,
  createCommandBlockChain,
  validateCommandBlockChain,
  updateCommandBlockCommand,
  updateCommandBlockConfig,
  addBlockToChain
} from './types'

// 导出器导出
export {
  exportToStructure,
  exportToMcFunction,
  downloadExportedFile,
  exportMultipleFormats,
  type ExportOptions,
  type ExportResult
} from './exporter'
