/**
 * Minecraft 标签文件生成器
 *
 * 本模块提供 Minecraft 数据包标签文件的生成功能。
 * 支持多种标签类型（functions, items 等）和命名空间。
 *
 * 标签文件格式参考:
 * https://minecraft.wiki/w/Tag
 *
 * @example
 * ```typescript
 * import { TagGenerator, TagBuilder } from '@/core/datapack/tagGenerator'
 *
 * // 使用 TagGenerator 生成标签
 * const generator = new TagGenerator()
 * const tagJson = generator.generateTagJson('my_functions', 'functions', [
 *   'minecraft:tick',
 *   { id: 'my_pack:main', required: false }
 * ])
 *
 * // 使用 TagBuilder 构建复杂标签
 * const builder = new TagBuilder('functions', 'my_tag')
 *   .add('minecraft:tick')
 *   .add('my_pack:main')
 *   .setReplace(false)
 *
 * const tagFile = builder.build()
 * const json = generator.generateTagJsonFromTagFile(tagFile)
 * ```
 */

import type {
  TagType,
  TagEntry,
  TagFile,
  Namespace
} from './types'
import {
  createTagFile,
  isValidNamespaceName,
  isValidResourcePath
} from './types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 标签生成器配置选项
 */
export interface TagGeneratorOptions {
  /** 是否美化 JSON 输出（默认 true） */
  prettyPrint?: boolean
  /** JSON 缩进空格数（默认 2） */
  indentSpaces?: number
  /** 是否验证输入（默认 true） */
  validateInput?: boolean
}

/**
 * 标签构建器选项
 */
export interface TagBuilderOptions {
  /** 标签名称 */
  name: string
  /** 标签类型 */
  type: TagType
  /** 所属命名空间 */
  namespace?: string
  /** 是否替换现有标签 */
  replace?: boolean
}

/**
 * 标签 JSON 结构
 * 对应 tags/<type>/<name>.json 的格式
 */
export interface TagJsonStructure {
  /** 标签条目列表 */
  values: TagEntry[]
  /** 是否替换现有标签（可选） */
  replace?: boolean
}

/**
 * 生成的标签文件结果
 */
export interface GeneratedTagFile {
  /** 相对文件路径（如 data/my_pack/tags/functions/tick.json） */
  path: string
  /** JSON 内容 */
  content: string
  /** 标签文件对象 */
  tag: TagFile
}

/**
 * 验证错误
 */
