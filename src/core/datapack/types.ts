/**
 * Minecraft 数据包数据模型
 *
 * 本模块定义了 Minecraft 数据包编辑器所需的核心类型和工具函数。
 * 参考 Minecraft 1.20+ 数据包格式规范设计。
 *
 * 数据包结构参考:
 * https://minecraft.wiki/w/Data_pack
 */

import type { CommandAST } from '../parser/ast'

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 命名空间名称
 * 必须符合 Minecraft 命名空间规范：小写字母、数字、下划线、连字符、点
 */
export type NamespaceName = string

/**
 * 函数文件名称
 * 必须符合资源路径规范
 */
export type FunctionFileName = string

/**
 * 标签类型
 */
export type TagType = 'blocks' | 'entity_types' | 'fluids' | 'functions' | 'game_events' | 'items'

/**
 * 数据包格式版本
 * 不同版本的 Minecraft 支持的数据包格式版本不同
 */
export type PackFormat = number

// ============================================================================
// pack.mcmeta 元数据接口
// ============================================================================

/**
 * pack.mcmeta 中的 pack 字段
 */
export interface PackMeta {
  /** 数据包格式版本号 */
  pack_format: PackFormat
  /** 数据包描述文本（支持 JSON 文本组件） */
  description: string
  /** 可选：支持的 Minecraft 版本范围（1.20.2+） */
  supported_formats?: {
    /** 最小格式版本 */
    min_inclusive: PackFormat
    /** 最大格式版本 */
    max_inclusive: PackFormat
  }
}

/**
 * pack.mcmeta 完整结构
 */
export interface PackMcmeta {
  pack: PackMeta
  /** 可选过滤器，用于隐藏特定内容 */
  filter?: {
    block: Array<{
      namespace: string
      path: string
    }>
  }
  /** 可选：覆盖目录（1.21+） */
  overlays?: {
    entries: Array<{
      /** 覆盖格式版本范围 */
      formats: {
        min_inclusive: PackFormat
        max_inclusive: PackFormat
      }
      /** 覆盖目录名 */
      directory: string
    }>
  }
}

// ============================================================================
// 函数文件接口
// ============================================================================

/**
 * 单行命令
 */
export interface CommandLine {
  /** 唯一标识符 */
  id: string
  /** 命令内容（不含斜杠） */
  command: string
  /** 解析后的命令 AST（可选） */
  ast?: CommandAST
  /** 是否为注释行（以 # 开头） */
  isComment: boolean
  /** 原始文本（保留格式，包括注释） */
  rawText: string
}

/**
 * 函数文件结构
 * 对应 .mcfunction 文件
 */
