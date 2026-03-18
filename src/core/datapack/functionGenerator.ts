/**
 * 函数文件生成器
 *
 * 本模块提供将命令列表转换为 .mcfunction 文件格式的功能。
 * .mcfunction 是 Minecraft 数据包中用于存储命令序列的文件格式。
 *
 * @module functionGenerator
 *
 * @see https://minecraft.wiki/w/Function_(Java_Edition)
 */

import type { CommandLine, FunctionFile } from './types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 函数生成器配置选项
 */
export interface FunctionGeneratorOptions {
  /** 是否在文件头部添加生成注释（默认 true） */
  includeHeaderComment?: boolean
  /** 是否移除命令前的斜杠（默认 true，.mcfunction 不需要斜杠） */
  stripLeadingSlash?: boolean
  /** 是否在空行处添加空行（默认 true） */
  preserveEmptyLines?: boolean
  /** 文件编码（默认 'utf-8'） */
  encoding?: string
  /** 自定义头部注释文本 */
  customHeader?: string
  /** 缩进字符串（默认 '  '，两个空格） */
  indent?: string
}

/**
 * 单条命令条目（用于生成器输入）
 */
export interface CommandEntry {
  /** 命令文本 */
  command: string
  /** 是否为注释 */
  isComment?: boolean
  /** 是否为空行 */
  isEmptyLine?: boolean
}

/**
 * 函数生成器输出结果
 */
export interface FunctionGeneratorResult {
  /** 生成的内容 */
  content: string
  /** 命令行数（不含注释和空行） */
  commandCount: number
  /** 注释行数 */
  commentCount: number
  /** 空行数 */
  emptyLineCount: number
  /** 总行数 */
  totalLines: number
}

// ============================================================================
// 常量
// ============================================================================

/**
 * 默认生成器配置
 */
const DEFAULT_OPTIONS: Required<FunctionGeneratorOptions> = {
  includeHeaderComment: true,
  stripLeadingSlash: true,
  preserveEmptyLines: true,
  encoding: 'utf-8',
  customHeader: '',
  indent: '  '
}

/**
 * .mcfunction 文件扩展名
 */
export const MCFUNCTION_EXTENSION = '.mcfunction'

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 移除命令前的斜杠
 *
 * @param command - 命令字符串
 * @returns 处理后的命令
 *
 * @example
 * ```typescript
 * stripSlash('/say Hello') // 'say Hello'
 * stripSlash('say Hello')  // 'say Hello'
 * ```
 */
export function stripSlash(command: string): string {
  if (command.startsWith('/')) {
    return command.slice(1)
  }
  return command
}

/**
 * 格式化注释行
 *
 * @param text - 注释文本
 * @returns 格式化后的注释行
 *
 * @example
 * ```typescript
 * formatComment('This is a comment') // '# This is a comment'
 * formatComment('# Already a comment') // '# Already a comment'
 * ```
 */
export function formatComment(text: string): string {
  const trimmed = text.trim()

  // 如果已经是注释格式，直接返回
  if (trimmed.startsWith('#')) {
    return trimmed
  }

  // 添加 # 前缀
  return `# ${trimmed}`
}

/**
 * 验证命令是否有效
 *
 * @param command - 命令字符串
 * @returns 是否为有效命令
 */
export function isValidCommand(command: string): boolean {
  const trimmed = command.trim()
  // 空字符串不是有效命令
  if (trimmed === '') return false
  // 纯注释行不是命令
  if (trimmed.startsWith('#')) return false
  return true
}

/**
 * 生成文件头部注释
 *
 * @param func - 函数文件信息
 * @param options - 生成器配置
 * @returns 头部注释文本
 */
function generateHeaderComment(
  func: FunctionFile,
  options: Required<FunctionGeneratorOptions>
): string {
  if (options.customHeader) {
    return options.customHeader
      .split('\n')
      .map(line => formatComment(line))
      .join('\n')
  }

  const lines: string[] = []
  lines.push(formatComment(`Function: ${func.name}`))

  if (func.description) {
    lines.push(formatComment(func.description))
  }

  const now = new Date()
  lines.push(formatComment(`Generated: ${now.toISOString()}`))

  return lines.join('\n')
}

/**
 * 处理单行命令
 *
 * @param line - 命令行
 * @param options - 生成器配置
 * @returns 处理后的命令行文本
 */
