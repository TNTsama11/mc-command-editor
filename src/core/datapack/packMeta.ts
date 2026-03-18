/**
 * pack.mcmeta 生成器
 *
 * 本模块提供 Minecraft 数据包 pack.mcmeta 文件的生成和序列化功能。
 * 参考 Minecraft 数据包格式规范: https://minecraft.wiki/w/Data_pack#pack.mcmeta
 *
 * @example
 * ```typescript
 * import { createPackMcmetaContent, generatePackMcmetaJson } from './packMeta'
 *
 * // 创建基本 pack.mcmeta 内容
 * const packMeta = createPackMcmetaContent({
 *   packFormat: 48,
 *   description: 'My awesome datapack'
 * })
 *
 * // 生成 JSON 字符串
 * const json = generatePackMcmetaJson(packMeta)
 * ```
 */

import type { PackFormat, PackMeta, PackMcmeta } from './types'

// ============================================================================
// pack.mcmeta 配置接口
// ============================================================================

/**
 * pack.mcmeta 生成器配置选项
 */
export interface PackMcmetaOptions {
  /** 数据包格式版本号（必需） */
  packFormat: PackFormat
  /** 数据包描述文本（必需） */
  description: string
  /** 支持的格式版本范围（可选，1.20.2+） */
  supportedFormats?: {
    minInclusive: PackFormat
    maxInclusive: PackFormat
  }
  /** 过滤器配置（可选） */
  filter?: Array<{
    namespace: string
    path: string
  }>
  /** 覆盖目录配置（可选，1.21+） */
  overlays?: Array<{
    formats: {
      minInclusive: PackFormat
      maxInclusive: PackFormat
    }
    directory: string
  }>
}

/**
 * JSON 序列化选项
 */
