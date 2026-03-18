/**
 * 数据包 ZIP 打包器
 *
 * 使用 JSZip 将 Minecraft 数据包打包为 .zip 文件。
 * 支持浏览器下载和 Node.js 环境导出。
 *
 * @example
 * ```typescript
 * import { ZipPackager } from '@/core/datapack/zipPackager'
 * import { createDatapack, createNamespace, createFunctionFile } from '@/core/datapack'
 *
 * // 创建数据包
 * const datapack = createDatapack({ name: 'My Pack' })
 *
 * // 打包并下载
 * const packager = new ZipPackager()
 * const result = await packager.pack(datapack)
 * if (result.success) {
 *   packager.download(result.blob!)
 * }
 * ```
 */

import JSZip from 'jszip'
import type {
  Datapack,
  ZipExportOptions,
  ExportResult,
  Namespace,
  FunctionFile,
  TagFile,
  TagType
} from './types'
import {
  functionToMcfunction,
  tagToJson,
  packMcmetaToJson,
  validateDatapack
} from './types'

/**
 * 默认导出选项
 */
const DEFAULT_EXPORT_OPTIONS: Required<ZipExportOptions> = {
  compress: true,
  compressionLevel: 6,
  includeIcon: true,
  prettyPrintJson: true,
  encoding: 'utf-8'
}

/**
 * ZIP 打包器类
 *
 * 负责将 Datapack 对象转换为符合 Minecraft 规范的 .zip 文件。
 */
export class ZipPackager {
  private zip: JSZip
  private options: Required<ZipExportOptions>

  constructor(options: ZipExportOptions = {}) {
    this.zip = new JSZip()
    this.options = { ...DEFAULT_EXPORT_OPTIONS, ...options }
  }

  /**
   * 打包数据包为 ZIP 文件
   *
   * @param datapack - 要打包的数据包对象
   * @param options - 可选的导出选项（会覆盖构造时的选项）
   * @returns 导出结果
   */
  async pack(datapack: Datapack, options?: ZipExportOptions): Promise<ExportResult> {
    // 合并选项
    const opts = options ? { ...this.options, ...options } : this.options

    // 重置 ZIP 实例
    this.zip = new JSZip()

    try {
      // 1. 验证数据包
      const validation = validateDatapack(datapack)
      if (!validation.valid) {
        const errorMessages = validation.issues
          .filter(i => i.severity === 'error')
          .map(i => i.message)
          .join('; ')
        return {
          success: false,
          filename: '',
          size: 0,
          error: `Validation failed: ${errorMessages}`
        }
      }

      // 2. 添加 pack.mcmeta 到根目录
      this.addPackMcmeta(datapack, opts.prettyPrintJson)

      // 3. 添加 pack.png 图标（如果存在且启用）
      if (opts.includeIcon && datapack.icon) {
        this.addPackIcon(datapack.icon)
      }

      // 4. 添加所有命名空间内容
      for (const [, namespace] of datapack.namespaces) {
        this.addNamespace(namespace, opts.prettyPrintJson)
      }

      // 5. 生成 ZIP 文件
      const blob = await this.generateBlob(opts)

      // 6. 生成文件名
      const filename = this.generateFilename(datapack)

      return {
        success: true,
        filename,
        size: blob.size,
        blob
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error during packing'
      }
    }
  }

  /**
   * 生成 ZIP Blob
   */
  private async generateBlob(opts: Required<ZipExportOptions>): Promise<Blob> {
    const compressionType = opts.compress ? 'DEFLATE' : 'STORE'

    return await this.zip.generateAsync({
      type: 'blob',
      compression: compressionType,
      compressionOptions: {
        level: opts.compressionLevel
      }
    })
  }

  /**
   * 生成 ArrayBuffer（用于 Node.js 环境）
   */
  async packToBuffer(datapack: Datapack, options?: ZipExportOptions): Promise<ExportResult> {
    const opts = options ? { ...this.options, ...options } : this.options

    // 重置 ZIP 实例
    this.zip = new JSZip()

    try {
      // 验证数据包
      const validation = validateDatapack(datapack)
      if (!validation.valid) {
        const errorMessages = validation.issues
          .filter(i => i.severity === 'error')
          .map(i => i.message)
          .join('; ')
        return {
          success: false,
          filename: '',
          size: 0,
          error: `Validation failed: ${errorMessages}`
        }
      }

      // 添加文件
      this.addPackMcmeta(datapack, opts.prettyPrintJson)
      if (opts.includeIcon && datapack.icon) {
        this.addPackIcon(datapack.icon)
      }
      for (const [, namespace] of datapack.namespaces) {
        this.addNamespace(namespace, opts.prettyPrintJson)
      }

      // 生成 ArrayBuffer
      const buffer = await this.zip.generateAsync({
        type: 'arraybuffer',
        compression: opts.compress ? 'DEFLATE' : 'STORE',
        compressionOptions: {
          level: opts.compressionLevel
        }
      })

      const filename = this.generateFilename(datapack)

      return {
        success: true,
        filename,
        size: buffer.byteLength,
        buffer
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error during packing'
      }
    }
  }

  /**
   * 添加 pack.mcmeta 到 ZIP 根目录
   */
  private addPackMcmeta(datapack: Datapack, pretty: boolean): void {
    const content = packMcmetaToJson(datapack.packMeta, pretty)
    this.zip.file('pack.mcmeta', content)
  }

