/**
 * Minecraft 命令语法高亮组件
 *
 * 提供命令字符串的语法高亮功能，支持深色/浅色主题
 *
 * 语法元素颜色：
 * - 命令名 (绿色)
 * - 目标选择器 (蓝色)
 * - 坐标 (紫色)
 * - 资源位置 (黄色)
 * - NBT (红色)
 * - 字符串 (灰色)
 * - 数字 (橙色)
 */

import { useMemo, createContext, useContext, ReactNode, FC } from 'react'
import { cn } from '@/lib/utils'
import { lexer, TokenType, Token } from '@/core/parser/lexer'

// ============================================================================
// 类型定义
// ============================================================================

/** 语法高亮元素类型 */
export type SyntaxKind =
  | 'command'      // 命令名
  | 'selector'     // 目标选择器 (@p, @a, @e, @r, @s)
  | 'coordinate'   // 坐标 (含 ~ ^ 前缀)
  | 'resource'     // 资源位置 (命名空间:路径)
  | 'nbt'          // NBT 数据
  | 'string'       // 字符串
  | 'number'       // 数字
  | 'boolean'      // 布尔值
  | 'operator'     // 操作符 (= : , 等)
  | 'bracket'      // 括号
  | 'slash'        // 斜杠
  | 'text'         // 普通文本
  | 'error'        // 错误

/** 高亮 Token */
export interface HighlightToken {
  type: SyntaxKind
  value: string
  start: number
  end: number
}

/** 高亮结果 */
export interface HighlightResult {
  tokens: HighlightToken[]
  raw: string
  errors: Array<{ message: string; start: number; end: number }>
}

/** 主题配置 */
export interface SyntaxTheme {
  command: string
  selector: string
  coordinate: string
  resource: string
  nbt: string
  string: string
  number: string
  boolean: string
  operator: string
  bracket: string
  slash: string
  text: string
  error: string
}

// ============================================================================
// 主题配置
// ============================================================================

/** 深色主题 */
export const darkTheme: SyntaxTheme = {
  command: 'text-emerald-400',      // 绿色
  selector: 'text-sky-400',          // 蓝色
  coordinate: 'text-purple-400',     // 紫色
  resource: 'text-amber-400',        // 黄色
  nbt: 'text-rose-400',              // 红色
  string: 'text-slate-400',          // 灰色
  number: 'text-orange-400',         // 橙色
  boolean: 'text-cyan-400',          // 青色
  operator: 'text-slate-500',        // 操作符
  bracket: 'text-slate-500',         // 括号
  slash: 'text-emerald-400',         // 斜杠与命令同色
  text: 'text-slate-300',            // 普通文本
  error: 'text-red-400 underline',   // 错误
}

/** 浅色主题 */
export const lightTheme: SyntaxTheme = {
  command: 'text-emerald-600',       // 绿色
  selector: 'text-blue-600',         // 蓝色
  coordinate: 'text-purple-600',     // 紫色
  resource: 'text-amber-600',        // 黄色
  nbt: 'text-red-600',               // 红色
  string: 'text-slate-500',          // 灰色
  number: 'text-orange-600',         // 橙色
  boolean: 'text-cyan-600',          // 青色
  operator: 'text-slate-400',        // 操作符
  bracket: 'text-slate-400',         // 括号
  slash: 'text-emerald-600',         // 斜杠
  text: 'text-slate-700',            // 普通文本
  error: 'text-red-600 underline',   // 错误
}

// ============================================================================
// 语法分析工具函数
// ============================================================================