export interface TagValidationError {
  /** 错误字段 */
  field: string
  /** 错误消息 */
  message: string
  /** 错误值 */
  value?: unknown
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 默认生成器配置
 */
const DEFAULT_GENERATOR_OPTIONS: Required<TagGeneratorOptions> = {
  prettyPrint: true,
  indentSpaces: 2,
  validateInput: true
}

/**
 * 所有支持的标签类型
 */
export const SUPPORTED_TAG_TYPES: readonly TagType[] = [
  'blocks',
  'entity_types',
  'fluids',
  'functions',
  'game_events',
  'items'
] as const

/**
 * 标签类型到目录名的映射
 */
export const TAG_TYPE_DIRECTORIES: Record<TagType, string> = {
  blocks: 'blocks',
  entity_types: 'entity_types',
  fluids: 'fluids',
  functions: 'functions',
  game_events: 'game_events',
  items: 'items'
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 验证资源 ID 格式
 * 资源 ID 格式: namespace:path 或 path
 *
 * @param id - 资源 ID
 * @returns 是否有效
 */
export function isValidResourceId(id: string): boolean {
  // 允许格式: namespace:path 或 path
  // namespace: 小写字母、数字、下划线、连字符、点
  // path: 小写字母、数字、下划线、连字符、点、正斜杠
  const namespacePattern = '[a-z0-9_.-]+'
  const pathPattern = '[a-z0-9_./-]+'
  const fullPattern = `^(${namespacePattern}:)?${pathPattern}$`
  return new RegExp(fullPattern).test(id)
}

/**
 * 解析资源 ID
 *
 * @param id - 资源 ID（如 "minecraft:stone" 或 "stone"）
 * @param defaultNamespace - 默认命名空间（默认 "minecraft"）
 * @returns 解析后的命名空间和路径
 */
export function parseResourceId(
  id: string,
  defaultNamespace: string = 'minecraft'
): { namespace: string; path: string } {
  if (id.includes(':')) {
    const [namespace, path] = id.split(':', 2)
    return { namespace, path }
  }
  return { namespace: defaultNamespace, path: id }
}

/**
 * 构建资源 ID
 *
 * @param namespace - 命名空间
 * @param path - 路径
 * @returns 完整的资源 ID
 */
export function buildResourceId(namespace: string, path: string): string {
  return `${namespace}:${path}`
}

/**
 * 获取标签文件的相对路径
 *
 * @param namespace - 命名空间
 * @param tagType - 标签类型
 * @param tagName - 标签名称
 * @returns 相对文件路径
 */
export function getTagFilePath(
  namespace: string,
  tagType: TagType,
  tagName: string
): string {
  const dirName = TAG_TYPE_DIRECTORIES[tagType]
  return `data/${namespace}/tags/${dirName}/${tagName}.json`
}

// ============================================================================
// TagBuilder 类
// ============================================================================

/**
 * 标签构建器
 * 提供流式 API 来构建标签文件
 *
 * @example
 * ```typescript
 * const builder = new TagBuilder('functions', 'tick')
 *   .add('my_pack:main')
 *   .add('my_pack:secondary')
 *   .addOptional('my_pack:optional_func')
 *   .setReplace(false)
 *
 * const tag = builder.build()
 * ```
 */
export class TagBuilder {
  private readonly _type: TagType
  private readonly _name: string
  private readonly _namespace: string
  private _values: TagEntry[] = []
  private _replace: boolean | undefined

  constructor(type: TagType, name: string, namespace: string = 'minecraft') {
    this._type = type
    this._name = name
    this._namespace = namespace

    if (!SUPPORTED_TAG_TYPES.includes(type)) {
      throw new Error(`Unsupported tag type: ${type}`)
    }

    if (!isValidResourcePath(name)) {
      throw new Error(`Invalid tag name: ${name}`)
    }

    if (!isValidNamespaceName(namespace)) {
      throw new Error(`Invalid namespace: ${namespace}`)
    }
  }

  /**
   * 获取标签类型
   */
  get type(): TagType {
    return this._type
  }

  /**
   * 获取标签名称
   */
  get name(): string {
    return this._name
  }

  /**
   * 获取命名空间
   */
  get namespace(): string {
    return this._namespace
  }

  /**
   * 添加标签条目
   *
   * @param id - 资源 ID
   * @returns this（用于链式调用）
   */
  add(id: string): this {
    if (!isValidResourceId(id)) {
      throw new Error(`Invalid resource ID: ${id}`)
    }

    // 检查是否已存在
    const exists = this._values.some(v => {
      if (typeof v === 'string') return v === id
      return v.id === id
    })

    if (!exists) {
      this._values.push(id)
    }

    return this
  }

  /**
   * 添加可选标签条目
   *
   * @param id - 资源 ID
   * @param required - 是否必需（默认 false）
   * @returns this（用于链式调用）
   */
  addOptional(id: string, required: boolean = false): this {
    if (!isValidResourceId(id)) {
      throw new Error(`Invalid resource ID: ${id}`)
    }

    // 检查是否已存在
    const exists = this._values.some(v => {
      if (typeof v === 'string') return v === id
      return v.id === id
    })

    if (!exists) {
      this._values.push({ id, required })
    }

    return this
  }

  /**
   * 批量添加标签条目
   *
   * @param ids - 资源 ID 数组
   * @returns this（用于链式调用）
   */
  addAll(ids: string[]): this {
    for (const id of ids) {
      this.add(id)
    }
    return this
  }

  /**
   * 移除标签条目
   *
   * @param id - 资源 ID
   * @returns this（用于链式调用）
   */
  remove(id: string): this {
    this._values = this._values.filter(v => {
      if (typeof v === 'string') return v !== id
      return v.id !== id
    })
    return this
  }

  /**
   * 设置是否替换现有标签
   *
   * @param replace - 是否替换
   * @returns this（用于链式调用）
   */
  setReplace(replace: boolean): this {
    this._replace = replace
    return this
  }

  /**
   * 清空所有条目
   *
   * @returns this（用于链式调用）
   */
  clear(): this {
    this._values = []
    return this
  }

  /**
   * 获取当前条目数量
   */
  get size(): number {
    return this._values.length
  }

  /**
   * 构建标签文件对象
   *
   * @returns TagFile 对象
   */
  build(): TagFile {
    return createTagFile(this._name, this._type, [...this._values])
  }

  /**
   * 克隆构建器
   *
   * @returns 新的 TagBuilder 实例
   */
  clone(): TagBuilder {
    const cloned = new TagBuilder(this._type, this._name, this._namespace)
    cloned._values = [...this._values]
    cloned._replace = this._replace
    return cloned
  }
}

// ============================================================================
// TagGenerator 类
// ============================================================================

/**
 * 标签文件生成器
 * 用于生成 Minecraft 标签 JSON 文件
 *
 * @example
 * ```typescript
 * const generator = new TagGenerator({ prettyPrint: true })
 *
 * // 生成单个标签 JSON
 * const json = generator.generateTagJson('my_tag', 'functions', [
 *   'minecraft:tick',
 *   'my_pack:main'
 * ])
 *
 * // 从 TagFile 生成 JSON
 * const tagFile = createTagFile('tick', 'functions', ['my_pack:main'])
 * const json2 = generator.generateTagJsonFromTagFile(tagFile)
 *
 * // 生成完整的标签文件（包含路径）
 * const result = generator.generateTagFile(tagFile, 'my_pack')
 * ```
 */
export class TagGenerator {
  private readonly _options: Required<TagGeneratorOptions>

  constructor(options?: TagGeneratorOptions) {
    this._options = { ...DEFAULT_GENERATOR_OPTIONS, ...options }
  }

  /**
   * 验证标签条目
   *
   * @param entry - 标签条目
   * @returns 验证错误数组（空表示有效）
   */
  validateEntry(entry: TagEntry): TagValidationError[] {
    const errors: TagValidationError[] = []

    if (typeof entry === 'string') {
      if (!isValidResourceId(entry)) {
        errors.push({
          field: 'id',
          message: `Invalid resource ID format: ${entry}`,
          value: entry
        })
      }
    } else {
      if (!entry.id || typeof entry.id !== 'string') {
        errors.push({
          field: 'id',
          message: 'Entry id is required and must be a string',
          value: entry.id
        })
      } else if (!isValidResourceId(entry.id)) {
        errors.push({
          field: 'id',
          message: `Invalid resource ID format: ${entry.id}`,
          value: entry.id
        })
      }

      if (entry.required !== undefined && typeof entry.required !== 'boolean') {
        errors.push({
          field: 'required',
          message: 'Entry required field must be a boolean',
          value: entry.required
        })
      }
    }

    return errors
  }

  /**
   * 验证标签配置
   *
   * @param name - 标签名称
   * @param type - 标签类型
   * @param values - 标签条目
   * @returns 验证错误数组（空表示有效）
   */
  validateTag(
    name: string,
    type: TagType,
    values: TagEntry[]
  ): TagValidationError[] {
    const errors: TagValidationError[] = []

    // 验证标签名称
    if (!name || name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Tag name is required'
      })
    } else if (!isValidResourcePath(name)) {
      errors.push({
        field: 'name',
        message: `Invalid tag name: ${name}`,
        value: name
      })
    }

    // 验证标签类型
    if (!SUPPORTED_TAG_TYPES.includes(type)) {
      errors.push({
        field: 'type',
        message: `Unsupported tag type: ${type}`,
        value: type
      })
    }

    // 验证条目
    for (let i = 0; i < values.length; i++) {
      const entryErrors = this.validateEntry(values[i])
      for (const error of entryErrors) {
        errors.push({
          ...error,
          field: `values[${i}].${error.field}`
        })
      }
    }

    return errors
  }

