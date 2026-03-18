/**
 * 命令导入状态管理 Store
 *
 * 功能:
 * - 管理导入对话框状态
 * - 存储待导入的命令字符串
 * - 实时验证命令有效性
 * - 解析错误信息管理
 */

import { create } from 'zustand'
import { parseCommand, type ParseError } from '@/core/parser/parser'
import { TokenType } from '@/core/parser/lexer'
import type { CommandAST } from '@/core/parser/ast'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 导入验证结果
 */
export interface ImportValidationResult {
  /** 是否有效 */
  isValid: boolean
  /** 解析后的 AST */
  ast: CommandAST | null
  /** 解析错误列表 */
  errors: ParseError[]
  /** 警告信息 */
  warnings: string[]
}

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 是否自动添加到历史记录 */
  addToHistory: boolean
  /** 是否忽略警告 */
  ignoreWarnings: boolean
  /** 是否跳过空行 */
  skipEmptyLines: boolean
  /** 是否移除注释 */
  removeComments: boolean
}

/**
 * 导入状态
 */
interface ImportState {
  // 对话框状态
  isDialogOpen: boolean
  // 输入的命令字符串
  inputText: string
  // 验证结果
  validationResult: ImportValidationResult | null
  // 是否正在验证
  isValidating: boolean
  // 导入选项
  options: ImportOptions
  // 导入历史（最近导入的命令）
  importHistory: string[]
  // 最大历史条目数
  maxImportHistory: number