  /**
   * 添加 pack.png 图标到 ZIP 根目录
   */
  private addPackIcon(iconBase64: string): void {
    try {
      // 移除 data URL 前缀（如果有）
      const base64Data = iconBase64.replace(/^data:image\/\w+;base64,/, '')

      // 将 base64 转换为二进制数据
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      this.zip.file('pack.png', bytes)
    } catch {
      // 如果图标处理失败，静默忽略
      console.warn('Failed to add pack.png icon')
    }
  }

  /**
   * 添加命名空间到 ZIP
   *
   * 目录结构：
   * data/
   *   <namespace>/
   *     functions/
   *       *.mcfunction
   *     tags/
   *       blocks/
   *         *.json
   *       functions/
   *         *.json
   *       ...
   */
  private addNamespace(namespace: Namespace, prettyJson: boolean): void {
    const nsPath = `data/${namespace.name}`

    // 添加函数文件
    if (namespace.functions.size > 0) {
      this.addFunctions(nsPath, namespace.functions)
    }

    // 添加标签文件
    if (namespace.tags.size > 0) {
      this.addTags(nsPath, namespace.tags, prettyJson)
    }
  }

  /**
   * 添加函数文件到 ZIP
   */
  private addFunctions(nsPath: string, functions: Map<string, FunctionFile>): void {
    const funcPath = `${nsPath}/functions`

    for (const [funcName, func] of functions) {
      const content = functionToMcfunction(func)
      // 处理子目录路径（例如: "subdir/main" -> "functions/subdir/main.mcfunction"）
      const filePath = `${funcPath}/${funcName}.mcfunction`
      this.zip.file(filePath, content)
    }
  }

  /**
   * 添加标签文件到 ZIP
   */
  private addTags(
    nsPath: string,
    tags: Map<TagType, Map<string, TagFile>>,
    prettyJson: boolean
  ): void {
    const tagsPath = `${nsPath}/tags`

    for (const [tagType, typeTags] of tags) {
      if (typeTags.size === 0) continue

      const typePath = `${tagsPath}/${tagType}`

      for (const [tagName, tag] of typeTags) {
        const content = tagToJson(tag, prettyJson)
        // 处理子目录路径
        const filePath = `${typePath}/${tagName}.json`
        this.zip.file(filePath, content)
      }
    }
  }

  /**
   * 生成文件名
   */
  private generateFilename(datapack: Datapack): string {
    // 清理文件名中的非法字符
    const safeName = datapack.config.name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .trim()

    // 添加版本号（如果有）
    const version = datapack.config.version ? `_${datapack.config.version}` : ''

    return `${safeName}${version}.zip`
  }

  /**
   * 触发浏览器下载
   *
   * @param blob - 要下载的 Blob 对象
   * @param filename - 可选的文件名（默认使用打包时生成的文件名）
   */
  download(blob: Blob, filename?: string): void {
    // 检查是否在浏览器环境
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      throw new Error('download() is only available in browser environment')
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'datapack.zip'

    // 添加到 DOM 并触发点击
    document.body.appendChild(link)
    link.click()

    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * 获取 ZIP 内容预览（用于调试）
   */
  async preview(datapack: Datapack): Promise<Record<string, string>> {
    // 重置 ZIP 实例
    this.zip = new JSZip()

    // 添加基本文件
    this.addPackMcmeta(datapack, true)
    if (datapack.icon) {
      this.addPackIcon(datapack.icon)
    }
    for (const [, namespace] of datapack.namespaces) {
      this.addNamespace(namespace, true)
    }

    // 收集文件列表
    const files: Record<string, string> = {}
    const zipContents = await this.zip.generateAsync({ type: 'base64' })

    this.zip.forEach((relativePath) => {
      files[relativePath] = relativePath
    })

    return {
      ...files,
      _base64Size: `${Math.ceil(zipContents.length * 0.75)} bytes`
    }
  }
}

/**
 * 便捷函数：打包并下载
 *
 * @param datapack - 要打包的数据包
 * @param options - 导出选项
 */
export async function packAndDownload(
  datapack: Datapack,
  options?: ZipExportOptions
): Promise<ExportResult> {
  const packager = new ZipPackager(options)
  const result = await packager.pack(datapack, options)

  if (result.success && result.blob) {
    packager.download(result.blob, result.filename)
  }

  return result
}

/**
 * 便捷函数：打包为 Blob
 *
 * @param datapack - 要打包的数据包
 * @param options - 导出选项
 */
export async function packToBlob(
  datapack: Datapack,
  options?: ZipExportOptions
): Promise<Blob | null> {
  const packager = new ZipPackager(options)
  const result = await packager.pack(datapack, options)
  return result.success ? result.blob ?? null : null
}

/**
 * 便捷函数：打包为 ArrayBuffer
 *
 * @param datapack - 要打包的数据包
 * @param options - 导出选项
 */
export async function packToArrayBuffer(
  datapack: Datapack,
  options?: ZipExportOptions
): Promise<ArrayBuffer | null> {
  const packager = new ZipPackager(options)
  const result = await packager.packToBuffer(datapack, options)
  return result.success ? result.buffer ?? null : null
}

// 默认导出
export default ZipPackager