  /**
   * 生成标签 JSON 字符串
   *
   * @param name - 标签名称
   * @param type - 标签类型
   * @param values - 标签条目数组
   * @param replace - 是否替换现有标签（可选）
   * @returns JSON 字符串
   */
  generateTagJson(
    name: string,
    type: TagType,
    values: TagEntry[],
    replace?: boolean
  ): string {
    if (this._options.validateInput) {
      const errors = this.validateTag(name, type, values)
      if (errors.length > 0) {
        throw new Error(
          `Tag validation failed:\n${errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`
        )
      }
    }

    const structure: TagJsonStructure = { values }

    if (replace !== undefined) {
      structure.replace = replace
    }

    return JSON.stringify(
      structure,
      null,
      this._options.prettyPrint ? this._options.indentSpaces : 0
    )
  }

  /**
   * 从 TagFile 对象生成 JSON 字符串
   *
   * @param tagFile - TagFile 对象
   * @returns JSON 字符串
   */
  generateTagJsonFromTagFile(tagFile: TagFile): string {
    return this.generateTagJson(
      tagFile.name,
      tagFile.type,
      tagFile.values,
      tagFile.replace
    )
  }

  /**
   * 生成完整的标签文件（包含路径和内容）
   *
   * @param tagFile - TagFile 对象
   * @param namespace - 命名空间
   * @returns 生成的标签文件
   */
  generateTagFile(tagFile: TagFile, namespace: string): GeneratedTagFile {
    if (this._options.validateInput) {
      if (!isValidNamespaceName(namespace)) {
        throw new Error(`Invalid namespace: ${namespace}`)
      }
    }

    return {
      path: getTagFilePath(namespace, tagFile.type, tagFile.name),
      content: this.generateTagJsonFromTagFile(tagFile),
      tag: tagFile
    }
  }