  // 打开导入对话框
  openDialog: () => void
  // 关闭导入对话框
  closeDialog: () => void
  // 设置输入文本
  setInputText: (text: string) => void
  // 验证命令
  validateInput: () => void
  // 清空输入
  clearInput: () => void
  // 更新选项
  updateOptions: (options: Partial<ImportOptions>) => void
  // 添加到导入历史
  addToImportHistory: (command: string) => void
  // 清空导入历史
  clearImportHistory: () => void
  // 批量验证多行命令
  validateMultipleCommands: () => ImportValidationResult[]
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_OPTIONS: ImportOptions = {
  addToHistory: true,
  ignoreWarnings: false,
  skipEmptyLines: true,
  removeComments: true,
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 检查命令字符串是否为空或仅包含空白字符
 */
function isEmptyCommand(command: string): boolean {
  return command.trim().length === 0
}

/**
 * 检查命令字符串是否为注释
 */
function isComment(command: string): boolean {
  const trimmed = command.trim()
  return trimmed.startsWith('#') || trimmed.startsWith('//')
}

/**
 * 预处理命令字符串
 */
function preprocessCommand(command: string, options: ImportOptions): string | null {
  const trimmed = command.trim()

  // 跳过空行
  if (options.skipEmptyLines && isEmptyCommand(trimmed)) {
    return null
  }

  // 移除注释
  if (options.removeComments && isComment(trimmed)) {
    return null
  }

  return trimmed
}

/**
 * 生成警告信息
 */
function generateWarnings(ast: CommandAST | null): string[] {
  const warnings: string[] = []

  if (!ast) return warnings

  // 检查命令长度
  const rawLength = ast.raw.length
  if (rawLength > 32500) {
    warnings.push(`命令长度 (${rawLength}) 超过命令方块字符限制 (32500)`)
  } else if (rawLength > 256) {
    warnings.push(`命令长度 (${rawLength}) 超过聊天栏字符限制 (256)`)
  }

  // 检查是否有参数
  if (ast.arguments.length === 0) {
    warnings.push('命令没有参数')
  }

  return warnings
}

// ============================================================================
// Store 定义
// ============================================================================

export const useImportStore = create<ImportState>((set, get) => ({
  isDialogOpen: false,
  inputText: '',
  validationResult: null,
  isValidating: false,
  options: DEFAULT_OPTIONS,
  importHistory: [],
  maxImportHistory: 20,

  openDialog: () => {
    set({ isDialogOpen: true })
  },

  closeDialog: () => {
    set({ isDialogOpen: false })
  },

  setInputText: (text) => {
    set({ inputText: text })

    // 实时验证
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      set({ validationResult: null })
      return
    }

    // 单行命令验证
    if (!trimmed.includes('\n')) {
      const result = validateSingleCommand(trimmed)
      set({ validationResult: result })
    } else {
      // 多行命令 - 只显示基本信息，点击导入时才详细验证
      set({ validationResult: null })
    }
  },

  validateInput: () => {
    const { inputText, options } = get()
    const trimmed = inputText.trim()

    if (trimmed.length === 0) {
      set({ validationResult: null })
      return
    }

    set({ isValidating: true })

    try {
      const lines = trimmed.split('\n')
      const commands = lines
        .map((line) => preprocessCommand(line, options))
        .filter((cmd): cmd is string => cmd !== null)

      if (commands.length === 0) {
        set({
          validationResult: {
            isValid: false,
            ast: null,
            errors: [{ message: '没有找到有效的命令', token: { type: TokenType.ERROR, value: '', start: 0, end: 0, line: 1, column: 1 } }],
            warnings: [],
          },
          isValidating: false,
        })
        return
      }

      // 如果只有一行，直接验证
      if (commands.length === 1) {
        const result = validateSingleCommand(commands[0])
        set({ validationResult: result, isValidating: false })
        return
      }

      // 多行命令验证
      const allErrors: ParseError[] = []
      const allWarnings: string[] = []
      let hasValidCommand = false

      commands.forEach((cmd, index) => {
        const { ast, errors, warnings } = validateSingleCommand(cmd)
        if (errors.length > 0) {
          allErrors.push(
            ...errors.map((e) => ({
              ...e,
              message: `行 ${index + 1}: ${e.message}`,
            }))
          )
        }
        if (warnings.length > 0) {
          allWarnings.push(...warnings.map((w) => `行 ${index + 1}: ${w}`))
        }
        if (ast) {
          hasValidCommand = true
        }
      })

      set({
        validationResult: {
          isValid: hasValidCommand && allErrors.length === 0,
          ast: null, // 多行命令不返回单个 AST
          errors: allErrors,
          warnings: allWarnings,
        },
        isValidating: false,
      })
    } catch (error) {
      set({
        validationResult: {
          isValid: false,
          ast: null,
          errors: [
            {
              message: `验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
              token: { type: TokenType.ERROR, value: '', start: 0, end: 0, line: 1, column: 1 },
            },
          ],
          warnings: [],
        },
        isValidating: false,
      })
    }
  },

  clearInput: () => {
    set({ inputText: '', validationResult: null })
  },

  updateOptions: (newOptions) => {
    set((state) => ({
      options: { ...state.options, ...newOptions },
    }))
  },

  addToImportHistory: (command) => {
    set((state) => {
      const newHistory = [
        command,
        ...state.importHistory.filter((c) => c !== command),
      ].slice(0, state.maxImportHistory)
      return { importHistory: newHistory }
    })
  },

  clearImportHistory: () => {
    set({ importHistory: [] })
  },

  validateMultipleCommands: () => {
    const { inputText, options } = get()
    const trimmed = inputText.trim()

    if (trimmed.length === 0) {
      return []
    }

    const lines = trimmed.split('\n')
    const commands = lines
      .map((line) => preprocessCommand(line, options))
      .filter((cmd): cmd is string => cmd !== null)

    return commands.map((cmd) => validateSingleCommand(cmd))
  },
}))

// ============================================================================
// 辅助函数导出
// ============================================================================

/**
 * 验证单个命令
 */
export function validateSingleCommand(command: string): ImportValidationResult {
  // 移除开头的斜杠（如果有）
  const normalizedCommand = command.startsWith('/') ? command : `/${command}`

  const { ast, errors } = parseCommand(normalizedCommand)
  const warnings = generateWarnings(ast)

  return {
    isValid: errors.length === 0,
    ast,
    errors,
    warnings,
  }
}

/**
 * 从剪贴板粘贴命令
 */
export async function pasteFromClipboard(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText()
    return text
  } catch (error) {
    console.error('Failed to read from clipboard:', error)
    return ''
  }
}

/**
 * 格式化解析错误信息
 */
export function formatParseError(error: ParseError): string {
  const { message, token } = error
  return `行 ${token.line}, 列 ${token.column}: ${message}`
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook: 获取导入对话框状态
 */
export function useImportDialogState() {
  return useImportStore((state) => ({
    isOpen: state.isDialogOpen,
    inputText: state.inputText,
    validationResult: state.validationResult,
    isValidating: state.isValidating,
  }))
}

/**
 * Hook: 获取导入选项
 */
export function useImportOptions() {
  return useImportStore((state) => state.options)
}

/**
 * Hook: 获取导入历史
 */
export function useImportHistory() {
  return useImportStore((state) => state.importHistory)
}