export interface FunctionFile {
  /** 唯一标识符 */
  id: string
  /** 函数文件名（不含扩展名） */
  name: FunctionFileName
  /** 命令行列表 */
  commands: CommandLine[]
  /** 函数描述 */
  description: string
  /** 标签列表 */
  tags: string[]
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

// ============================================================================
// 标签文件接口
// ============================================================================

/**
 * 标签条目
 */
export type TagEntry = string | {
  /** 必须为 true 才会被包含（可选） */
  id: string
  required?: boolean
}

/**
 * 标签文件结构
 * 对应 tags/<type>/<name>.json 文件
 */
export interface TagFile {
  /** 唯一标识符 */
  id: string
  /** 标签名称 */
  name: string
  /** 标签类型 */
  type: TagType
  /** 标签条目列表 */
  values: TagEntry[]
  /** 是否替换现有标签（replace 字段） */
  replace?: boolean
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

// ============================================================================
// 命名空间接口
// ============================================================================

/**
 * 命名空间结构
 * 对应数据包中的 <namespace>/ 目录
 */
export interface Namespace {
  /** 命名空间名称（必须符合 Minecraft 命名规范） */
  name: NamespaceName
  /** 函数文件映射（文件名 -> 函数对象） */
  functions: Map<FunctionFileName, FunctionFile>
  /** 标签文件映射（标签类型 -> 标签名 -> 标签对象） */
  tags: Map<TagType, Map<string, TagFile>>
  /** 命名空间描述 */
  description: string
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

// ============================================================================
// 数据包接口
// ============================================================================

/**
 * 数据包配置
 */
export interface DatapackConfig {
  /** 数据包名称 */
  name: string
  /** 数据包描述 */
  description: string
  /** 数据包格式版本 */
  packFormat: PackFormat
  /** 作者列表 */
  authors?: string[]
  /** 项目网址 */
  url?: string
  /** 版本号 */
  version?: string
  /** 是否启用压缩 */
  compress?: boolean
}

/**
 * 数据包结构
 * 表示一个完整的 Minecraft 数据包
 */
export interface Datapack {
  /** 唯一标识符 */
  id: string
  /** 数据包配置 */
  config: DatapackConfig
  /** pack.mcmeta 内容 */
  packMeta: PackMcmeta
  /** 命名空间映射（命名空间名 -> 命名空间对象） */
  namespaces: Map<NamespaceName, Namespace>
  /** 数据包图标（base64 或 null） */
  icon: string | null
  /** 创建时间戳 */
  createdAt: number
  /** 最后更新时间戳 */
  updatedAt: number
}

// ============================================================================
// 导出配置接口
// ============================================================================

/**
 * ZIP 导出选项
 */
export interface ZipExportOptions {
  /** 是否压缩（默认 true） */
  compress?: boolean
  /** 压缩级别（0-9） */
  compressionLevel?: number
  /** 是否包含 pack.png 图标 */
  includeIcon?: boolean
  /** 是否美化 JSON 输出 */
  prettyPrintJson?: boolean
  /** 文件编码 */
  encoding?: string
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 是否成功 */
  success: boolean
  /** 导出的文件名 */
  filename: string
  /** 文件大小（字节） */
  size: number
  /** Blob 对象（浏览器环境） */
  blob?: Blob
  /** ArrayBuffer（Node.js 环境） */
  buffer?: ArrayBuffer
  /** 错误信息（失败时） */
  error?: string
}

// ============================================================================
// 验证结果接口
// ============================================================================

/**
 * 验证问题级别
 */
export type ValidationSeverity = 'error' | 'warning' | 'info'

/**
 * 验证问题
 */
export interface ValidationIssue {
  /** 问题级别 */
  severity: ValidationSeverity
  /** 问题代码 */
  code: string
  /** 问题描述 */
  message: string
  /** 相关文件路径 */
  path?: string
  /** 相关行号 */
  line?: number
  /** 修复建议 */
  suggestion?: string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效（无错误） */
  valid: boolean
  /** 所有问题列表 */
  issues: ValidationIssue[]
  /** 错误数量 */
  errorCount: number
  /** 警告数量 */
  warningCount: number
  /** 信息数量 */
  infoCount: number
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 常用的数据包格式版本
 */
export const PACK_FORMATS = {
  /** 1.17 */
  FORMAT_1_17: 6,
  /** 1.18-1.18.2 */
  FORMAT_1_18: 8,
  /** 1.19-1.19.3 */
  FORMAT_1_19: 10,
  /** 1.19.4 */
  FORMAT_1_19_4: 12,
  /** 1.20-1.20.1 */
  FORMAT_1_20: 15,
  /** 1.20.2 */
  FORMAT_1_20_2: 18,
  /** 1.20.3-1.20.4 */
  FORMAT_1_20_3: 26,
  /** 1.20.5-1.20.6 */
  FORMAT_1_20_5: 41,
  /** 1.21 */
  FORMAT_1_21: 48,
  /** 推荐使用的最新稳定版本 */
  LATEST: 48
} as const

/**
 * 默认数据包配置
 */
export const DEFAULT_DATAPACK_CONFIG: DatapackConfig = {
  name: 'Untitled Datapack',
  description: 'A Minecraft datapack',
  packFormat: PACK_FORMATS.LATEST,
  authors: [],
  compress: true
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成唯一标识符
 */
function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 验证命名空间名称
 * 命名空间只能包含小写字母、数字、下划线、连字符、点
 */
export function isValidNamespaceName(name: string): boolean {
  return /^[a-z0-9_.-]+$/.test(name)
}

/**
 * 验证资源路径名称
 * 路径只能包含小写字母、数字、下划线、连字符、点、正斜杠
 */
export function isValidResourcePath(path: string): boolean {
  return /^[a-z0-9_./-]+$/.test(path)
}

/**
 * 创建默认的 pack.mcmeta
 */
export function createPackMcmeta(config: DatapackConfig): PackMcmeta {
  return {
    pack: {
      pack_format: config.packFormat,
      description: config.description
    }
  }
}

/**
 * 创建新的命名空间
 */
export function createNamespace(name: string, description: string = ''): Namespace {
  if (!isValidNamespaceName(name)) {
    throw new Error(`Invalid namespace name: ${name}. Must contain only lowercase letters, numbers, underscores, hyphens, and dots.`)
  }

  const now = Date.now()
  return {
    name,
    functions: new Map(),
    tags: new Map(),
    description,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 创建新的函数文件
 */
export function createFunctionFile(
  name: string,
  options?: {
    commands?: CommandLine[]
    description?: string
    tags?: string[]
  }
): FunctionFile {
  if (!isValidResourcePath(name)) {
    throw new Error(`Invalid function name: ${name}. Must contain only lowercase letters, numbers, underscores, hyphens, dots, and slashes.`)
  }

  const now = Date.now()
  return {
    id: generateId('func'),
    name,
    commands: options?.commands ?? [],
    description: options?.description ?? '',
    tags: options?.tags ?? [],
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 创建新的命令行
 */
export function createCommandLine(command: string, isComment: boolean = false): CommandLine {
  return {
    id: generateId('cmd'),
    command: isComment ? '' : command,
    isComment,
    rawText: isComment ? `# ${command}` : command
  }
}

/**
 * 创建新的标签文件
 */
export function createTagFile(
  name: string,
  type: TagType,
  values: TagEntry[] = []
): TagFile {
  if (!isValidResourcePath(name)) {
    throw new Error(`Invalid tag name: ${name}`)
  }

  const now = Date.now()
  return {
    id: generateId('tag'),
    name,
    type,
    values,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 创建新的数据包
 */
export function createDatapack(config: Partial<DatapackConfig> = {}): Datapack {
  const fullConfig: DatapackConfig = {
    ...DEFAULT_DATAPACK_CONFIG,
    ...config
  }

  const now = Date.now()
  return {
    id: generateId('dp'),
    config: fullConfig,
    packMeta: createPackMcmeta(fullConfig),
    namespaces: new Map(),
    icon: null,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 向数据包添加命名空间
 */
export function addNamespaceToDatapack(datapack: Datapack, namespace: Namespace): Datapack {
  if (datapack.namespaces.has(namespace.name)) {
    throw new Error(`Namespace already exists: ${namespace.name}`)
  }

  const newNamespaces = new Map(datapack.namespaces)
  newNamespaces.set(namespace.name, namespace)

  return {
    ...datapack,
    namespaces: newNamespaces,
    updatedAt: Date.now()
  }
}

/**
 * 向命名空间添加函数文件
 */
export function addFunctionToNamespace(
  namespace: Namespace,
  func: FunctionFile
): Namespace {
  if (namespace.functions.has(func.name)) {
    throw new Error(`Function already exists in namespace ${namespace.name}: ${func.name}`)
  }

  const newFunctions = new Map(namespace.functions)
  newFunctions.set(func.name, func)

  return {
    ...namespace,
    functions: newFunctions,
    updatedAt: Date.now()
  }
}

/**
 * 更新函数文件中的命令
 */
export function updateFunctionCommands(
  func: FunctionFile,
  commands: CommandLine[]
): FunctionFile {
  return {
    ...func,
    commands,
    updatedAt: Date.now()
  }
}

/**
 * 将函数文件转换为 .mcfunction 格式字符串
 */
export function functionToMcfunction(func: FunctionFile): string {
  return func.commands
    .map(cmd => cmd.rawText)
    .join('\n')
}

/**
 * 将标签文件转换为 JSON 字符串
 */
export function tagToJson(tag: TagFile, pretty: boolean = true): string {
  const obj: Record<string, unknown> = {
    values: tag.values
  }
  if (tag.replace !== undefined) {
    obj.replace = tag.replace
  }
  return JSON.stringify(obj, null, pretty ? 2 : 0)
}

/**
 * 将 pack.mcmeta 转换为 JSON 字符串
 */
export function packMcmetaToJson(packMeta: PackMcmeta, pretty: boolean = true): string {
  return JSON.stringify(packMeta, null, pretty ? 2 : 0)
}

/**
 * 验证数据包
 */
export function validateDatapack(datapack: Datapack): ValidationResult {
  const issues: ValidationIssue[] = []

  // 验证配置
  if (!datapack.config.name || datapack.config.name.trim() === '') {
    issues.push({
      severity: 'error',
      code: 'MISSING_NAME',
      message: 'Data pack name is required'
    })
  }

  // 验证命名空间
  for (const [name, namespace] of datapack.namespaces) {
    if (!isValidNamespaceName(name)) {
      issues.push({
        severity: 'error',
        code: 'INVALID_NAMESPACE',
        message: `Invalid namespace name: ${name}`,
        path: name
      })
    }

    // 验证函数文件
    for (const [funcName, func] of namespace.functions) {
      if (!isValidResourcePath(funcName)) {
        issues.push({
          severity: 'error',
          code: 'INVALID_FUNCTION_NAME',
          message: `Invalid function name: ${funcName}`,
          path: `${name}/functions/${funcName}.mcfunction`
        })
      }

      // 验证命令
      for (let i = 0; i < func.commands.length; i++) {
        const cmd = func.commands[i]
        if (!cmd.isComment && cmd.command.trim() === '') {
          issues.push({
            severity: 'warning',
            code: 'EMPTY_COMMAND',
            message: 'Empty command line',
            path: `${name}/functions/${funcName}.mcfunction`,
            line: i + 1
          })
        }
      }
    }

    // 验证标签文件
    for (const [tagType, tags] of namespace.tags) {
      for (const [tagName, tag] of tags) {
        if (!isValidResourcePath(tagName)) {
          issues.push({
            severity: 'error',
            code: 'INVALID_TAG_NAME',
            message: `Invalid tag name: ${tagName}`,
            path: `${name}/tags/${tagType}/${tagName}.json`
          })
        }

        if (tag.values.length === 0) {
          issues.push({
            severity: 'warning',
            code: 'EMPTY_TAG',
            message: `Tag has no values: ${tagName}`,
            path: `${name}/tags/${tagType}/${tagName}.json`
          })
        }
      }
    }
  }

  // 检查是否至少有一个命名空间
  if (datapack.namespaces.size === 0) {
    issues.push({
      severity: 'warning',
      code: 'NO_NAMESPACES',
      message: 'Data pack has no namespaces'
    })
  }

  return {
    valid: !issues.some(i => i.severity === 'error'),
    issues,
    errorCount: issues.filter(i => i.severity === 'error').length,
    warningCount: issues.filter(i => i.severity === 'warning').length,
    infoCount: issues.filter(i => i.severity === 'info').length
  }
}

/**
 * 获取数据包的完整文件结构（用于预览）
 */
export interface FileNode {
  name: string
  type: 'file' | 'directory'
  path: string
  children?: FileNode[]
}

/**
 * 生成数据包的文件树结构
 */
export function getDatapackFileTree(datapack: Datapack): FileNode[] {
  const root: FileNode[] = []

  // pack.mcmeta
  root.push({
    name: 'pack.mcmeta',
    type: 'file',
    path: 'pack.mcmeta'
  })

  // pack.png（如果有图标）
  if (datapack.icon) {
    root.push({
      name: 'pack.png',
      type: 'file',
      path: 'pack.png'
    })
  }

  // data 目录
  const dataDir: FileNode = {
    name: 'data',
    type: 'directory',
    path: 'data',
    children: []
  }

  for (const [nsName, namespace] of datapack.namespaces) {
    const nsDir: FileNode = {
      name: nsName,
      type: 'directory',
      path: `data/${nsName}`,
      children: []
    }

    // functions 目录
    if (namespace.functions.size > 0) {
      const funcDir: FileNode = {
        name: 'functions',
        type: 'directory',
        path: `data/${nsName}/functions`,
        children: []
      }

      for (const funcName of namespace.functions.keys()) {
        funcDir.children!.push({
          name: `${funcName}.mcfunction`,
          type: 'file',
          path: `data/${nsName}/functions/${funcName}.mcfunction`
        })
      }

      nsDir.children!.push(funcDir)
    }

    // tags 目录
    if (namespace.tags.size > 0) {
      const tagsDir: FileNode = {
        name: 'tags',
        type: 'directory',
        path: `data/${nsName}/tags`,
        children: []
      }

      for (const [tagType, tags] of namespace.tags) {
        if (tags.size > 0) {
          const typeDir: FileNode = {
            name: tagType,
            type: 'directory',
            path: `data/${nsName}/tags/${tagType}`,
            children: []
          }

          for (const tagName of tags.keys()) {
            typeDir.children!.push({
              name: `${tagName}.json`,
              type: 'file',
              path: `data/${nsName}/tags/${tagType}/${tagName}.json`
            })
          }

          tagsDir.children!.push(typeDir)
        }
      }

      nsDir.children!.push(tagsDir)
    }

    dataDir.children!.push(nsDir)
  }

  root.push(dataDir)

  return root
}

/**
 * 计算数据包统计信息
 */
export interface DatapackStats {
  namespaceCount: number
  functionCount: number
  commandCount: number
  tagCount: number
  estimatedSize: number
}

export function getDatapackStats(datapack: Datapack): DatapackStats {
  let functionCount = 0
  let commandCount = 0
  let tagCount = 0

  for (const namespace of datapack.namespaces.values()) {
    functionCount += namespace.functions.size

    for (const func of namespace.functions.values()) {
      commandCount += func.commands.filter(c => !c.isComment).length
    }

    for (const tags of namespace.tags.values()) {
      tagCount += tags.size
    }
  }

  // 估算大小（粗略计算）
  const packMetaSize = JSON.stringify(datapack.packMeta).length
  let contentSize = 0

  for (const namespace of datapack.namespaces.values()) {
    for (const func of namespace.functions.values()) {
      contentSize += functionToMcfunction(func).length
    }
    for (const tags of namespace.tags.values()) {
      for (const tag of tags.values()) {
        contentSize += tagToJson(tag, false).length
      }
    }
  }

  return {
    namespaceCount: datapack.namespaces.size,
    functionCount,
    commandCount,
    tagCount,
    estimatedSize: packMetaSize + contentSize
  }
}