  /**
   * 为命名空间生成所有标签文件
   *
   * @param namespace - Namespace 对象
   * @returns 生成的标签文件数组
   */
  generateNamespaceTags(namespace: Namespace): GeneratedTagFile[] {
    const results: GeneratedTagFile[] = []

    for (const [, tags] of namespace.tags) {
      for (const [, tag] of tags) {
        results.push(this.generateTagFile(tag, namespace.name))
      }
    }

    return results
  }

  /**
   * 创建函数标签构建器
   *
   * @param name - 标签名称
   * @param namespace - 命名空间
   * @returns TagBuilder 实例
   */
  createFunctionTagBuilder(name: string, namespace?: string): TagBuilder {
    return new TagBuilder('functions', name, namespace)
  }

  /**
   * 创建物品标签构建器
   *
   * @param name - 标签名称
   * @param namespace - 命名空间
   * @returns TagBuilder 实例
   */
  createItemTagBuilder(name: string, namespace?: string): TagBuilder {
    return new TagBuilder('items', name, namespace)
  }

  /**
   * 创建方块标签构建器
   *
   * @param name - 标签名称
   * @param namespace - 命名空间
   * @returns TagBuilder 实例
   */
  createBlockTagBuilder(name: string, namespace?: string): TagBuilder {
    return new TagBuilder('blocks', name, namespace)
  }
}

// ============================================================================
// 便捷导出函数
// ============================================================================

/**
 * 快速生成函数标签 JSON
 *
 * @param values - 函数 ID 数组
 * @param replace - 是否替换现有标签
 * @returns JSON 字符串
 */
export function generateFunctionTagJson(
  values: string[],
  replace?: boolean
): string {
  const generator = new TagGenerator()
  return generator.generateTagJson('generated', 'functions', values, replace)
}

/**
 * 快速生成物品标签 JSON
 *
 * @param values - 物品 ID 数组
 * @param replace - 是否替换现有标签
 * @returns JSON 字符串
 */
export function generateItemTagJson(
  values: string[],
  replace?: boolean
): string {
  const generator = new TagGenerator()
  return generator.generateTagJson('generated', 'items', values, replace)
}

/**
 * 创建标签构建器（便捷方法）
 *
 * @param type - 标签类型
 * @param name - 标签名称
 * @param namespace - 命名空间
 * @returns TagBuilder 实例
 */
export function createTagBuilder(
  type: TagType,
  name: string,
  namespace?: string
): TagBuilder {
  return new TagBuilder(type, name, namespace)
}

// 默认导出
export default TagGenerator