/** 已知的 Minecraft 命令列表 */
const KNOWN_COMMANDS = new Set([
  'give', 'tp', 'teleport', 'summon', 'kill', 'clear', 'gamemode',
  'effect', 'enchant', 'fill', 'setblock', 'clone', 'execute',
  'scoreboard', 'tell', 'say', 'title', 'bossbar', 'worldborder',
  'time', 'weather', 'difficulty', 'defaultgamemode', 'gamerule',
  'spreadplayers', 'spawnpoint', 'setworldspawn', 'locate',
  'datapack', 'function', 'schedule', 'forceload', 'tag', 'team',
  'bossbar', 'data', 'item', 'attribute', 'place', 'ride',
  'damage', 'random', 'return', 'trigger', 'advancement', 'recipe',
  'loot', 'attribute', 'experience', 'xp', 'help', 'me', 'msg',
  'w', 'tellraw', 'titleraw', 'particle', 'playsound', 'stopsound',
  'stop', 'save-all', 'save-off', 'save-on', 'whitelist', 'op',
  'deop', 'kick', 'ban', 'ban-ip', 'pardon', 'pardon-ip', 'list',
  'debug', 'seed', 'publish', 'reload', 'perf', 'setidletimeout',
  'testfor', 'testforblock', 'testforblocks', 'blockdata', 'entitydata',
  'replaceitem', 'stats', 'toggledownfield', 'clearspawnpoint',
])

/**
 * 判断是否为目标选择器
 * 支持: @p, @a, @e, @r, @s
 */
function isSelector(value: string): boolean {
  return /^@[parse](\s|$|\[)/.test(value)
}

/**
 * 判断是否为坐标
 * 支持: 绝对坐标、相对坐标(~)、局部坐标(^)
 */
function isCoordinate(value: string): boolean {
  return /^[~^]?-?\d+(\.\d+)?$/.test(value)
}

/**
 * 判断是否为资源位置
 * 支持: minecraft:stone, stone, namespace:path
 */
function isResourceLocation(value: string): boolean {
  return /^[a-z0-9_.-]+(:[a-z0-9_.-/]+)?$/i.test(value) && value.includes(':') || /^[a-z_][a-z0-9_]*$/i.test(value)
}

/**
 * 判断是否为 NBT 路径或键
 */
function isNBTPath(value: string): boolean {
  // NBT 路径可能包含 {} [] 等
  return /^\{.+\}$|^\[.+\]$/.test(value)
}

/**
 * 将 Lexer Token 转换为语法高亮 Token
 */
function classifyToken(token: Token, prevToken: Token | null, _nextToken: Token | null): SyntaxKind {
  // 斜杠
  if (token.type === TokenType.SLASH) {
    return 'slash'
  }

  // 字符串
  if (token.type === TokenType.STRING) {
    return 'string'
  }

  // 数字
  if (token.type === TokenType.NUMBER) {
    return 'number'
  }

  // 布尔值
  if (token.type === TokenType.BOOLEAN) {
    return 'boolean'
  }

  // 操作符
  if (
    token.type === TokenType.EQUALS ||
    token.type === TokenType.COLON ||
    token.type === TokenType.COMMA ||
    token.type === TokenType.DOT ||
    token.type === TokenType.RANGE
  ) {
    return 'operator'
  }

  // 括号
  if (
    token.type === TokenType.LPAREN ||
    token.type === TokenType.RPAREN ||
    token.type === TokenType.LBRACE ||
    token.type === TokenType.RBRACE ||
    token.type === TokenType.LBRACKET ||
    token.type === TokenType.RBRACKET
  ) {
    return 'bracket'
  }

  // 标识符处理
  if (token.type === TokenType.IDENTIFIER) {
    const value = token.value

    // 命令名 (紧跟斜杠后的标识符，或已知命令)
    if (
      (prevToken?.type === TokenType.SLASH) ||
      (prevToken === null && KNOWN_COMMANDS.has(value.toLowerCase()))
    ) {
      return 'command'
    }

    // 目标选择器 (@p, @a, @e, @r, @s)
    if (isSelector(value)) {
      return 'selector'
    }

    // 坐标 (带 ~ 或 ^ 前缀的数字)
    if (isCoordinate(value)) {
      return 'coordinate'
    }

    // NBT 数据 (花括号内容)
    if (isNBTPath(value)) {
      return 'nbt'
    }

    // 资源位置 (包含冒号的标识符，如 minecraft:stone)
    if (isResourceLocation(value)) {
      return 'resource'
    }

    // 默认为文本
    return 'text'
  }

  // 波浪号和插入符用于坐标
  if (token.type === TokenType.TILDE || token.type === TokenType.CARET) {
    return 'coordinate'
  }

  // @ 符号
  if (token.type === TokenType.AT) {
    return 'selector'
  }

  // 错误
  if (token.type === TokenType.ERROR) {
    return 'error'
  }

  return 'text'
}

/**
 * 对命令字符串进行语法高亮分析
 * @param input 命令字符串
 * @returns 高亮结果
 */
export function highlightCommand(input: string): HighlightResult {
  const { tokens: lexerTokens, errors: lexerErrors } = lexer.tokenize(input)

  const highlightTokens: HighlightToken[] = []

  for (let i = 0; i < lexerTokens.length; i++) {
    const token = lexerTokens[i]
    if (token.type === TokenType.EOF) continue

    const prevToken = i > 0 ? lexerTokens[i - 1] : null
    const nextToken = i < lexerTokens.length - 1 ? lexerTokens[i + 1] : null

    const kind = classifyToken(token, prevToken, nextToken)

    highlightTokens.push({
      type: kind,
      value: token.value,
      start: token.start,
      end: token.end,
    })
  }

  return {
    tokens: highlightTokens,
    raw: input,
    errors: lexerErrors.map((e) => ({
      message: e.message,
      start: e.start,
      end: e.end,
    })),
  }
}

/**
 * 高亮分析的高级版本，支持上下文感知
 * 更准确地识别命令中的各种元素
 */
export function highlightCommandAdvanced(input: string): HighlightResult {
  // 首先进行基本分析
  const baseResult = highlightCommand(input)

  // 重新扫描以获得更好的上下文感知
  const tokens = baseResult.tokens
  let isFirstIdentifier = true

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    // 第一个标识符通常是命令名
    if (token.type === 'text' && isFirstIdentifier) {
      token.type = 'command'
      isFirstIdentifier = false
    }

    // 斜杠后的第一个标识符是命令名
    if (i > 0 && tokens[i - 1].type === 'slash' && token.type === 'text') {
      token.type = 'command'
    }
  }

  return baseResult
}

