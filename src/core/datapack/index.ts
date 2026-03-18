/**
 * 数据包模块
 *
 * 本模块提供 Minecraft 数据包的创建、编辑和导出功能。
 *
 * @example
 * ```typescript
 * import {
 *   createDatapack,
 *   createNamespace,
 *   createFunctionFile,
 *   addNamespaceToDatapack,
 *   addFunctionToNamespace
 * } from '@/core/datapack'
 *
 * // 创建数据包
 * const datapack = createDatapack({
 *   name: 'My Datapack',
 *   description: 'A custom datapack',
 *   packFormat: 48
 * })
 *
 * // 创建命名空间
 * const namespace = createNamespace('my_pack', 'My custom namespace')
 *
 * // 创建函数文件
 * const mainFunc = createFunctionFile('main', {
 *   description: 'Main function',
 *   commands: [
 *     createCommandLine('say Hello World!'),
 *     createCommandLine('This is a comment', true)
 *   ]
 * })
 *
 * // 添加函数到命名空间
 * const updatedNs = addFunctionToNamespace(namespace, mainFunc)
 *
 * // 添加命名空间到数据包
 * const updatedDatapack = addNamespaceToDatapack(datapack, updatedNs)
 * ```
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  NamespaceName,
  FunctionFileName,
  TagType,
  PackFormat,
  PackMeta,
  PackMcmeta,
  CommandLine,
  FunctionFile,
  TagEntry,
  TagFile,
  Namespace,
  DatapackConfig,
  Datapack,
  ZipExportOptions,
  ExportResult,
  ValidationSeverity,
  ValidationIssue,
  ValidationResult,
  FileNode,
  DatapackStats
} from './types'

// ============================================================================
// 常量导出
// ============================================================================

export {
  PACK_FORMATS,
  DEFAULT_DATAPACK_CONFIG
} from './types'

// ============================================================================
// 工具函数导出
// ============================================================================

export {
  // 验证函数
  isValidNamespaceName,
  isValidResourcePath,

  // 创建函数
  createPackMcmeta,
  createNamespace,
  createFunctionFile,
  createCommandLine,
  createTagFile,
  createDatapack,

  // 更新函数
  addNamespaceToDatapack,
  addFunctionToNamespace,
  updateFunctionCommands,

  // 转换函数
  functionToMcfunction,
  tagToJson,
  packMcmetaToJson,

  // 验证和统计
  validateDatapack,
  getDatapackFileTree,
  getDatapackStats
} from './types'

// ============================================================================
// 函数生成器导出
// ============================================================================

export {
  // 类型
  type FunctionGeneratorOptions,
  type CommandEntry,
  type FunctionGeneratorResult,

  // 常量
  MCFUNCTION_EXTENSION,

  // 工具函数
  stripSlash,
  formatComment,
  isValidCommand,
  getFunctionGenerator,
  generateMcfunction,
  generateMcfunctionFromCommands,
  generateMcfunctionFromStrings,
  parseMcfunction,

  // 类
  FunctionGenerator
} from './functionGenerator'

// ============================================================================
// ZIP 打包器导出
// ============================================================================

export {
  ZipPackager,
  packAndDownload,
  packToBlob,
  packToArrayBuffer
} from './zipPackager'

// ============================================================================
// pack.mcmeta 生成器导出
// ============================================================================

export {
  // 类型
  type PackMcmetaOptions,
  type JsonSerializeOptions,

  // 常量
  PACK_FORMAT_VERSIONS,
  DEFAULT_PACK_FORMAT,
  DEFAULT_DESCRIPTION,

  // 验证函数
  isValidPackFormat,
  isValidDescription,
  isValidNamespace,
  isValidPath,

  // 创建函数
  createPackMcmetaContent,
  createDefaultPackMcmeta,

  // 序列化函数
  generatePackMcmetaJson,
  generatePackMcmeta,

  // 解析函数
  parsePackMcmeta,

  // 工具函数
  getMinecraftVersion,
  updatePackFormat,
  updateDescription
} from './packMeta'

// ============================================================================
// 标签生成器导出
// ============================================================================

export {
  // 类
  TagGenerator,
  TagBuilder,
  // 类型
  type TagGeneratorOptions,
  type TagBuilderOptions,
  type TagJsonStructure,
  type GeneratedTagFile,
  type TagValidationError,
  // 常量
  SUPPORTED_TAG_TYPES,
  TAG_TYPE_DIRECTORIES,
  // 工具函数
  isValidResourceId,
  parseResourceId,
  buildResourceId,
  getTagFilePath,
  // 便捷函数
  generateFunctionTagJson,
  generateItemTagJson,
  createTagBuilder
} from './tagGenerator'