function processCommandLine(
  line: CommandLine,
  options: Required<FunctionGeneratorOptions>
): string {
  if (line.isComment) {
    return formatComment(line.rawText.replace(/^#\s*/, ''))
  }

  let command = line.command || line.rawText

  if (options.stripLeadingSlash) {
    command = stripSlash(command)
  }

  return command
}

/**
 * 处理命令条目
 *
 * @param entry - 命令条目
 * @param options - 生成器配置
 * @returns 处理后的文本
 */
function processCommandEntry(
  entry: CommandEntry,
  options: Required<FunctionGeneratorOptions>
): string {
  if (entry.isEmptyLine) {
    return ''
  }

  if (entry.isComment) {
    return formatComment(entry.command)
  }

  let command = entry.command

  if (options.stripLeadingSlash) {
    command = stripSlash(command)
  }

  return command
}

// ============================================================================
// 主生成器类
// ============================================================================

/**
 * 函数文件生成器类
 *
 * 提供将命令列表转换为 .mcfunction 文件格式的方法。
 *
 * @example
 * ```typescript
 * const generator = new FunctionGenerator()
 *
 * // 从 FunctionFile 生成
 * const result = generator.generate(funcFile)
 * console.log(result.content)
 *
 * // 从命令数组生成
 * const result2 = generator.generateFromCommands([
 *   { command: 'say Hello World' },
 *   { command: 'This is a comment', isComment: true },
 *   { command: '/give @p diamond 1' }
 * ])
 * ```
 */
export class FunctionGenerator {
  private options: Required<FunctionGeneratorOptions>

  /**
   * 创建函数生成器实例
   *
   * @param options - 生成器配置
   */
  constructor(options: FunctionGeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * 更新生成器配置
   *
   * @param options - 新的配置选项
   */
  updateOptions(options: Partial<FunctionGeneratorOptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * 从 FunctionFile 对象生成 .mcfunction 内容
   *
   * @param func - 函数文件对象
   * @returns 生成结果
   */
  generate(func: FunctionFile): FunctionGeneratorResult {
    const lines: string[] = []
    let commandCount = 0
    let commentCount = 0
    let emptyLineCount = 0

    // 添加头部注释
    if (this.options.includeHeaderComment) {
      const header = generateHeaderComment(func, this.options)
      if (header) {
        lines.push(header)
        commentCount += header.split('\n').length
        lines.push('') // 头部后添加空行
        emptyLineCount++
      }
    }

    // 处理每个命令行
    for (const cmdLine of func.commands) {
      const processed = processCommandLine(cmdLine, this.options)

      if (processed === '') {
        if (this.options.preserveEmptyLines) {
          lines.push('')
          emptyLineCount++
        }
      } else if (cmdLine.isComment) {
        lines.push(processed)
        commentCount++
      } else {
        lines.push(processed)
        commandCount++
      }
    }

    const content = lines.join('\n')

    return {
      content,
      commandCount,
      commentCount,
      emptyLineCount,
      totalLines: lines.length
    }
  }

  /**
   * 从命令条目数组生成 .mcfunction 内容
   *
   * @param entries - 命令条目数组
   * @param metadata - 可选的元数据
   * @returns 生成结果
   *
   * @example
   * ```typescript
   * const result = generator.generateFromCommands([
   *   { command: 'say Hello' },
   *   { command: 'This is a comment', isComment: true },
   *   { command: '', isEmptyLine: true },
   *   { command: 'give @p diamond 1' }
   * ], { name: 'test', description: 'Test function' })
   * ```
   */
  generateFromCommands(
    entries: CommandEntry[],
    metadata?: { name?: string; description?: string }
  ): FunctionGeneratorResult {
    const lines: string[] = []
    let commandCount = 0
    let commentCount = 0
    let emptyLineCount = 0

    // 添加头部注释
    if (this.options.includeHeaderComment) {
      const headerLines: string[] = []

      if (metadata?.name) {
        headerLines.push(formatComment(`Function: ${metadata.name}`))
      } else {
        headerLines.push(formatComment('Generated Function'))
      }

      if (metadata?.description) {
        headerLines.push(formatComment(metadata.description))
      }

      const now = new Date()
      headerLines.push(formatComment(`Generated: ${now.toISOString()}`))

      lines.push(...headerLines)
      commentCount += headerLines.length
      lines.push('') // 头部后添加空行
      emptyLineCount++
    }

    // 处理每个命令条目
    for (const entry of entries) {
      const processed = processCommandEntry(entry, this.options)

      if (processed === '') {
        if (this.options.preserveEmptyLines) {
          lines.push('')
          emptyLineCount++
        }
      } else if (entry.isComment) {
        lines.push(processed)
        commentCount++
      } else if (!entry.isEmptyLine) {
        lines.push(processed)
        commandCount++
      }
    }

    const content = lines.join('\n')

    return {
      content,
      commandCount,
      commentCount,
      emptyLineCount,
      totalLines: lines.length
    }
  }

  /**
   * 从字符串数组生成 .mcfunction 内容
   *
   * @param commands - 命令字符串数组
   * @param metadata - 可选的元数据
   * @returns 生成结果
   *
   * @example
   * ```typescript
   * const result = generator.generateFromStrings([
   *   'say Hello World',
   *   '# This is a comment',
   *   '/give @p diamond 1'
   * ])
   * ```
   */
  generateFromStrings(
    commands: string[],
    metadata?: { name?: string; description?: string }
  ): FunctionGeneratorResult {
    const entries: CommandEntry[] = commands.map(cmd => {
      const trimmed = cmd.trim()

      // 检测是否为注释
      if (trimmed.startsWith('#')) {
        return {
          command: trimmed.replace(/^#\s*/, ''),
          isComment: true
        }
      }

      // 检测是否为空行
      if (trimmed === '') {
        return {
          command: '',
          isEmptyLine: true
        }
      }

      return {
        command: trimmed,
        isComment: false
      }
    })

    return this.generateFromCommands(entries, metadata)
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 默认生成器实例
 */
let defaultGenerator: FunctionGenerator | null = null

/**
 * 获取默认生成器实例
 *
 * @param options - 可选的配置覆盖
 * @returns 函数生成器实例
 */
export function getFunctionGenerator(
  options?: FunctionGeneratorOptions
): FunctionGenerator {
  if (!defaultGenerator) {
    defaultGenerator = new FunctionGenerator(options)
  } else if (options) {
    defaultGenerator.updateOptions(options)
  }
  return defaultGenerator
}

/**
 * 快捷方法：将 FunctionFile 转换为 .mcfunction 内容
 *
 * @param func - 函数文件对象
 * @param options - 可选的生成器配置
 * @returns .mcfunction 文件内容
 *
 * @example
 * ```typescript
 * const content = generateMcfunction(funcFile)
 * console.log(content)
 * ```
 */
export function generateMcfunction(
  func: FunctionFile,
  options?: FunctionGeneratorOptions
): string {
  const generator = getFunctionGenerator(options)
  return generator.generate(func).content
}

/**
 * 快捷方法：将命令数组转换为 .mcfunction 内容
 *
 * @param commands - 命令数组
 * @param metadata - 可选的元数据
 * @param options - 可选的生成器配置
 * @returns .mcfunction 文件内容
 *
 * @example
 * ```typescript
 * const content = generateMcfunctionFromCommands([
 *   { command: 'say Hello' },
 *   { command: 'Comment text', isComment: true }
 * ])
 * ```
 */
export function generateMcfunctionFromCommands(
  commands: CommandEntry[],
  metadata?: { name?: string; description?: string },
  options?: FunctionGeneratorOptions
): string {
  const generator = getFunctionGenerator(options)
  return generator.generateFromCommands(commands, metadata).content
}

/**
 * 快捷方法：将字符串数组转换为 .mcfunction 内容
 *
 * @param commands - 命令字符串数组（支持 # 开头的注释）
 * @param metadata - 可选的元数据
 * @param options - 可选的生成器配置
 * @returns .mcfunction 文件内容
 *
 * @example
 * ```typescript
 * const content = generateMcfunctionFromStrings([
 *   'say Hello World',
 *   '# This is a comment',
 *   '/give @p diamond 1'
 * ])
 * ```
 */
export function generateMcfunctionFromStrings(
  commands: string[],
  metadata?: { name?: string; description?: string },
  options?: FunctionGeneratorOptions
): string {
  const generator = getFunctionGenerator(options)
  return generator.generateFromStrings(commands, metadata).content
}

/**
 * 解析 .mcfunction 文件内容为命令条目数组
 *
 * @param content - .mcfunction 文件内容
 * @returns 命令条目数组
 *
 * @example
 * ```typescript
 * const entries = parseMcfunction(`
 * # This is a comment
 * say Hello World
 * give @p diamond 1
 * `)
 * ```
 */
export function parseMcfunction(content: string): CommandEntry[] {
  const lines = content.split(/\r?\n/)
  const entries: CommandEntry[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '') {
      entries.push({ command: '', isEmptyLine: true })
    } else if (trimmed.startsWith('#')) {
      entries.push({
        command: trimmed.replace(/^#\s*/, ''),
        isComment: true
      })
    } else {
      entries.push({ command: trimmed })
    }
  }

  return entries
}