export interface JsonSerializeOptions {
  /** 是否美化输出（默认 true） */
  pretty?: boolean
  /** 缩进空格数（默认 2） */
  indent?: number
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 各 Minecraft 版本对应的 pack_format 值
 *
 * 参考: https://minecraft.wiki/w/Data_pack#pack_format
 */
export const PACK_FORMAT_VERSIONS = {
  /** 1.16.2-1.16.5 */
  V6: 6,
  /** 1.17-1.17.1 */
  V7: 7,
  /** 1.18-1.18.2 */
  V8: 8,
  /** 1.19-1.19.2 */
  V9: 9,
  /** 1.19.3 */
  V10: 10,
  /** 1.19.4 */
  V12: 12,
  /** 1.20-1.20.1 */
  V15: 15,
  /** 1.20.2 */
  V18: 18,
  /** 1.20.3-1.20.4 */
  V26: 26,
  /** 1.20.5-1.20.6 */
  V41: 41,
  /** 1.21-1.21.1 */
  V48: 48,
  /** 1.21.2-1.21.3 */
  V57: 57,
  /** 1.21.4 */
  V61: 61
} as const

/**
 * 推荐使用的默认 pack_format
 */
export const DEFAULT_PACK_FORMAT = PACK_FORMAT_VERSIONS.V48

/**
 * 默认描述文本
 */
export const DEFAULT_DESCRIPTION = 'A Minecraft datapack'

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证 pack_format 是否为有效的正整数
 * @param format pack_format 值
 * @returns 是否有效
 */
export function isValidPackFormat(format: number): boolean {
  return Number.isInteger(format) && format > 0
}

/**
 * 验证描述文本是否有效
 * @param description 描述文本
 * @returns 是否有效
 */
export function isValidDescription(description: string): boolean {
  return typeof description === 'string' && description.trim().length > 0
}

/**
 * 验证命名空间名称是否符合 Minecraft 规范
 * @param namespace 命名空间名称
 * @returns 是否有效
 */
export function isValidNamespace(namespace: string): boolean {
  return /^[a-z0-9_.-]+$/.test(namespace)
}

/**
 * 验证路径是否符合规范
 * @param path 路径
 * @returns 是否有效
 */
export function isValidPath(path: string): boolean {
  return /^[a-z0-9_./-]*$/.test(path)
}

// ============================================================================
// 创建函数
// ============================================================================

/**
 * 创建 pack.mcmeta 内容
 *
 * @param options 配置选项
 * @returns PackMcmeta 对象
 * @throws {Error} 如果 pack_format 无效
 * @throws {Error} 如果 description 为空
 *
 * @example
 * ```typescript
 * // 创建基本配置
 * const meta = createPackMcmetaContent({
 *   packFormat: 48,
 *   description: 'My datapack'
 * })
 *
 * // 创建带格式范围支持的配置
 * const metaWithFormats = createPackMcmetaContent({
 *   packFormat: 48,
 *   description: 'My datapack',
 *   supportedFormats: {
 *     minInclusive: 41,
 *     maxInclusive: 48
 *   }
 * })
 * ```
 */
export function createPackMcmetaContent(options: PackMcmetaOptions): PackMcmeta {
  // 验证 pack_format
  if (!isValidPackFormat(options.packFormat)) {
    throw new Error(
      `Invalid pack_format: ${options.packFormat}. Must be a positive integer.`
    )
  }

  // 验证 description
  if (!isValidDescription(options.description)) {
    throw new Error(
      `Invalid description: description must be a non-empty string.`
    )
  }

  // 构建 pack 字段
  const pack: PackMeta = {
    pack_format: options.packFormat,
    description: options.description
  }

  // 添加支持的格式范围（可选）
  if (options.supportedFormats) {
    const { minInclusive, maxInclusive } = options.supportedFormats

    if (!isValidPackFormat(minInclusive) || !isValidPackFormat(maxInclusive)) {
      throw new Error(
        `Invalid supported_formats: minInclusive and maxInclusive must be positive integers.`
      )
    }

    if (minInclusive > maxInclusive) {
      throw new Error(
        `Invalid supported_formats: minInclusive (${minInclusive}) cannot be greater than maxInclusive (${maxInclusive}).`
      )
    }

    pack.supported_formats = {
      min_inclusive: minInclusive,
      max_inclusive: maxInclusive
    }
  }

  // 构建 PackMcmeta 对象
  const result: PackMcmeta = { pack }

  // 添加过滤器（可选）
  if (options.filter && options.filter.length > 0) {
    result.filter = {
      block: options.filter.map(f => {
        if (!isValidNamespace(f.namespace)) {
          throw new Error(`Invalid filter namespace: ${f.namespace}`)
        }
        if (!isValidPath(f.path)) {
          throw new Error(`Invalid filter path: ${f.path}`)
        }
        return {
          namespace: f.namespace,
          path: f.path
        }
      })
    }
  }

  // 添加覆盖目录（可选）
  if (options.overlays && options.overlays.length > 0) {
    result.overlays = {
      entries: options.overlays.map(o => {
        const { minInclusive, maxInclusive } = o.formats

        if (!isValidPackFormat(minInclusive) || !isValidPackFormat(maxInclusive)) {
          throw new Error(
            `Invalid overlay formats: minInclusive and maxInclusive must be positive integers.`
          )
        }

        if (minInclusive > maxInclusive) {
          throw new Error(
            `Invalid overlay formats: minInclusive cannot be greater than maxInclusive.`
          )
        }

        return {
          formats: {
            min_inclusive: minInclusive,
            max_inclusive: maxInclusive
          },
          directory: o.directory
        }
      })
    }
  }

  return result
}

/**
 * 创建默认的 pack.mcmeta 内容
 *
 * @param description 可选的描述文本
 * @param packFormat 可选的 pack_format（默认为推荐版本）
 * @returns PackMcmeta 对象
 *
 * @example
 * ```typescript
 * const defaultMeta = createDefaultPackMcmeta()
 * // 生成: { pack: { pack_format: 48, description: 'A Minecraft datapack' } }
 *
 * const customMeta = createDefaultPackMcmeta('My pack', 26)
 * // 生成: { pack: { pack_format: 26, description: 'My pack' } }
 * ```
 */
export function createDefaultPackMcmeta(
  description: string = DEFAULT_DESCRIPTION,
  packFormat: PackFormat = DEFAULT_PACK_FORMAT
): PackMcmeta {
  return createPackMcmetaContent({
    packFormat,
    description
  })
}

// ============================================================================
// 序列化函数
// ============================================================================

/**
 * 将 PackMcmeta 对象序列化为 JSON 字符串
 *
 * @param packMeta PackMcmeta 对象
 * @param options 序列化选项
 * @returns JSON 字符串
 *
 * @example
 * ```typescript
 * const meta = createPackMcmetaContent({
 *   packFormat: 48,
 *   description: 'My datapack'
 * })
 *
 * // 美化输出
 * const json = generatePackMcmetaJson(meta)
 * // 输出:
 * // {
 * //   "pack": {
 * //     "pack_format": 48,
 * //     "description": "My datapack"
 * //   }
 * // }
 *
 * // 紧凑输出
 * const compact = generatePackMcmetaJson(meta, { pretty: false })
 * // 输出: {"pack":{"pack_format":48,"description":"My datapack"}}
 * ```
 */
export function generatePackMcmetaJson(
  packMeta: PackMcmeta,
  options: JsonSerializeOptions = {}
): string {
  const { pretty = true, indent = 2 } = options
  return JSON.stringify(packMeta, null, pretty ? indent : 0)
}

/**
 * 直接生成 pack.mcmeta JSON 字符串（便捷函数）
 *
 * @param options 配置选项
 * @param serializeOptions 序列化选项
 * @returns JSON 字符串
 *
 * @example
 * ```typescript
 * const json = generatePackMcmeta({
 *   packFormat: 48,
 *   description: 'My datapack'
 * })
 * ```
 */
export function generatePackMcmeta(
  options: PackMcmetaOptions,
  serializeOptions?: JsonSerializeOptions
): string {
  const packMeta = createPackMcmetaContent(options)
  return generatePackMcmetaJson(packMeta, serializeOptions)
}

// ============================================================================
// 解析函数
// ============================================================================

/**
 * 解析 JSON 字符串为 PackMcmeta 对象
 *
 * @param json JSON 字符串
 * @returns PackMcmeta 对象
 * @throws {Error} 如果 JSON 无效或格式不正确
 *
 * @example
 * ```typescript
 * const json = '{"pack":{"pack_format":48,"description":"My pack"}}'
 * const meta = parsePackMcmeta(json)
 * console.log(meta.pack.pack_format) // 48
 * ```
 */
export function parsePackMcmeta(json: string): PackMcmeta {
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`)
  }

  // 验证结构
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid pack.mcmeta: root must be an object')
  }

  const obj = parsed as Record<string, unknown>

  if (!('pack' in obj)) {
    throw new Error('Invalid pack.mcmeta: missing "pack" field')
  }

  const pack = obj.pack as Record<string, unknown>

  if (!('pack_format' in pack) || typeof pack.pack_format !== 'number') {
    throw new Error('Invalid pack.mcmeta: missing or invalid "pack.pack_format" field')
  }

  if (!('description' in pack) || typeof pack.description !== 'string') {
    throw new Error('Invalid pack.mcmeta: missing or invalid "pack.description" field')
  }

  if (!isValidPackFormat(pack.pack_format)) {
    throw new Error(`Invalid pack.mcmeta: pack_format must be a positive integer`)
  }

  return parsed as PackMcmeta
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取 pack_format 对应的 Minecraft 版本描述
 *
 * @param packFormat pack_format 值
 * @returns 版本描述字符串
 *
 * @example
 * ```typescript
 * getMinecraftVersion(48) // '1.21-1.21.1'
 * getMinecraftVersion(999) // 'Unknown version'
 * ```
 */
export function getMinecraftVersion(packFormat: PackFormat): string {
  const versionMap: Record<number, string> = {
    6: '1.16.2-1.16.5',
    7: '1.17-1.17.1',
    8: '1.18-1.18.2',
    9: '1.19-1.19.2',
    10: '1.19.3',
    12: '1.19.4',
    15: '1.20-1.20.1',
    18: '1.20.2',
    26: '1.20.3-1.20.4',
    41: '1.20.5-1.20.6',
    48: '1.21-1.21.1',
    57: '1.21.2-1.21.3',
    61: '1.21.4'
  }

  return versionMap[packFormat] ?? 'Unknown version'
}

/**
 * 更新现有 PackMcmeta 的 pack_format
 *
 * @param packMeta 现有的 PackMcmeta 对象
 * @param newFormat 新的 pack_format 值
 * @returns 更新后的 PackMcmeta 对象
 */
export function updatePackFormat(
  packMeta: PackMcmeta,
  newFormat: PackFormat
): PackMcmeta {
  if (!isValidPackFormat(newFormat)) {
    throw new Error(`Invalid pack_format: ${newFormat}`)
  }

  return {
    ...packMeta,
    pack: {
      ...packMeta.pack,
      pack_format: newFormat
    }
  }
}

/**
 * 更新现有 PackMcmeta 的描述
 *
 * @param packMeta 现有的 PackMcmeta 对象
 * @param newDescription 新的描述文本
 * @returns 更新后的 PackMcmeta 对象
 */
export function updateDescription(
  packMeta: PackMcmeta,
  newDescription: string
): PackMcmeta {
  if (!isValidDescription(newDescription)) {
    throw new Error('Invalid description: must be a non-empty string')
  }

  return {
    ...packMeta,
    pack: {
      ...packMeta.pack,
      description: newDescription
    }
  }
}