// ============================================================================
// React 组件
// ============================================================================

/** 主题上下文 */
const ThemeContext = createContext<SyntaxTheme>(darkTheme)

/** 获取当前主题的 Hook */
export function useSyntaxTheme(): SyntaxTheme {
  return useContext(ThemeContext)
}

/** 主题提供者 Props */
interface SyntaxThemeProviderProps {
  theme?: 'dark' | 'light' | SyntaxTheme
  children: ReactNode
}

/**
 * 语法高亮主题提供者
 */
export const SyntaxThemeProvider: FC<SyntaxThemeProviderProps> = ({
  theme = 'dark',
  children,
}) => {
  const themeValue = useMemo(() => {
    if (typeof theme === 'string') {
      return theme === 'dark' ? darkTheme : lightTheme
    }
    return theme
  }, [theme])

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  )
}

/** 获取语法元素对应的 CSS 类名 */
export function getSyntaxClassName(kind: SyntaxKind, theme: SyntaxTheme): string {
  return theme[kind] || theme.text
}

/** 单个高亮 Span 组件 Props */
interface HighlightSpanProps {
  token: HighlightToken
  theme?: SyntaxTheme
}

/**
 * 单个高亮 Span 组件
 */
export const HighlightSpan: FC<HighlightSpanProps> = ({ token, theme }) => {
  const contextTheme = useSyntaxTheme()
  const activeTheme = theme || contextTheme

  return (
    <span className={cn('font-mono', getSyntaxClassName(token.type, activeTheme))}>
      {token.value}
    </span>
  )
}

/** 语法高亮组件 Props */
interface SyntaxHighlighterProps {
  /** 命令字符串 */
  code: string
  /** 主题 (dark/light 或自定义主题对象) */
  theme?: 'dark' | 'light' | SyntaxTheme
  /** 是否使用高级分析模式 */
  advanced?: boolean
  /** 容器类名 */
  className?: string
  /** 是否显示为行内元素 */
  inline?: boolean
  /** 是否显示错误提示 */
  showErrors?: boolean
}

