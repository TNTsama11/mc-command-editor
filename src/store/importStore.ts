import { create } from 'zustand'

import type { CommandAST } from '@/core/parser/ast'
import { TokenType } from '@/core/parser/lexer'
import { parseCommand, type ParseError } from '@/core/parser/parser'

export interface ImportValidationResult {
  isValid: boolean
  ast: CommandAST | null
  errors: ParseError[]
  warnings: string[]
}

export interface ImportOptions {
  addToHistory: boolean
  ignoreWarnings: boolean
  skipEmptyLines: boolean
  removeComments: boolean
}

interface ImportState {
  isDialogOpen: boolean
  inputText: string
  validationResult: ImportValidationResult | null
  isValidating: boolean
  options: ImportOptions
  importHistory: string[]
  maxImportHistory: number

  openDialog: () => void
  closeDialog: () => void
  setInputText: (text: string) => void
  validateInput: () => void
  clearInput: () => void
  updateOptions: (options: Partial<ImportOptions>) => void
  addToImportHistory: (command: string) => void
  clearImportHistory: () => void
  validateMultipleCommands: () => ImportValidationResult[]
}

const DEFAULT_OPTIONS: ImportOptions = {
  addToHistory: true,
  ignoreWarnings: false,
  skipEmptyLines: true,
  removeComments: true,
}

function isEmptyCommand(command: string) {
  return command.trim().length === 0
}

function isComment(command: string) {
  const trimmed = command.trim()
  return trimmed.startsWith('#') || trimmed.startsWith('//')
}

function preprocessCommand(command: string, options: ImportOptions): string | null {
  const trimmed = command.trim()

  if (options.skipEmptyLines && isEmptyCommand(trimmed)) {
    return null
  }

  if (options.removeComments && isComment(trimmed)) {
    return null
  }

  return trimmed
}

function generateWarnings(ast: CommandAST | null): string[] {
  const warnings: string[] = []

  if (!ast) return warnings

  const rawLength = ast.raw.length
  if (rawLength > 32500) {
    warnings.push(`命令长度 (${rawLength}) 超过命令方块字符限制 (32500)`)
  } else if (rawLength > 256) {
    warnings.push(`命令长度 (${rawLength}) 超过聊天栏字符限制 (256)`)
  }

  if (ast.arguments.length === 0) {
    warnings.push('命令没有参数')
  }

  return warnings
}

function createEmptyParseError(message: string): ParseError {
  return {
    message,
    token: {
      type: TokenType.ERROR,
      value: '',
      start: 0,
      end: 0,
      line: 1,
      column: 1,
    },
  }
}

export function validateSingleCommand(command: string): ImportValidationResult {
  const normalizedCommand = command.startsWith('/') ? command : `/${command}`
  const { ast, errors } = parseCommand(normalizedCommand)

  return {
    isValid: errors.length === 0,
    ast,
    errors,
    warnings: generateWarnings(ast),
  }
}

export async function pasteFromClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch (error) {
    console.error('读取剪贴板失败:', error)
    return ''
  }
}

export function formatParseError(error: ParseError): string {
  return `行 ${error.token.line}，列 ${error.token.column}: ${error.message}`
}

export const useImportStore = create<ImportState>((set, get) => ({
  isDialogOpen: false,
  inputText: '',
  validationResult: null,
  isValidating: false,
  options: DEFAULT_OPTIONS,
  importHistory: [],
  maxImportHistory: 20,

  openDialog: () => set({ isDialogOpen: true }),
  closeDialog: () => set({ isDialogOpen: false }),

  setInputText: (text) => {
    set({ inputText: text })

    const trimmed = text.trim()
    if (!trimmed) {
      set({ validationResult: null })
      return
    }

    if (!trimmed.includes('\n')) {
      set({ validationResult: validateSingleCommand(trimmed) })
      return
    }

    set({ validationResult: null })
  },

  validateInput: () => {
    const { inputText, options } = get()
    const trimmed = inputText.trim()

    if (!trimmed) {
      set({ validationResult: null })
      return
    }

    set({ isValidating: true })

    try {
      const commands = trimmed
        .split('\n')
        .map((line) => preprocessCommand(line, options))
        .filter((command): command is string => command !== null)

      if (commands.length === 0) {
        set({
          validationResult: {
            isValid: false,
            ast: null,
            errors: [createEmptyParseError('没有找到有效的命令。')],
            warnings: [],
          },
          isValidating: false,
        })
        return
      }

      if (commands.length === 1) {
        set({
          validationResult: validateSingleCommand(commands[0]),
          isValidating: false,
        })
        return
      }

      const errors: ParseError[] = []
      const warnings: string[] = []
      let hasValidCommand = false

      commands.forEach((command, index) => {
        const result = validateSingleCommand(command)
        if (result.ast) {
          hasValidCommand = true
        }

        result.errors.forEach((error) => {
          errors.push({
            ...error,
            message: `第 ${index + 1} 行: ${error.message}`,
          })
        })

        result.warnings.forEach((warning) => {
          warnings.push(`第 ${index + 1} 行: ${warning}`)
        })
      })

      set({
        validationResult: {
          isValid: hasValidCommand && errors.length === 0,
          ast: null,
          errors,
          warnings,
        },
        isValidating: false,
      })
    } catch (error) {
      set({
        validationResult: {
          isValid: false,
          ast: null,
          errors: [
            createEmptyParseError(
              `验证失败: ${error instanceof Error ? error.message : '未知错误'}`
            ),
          ],
          warnings: [],
        },
        isValidating: false,
      })
    }
  },

  clearInput: () => set({ inputText: '', validationResult: null }),

  updateOptions: (options) =>
    set((state) => ({
      options: { ...state.options, ...options },
    })),

  addToImportHistory: (command) =>
    set((state) => ({
      importHistory: [command, ...state.importHistory.filter((item) => item !== command)].slice(
        0,
        state.maxImportHistory
      ),
    })),

  clearImportHistory: () => set({ importHistory: [] }),

  validateMultipleCommands: () => {
    const { inputText, options } = get()
    const trimmed = inputText.trim()

    if (!trimmed) {
      return []
    }

    return trimmed
      .split('\n')
      .map((line) => preprocessCommand(line, options))
      .filter((command): command is string => command !== null)
      .map((command) => validateSingleCommand(command))
  },
}))

export function useImportDialogState() {
  return useImportStore((state) => ({
    isOpen: state.isDialogOpen,
    inputText: state.inputText,
    validationResult: state.validationResult,
    isValidating: state.isValidating,
  }))
}

export function useImportOptions() {
  return useImportStore((state) => state.options)
}

export function useImportHistory() {
  return useImportStore((state) => state.importHistory)
}