/**
 * 语法高亮组件
 *
 * @example
 * ```tsx
 * <SyntaxHighlighter code="/give @p minecraft:diamond 64" />
 * ```
 *
 * @example 使用深色主题
 * ```tsx
 * <SyntaxHighlighter code="/tp @p ~ ~ ~" theme="dark" />
 * ```
 *
 * @example 使用自定义主题
 * ```tsx
 * <SyntaxHighlighter
 *   code="/summon zombie ~ ~ ~ {CustomName:'"Zombie"'}"
 *   advanced
 *   showErrors
 * />
 * ```
 */
export const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
  code,
  theme = 'dark',
  advanced = false,
  className,
  inline = false,
  showErrors = false,
}) => {
  // 解析命令
  const result = useMemo(() => {
    return advanced ? highlightCommandAdvanced(code) : highlightCommand(code)
  }, [code, advanced])

  // 获取主题
  const themeValue = useMemo(() => {
    if (typeof theme === 'string') {
      return theme === 'dark' ? darkTheme : lightTheme
    }
    return theme
  }, [theme])

  // 渲染高亮内容
  const content = useMemo(() => {
    if (result.tokens.length === 0) {
      return <span className={themeValue.text}>{code}</span>
    }

    const elements: ReactNode[] = []
    let lastEnd = 0

    result.tokens.forEach((token, index) => {
      // 处理 token 之间的空白
      if (token.start > lastEnd) {
        const whitespace = code.slice(lastEnd, token.start)
        if (whitespace) {
          elements.push(
            <span key={`ws-${index}`} className={themeValue.text}>
              {whitespace}
            </span>
          )
        }
      }

      elements.push(
        <HighlightSpan key={`token-${index}`} token={token} theme={themeValue} />
      )

      lastEnd = token.end
    })

    // 处理尾部未解析的内容
    if (lastEnd < code.length) {
      elements.push(
        <span key="tail" className={themeValue.text}>
          {code.slice(lastEnd)}
        </span>
      )
    }

    return elements
  }, [result, code, themeValue])

  const Container = inline ? 'span' : 'pre'
  const containerClassName = cn(
    'font-mono',
    inline ? 'inline' : 'whitespace-pre-wrap break-all',
    className
  )

  return (
    <SyntaxThemeProvider theme={theme}>
      <Container className={containerClassName}>
        {content}
      </Container>
      {showErrors && result.errors.length > 0 && (
        <div className="mt-2 text-xs text-red-500">
          {result.errors.map((error, index) => (
            <div key={index}>
              位置 {error.start}: {error.message}
            </div>
          ))}
        </div>
      )}
    </SyntaxThemeProvider>
  )
}

// ============================================================================
// 工具组件
// ============================================================================

/** 行内代码高亮组件 Props */
interface InlineCodeProps {
  code: string
  theme?: 'dark' | 'light'
  className?: string
}

/**
 * 行内代码高亮组件
 * 用于在文本中嵌入高亮的命令片段
 */
export const InlineCode: FC<InlineCodeProps> = ({
  code,
  theme = 'dark',
  className,
}) => {
  return (
    <SyntaxHighlighter
      code={code}
      theme={theme}
      inline
      className={cn(
        'px-1.5 py-0.5 rounded bg-muted text-sm',
        className
      )}
    />
  )
}

/** 代码块高亮组件 Props */
interface CodeBlockProps {
  code: string
  theme?: 'dark' | 'light'
  className?: string
  showLineNumbers?: boolean
}

/**
 * 代码块高亮组件
 * 用于显示多行命令或命令组
 */
export const CodeBlock: FC<CodeBlockProps> = ({
  code,
  theme = 'dark',
  className,
  showLineNumbers = false,
}) => {
  const lines = code.split('\n')

  return (
    <div
      className={cn(
        'rounded-md bg-muted p-4 overflow-auto',
        theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100',
        className
      )}
    >
      {lines.map((line, index) => (
        <div key={index} className="flex">
          {showLineNumbers && (
            <span
              className={cn(
                'select-none text-right pr-4 w-8',
                theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
              )}
            >
              {index + 1}
            </span>
          )}
          <SyntaxHighlighter code={line} theme={theme} />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// 导出
// ============================================================================

export default SyntaxHighlighter
