/**
 * Minecraft 命令语法分析器 (Parser)
 *
 * 将 Token 序列解析为 AST
 */

import type { Token, TokenType } from './lexer'
import { Lexer, TokenType as TT } from './lexer'
import type {
  CommandAST,
  CommandArgument,
  Position,
  Coordinate,
  TargetSelector,
  PlayerReference,
  ResourceLocation,
  NBTCompound,
  NBTValue,
} from './ast'
import { isKnownCommand } from './commands'

export interface ParseError {
  message: string
  token: Token
}

export class Parser {
  private tokens: Token[] = []
  private pos: number = 0
  private errors: ParseError[] = []
  private rawInput: string = ''

  parse(input: string): { ast: CommandAST | null; errors: ParseError[] } {
    this.rawInput = input
    const lexer = new Lexer()
    const { tokens: lexTokens, errors: lexErrors } = lexer.tokenize(input)

    // 将词法错误转换为解析错误格式
    for (const err of lexErrors) {
      this.errors.push({
        message: err.message,
        token: {
          type: TT.ERROR,
          value: '',
          start: err.start,
          end: err.end,
          line: err.line,
          column: err.column,
        },
      })
    }

    this.tokens = lexTokens
    this.pos = 0

    const ast = this.parseCommand()

    return { ast, errors: this.errors }
  }

  private parseCommand(): CommandAST | null {
    // 跳过开头的斜杠
    if (this.check(TT.SLASH)) {
      this.advance()
    }

    // 读取命令名称
    const nameToken = this.consume(TT.IDENTIFIER, 'Expected command name')
    if (!nameToken) return null

    const commandName = nameToken.value.toLowerCase()

    // 解析参数
    const arguments_: CommandArgument[] = []
    while (!this.isAtEnd() && !this.check(TT.EOF)) {
      const arg = this.parseArgument()
      if (arg) {
        arguments_.push(arg)
      } else {
        break
      }
    }

    return {
      command: commandName,
      raw: this.rawInput,
      arguments: arguments_,
      parsed: true,
    }
  }

  private parseArgument(): CommandArgument | null {
    if (this.isAtEnd()) return null

    // 检查是否是目标选择器 (@a, @e, @p, @r, @s)
    if (this.check(TT.AT)) {
      return this.parseTargetSelector()
    }

    // 检查是否是坐标 (~, ^)
    if (this.check(TT.TILDE) || this.check(TT.CARET)) {
      return this.parsePosition()
    }

    // 检查是否是数字（可能是坐标的一部分）
    if (this.check(TT.NUMBER)) {
      return this.parseNumberOrPosition()
    }

    // 检查是否是布尔值
    if (this.check(TT.BOOLEAN)) {
      const token = this.advance()
      return { type: 'boolean', value: token.value === 'true' }
    }

    // 检查是否是字符串
    if (this.check(TT.STRING)) {
      const token = this.advance()
      return { type: 'string', value: token.value }
    }

    // 检查是否是标识符（可能是资源位置、玩家名、或其他）
    if (this.check(TT.IDENTIFIER)) {
      return this.parseIdentifier()
    }

    // 检查是否是 NBT
    if (this.check(TT.LBRACE)) {
      return this.parseNBT()
    }

    // 检查是否是范围
    const savedPos = this.pos
    const range = this.tryParseRange()
    if (range) {
      return range
    }
    this.pos = savedPos

    // 未知参数类型
    const token = this.advance()
    this.addError(`Unexpected token: ${token.value}`, token)
    return null
  }

  private parseTargetSelector(): CommandArgument {
    this.advance() // 消耗 @

    const selectorToken = this.consume(TT.IDENTIFIER, 'Expected selector type (a, e, p, r, s)')
    const selectorType = selectorToken?.value || 's'

    const target: TargetSelector = {
      type: `@${selectorType}` as TargetSelector['type'],
    }

    // 检查是否有选择器参数 [key=value,...]
    if (this.check(TT.LBRACKET)) {
      this.advance()
      target.arguments = {}

      while (!this.check(TT.RBRACKET) && !this.isAtEnd()) {
        const keyToken = this.consume(TT.IDENTIFIER, 'Expected selector argument key')
        if (!keyToken) break

        if (!this.check(TT.EQUALS)) {
          this.addError('Expected = after selector argument key', this.peek())
          break
        }
        this.advance() // 消耗 =

        // 解析值（可能是数字、标识符、范围等）
        const value = this.parseSelectorValue()
        target.arguments[keyToken.value] = value

        // 检查是否有逗号
        if (this.check(TT.COMMA)) {
          this.advance()
        }
      }

      this.consume(TT.RBRACKET, 'Expected ] to close selector arguments')
    }

    return { type: 'entity', value: target }
  }

  private parseSelectorValue(): unknown {
    // 处理感叹号（否定）
    let negated = false
    if (this.check(TT.EXCLAIM)) {
      this.advance()
      negated = true
    }

    // 数字
    if (this.check(TT.NUMBER)) {
      const num = parseFloat(this.advance().value)
      return negated ? `!${num}` : num
    }

    // 标识符或范围
    if (this.check(TT.IDENTIFIER)) {
      const value = this.advance().value

      // 检查是否是范围 (..)
      if (this.check(TT.RANGE)) {
        this.advance()
        const endValue = this.check(TT.NUMBER) ? parseFloat(this.advance().value) : undefined
        return negated ? `!${value}..${endValue ?? ''}` : { min: parseFloat(value), max: endValue }
      }

      return negated ? `!${value}` : value
    }

    // 范围开始 (..)
    if (this.check(TT.RANGE)) {
      this.advance()
      const endValue = this.check(TT.NUMBER) ? parseFloat(this.advance().value) : undefined
      return negated ? `!..${endValue ?? ''}` : { max: endValue }
    }

    this.addError('Expected selector value', this.peek())
    return null
  }

  private parsePosition(): CommandArgument {
    const coords: Coordinate[] = []

    for (let i = 0; i < 3; i++) {
      if (this.check(TT.TILDE)) {
        this.advance()
        let value = 0
        if (this.check(TT.NUMBER)) {
          value = parseFloat(this.advance().value)
        }
        coords.push({ type: 'relative', value })
      } else if (this.check(TT.CARET)) {
        this.advance()
        let value = 0
        if (this.check(TT.NUMBER)) {
          value = parseFloat(this.advance().value)
        }
        coords.push({ type: 'local', value })
      } else if (this.check(TT.NUMBER)) {
        coords.push({ type: 'absolute', value: parseFloat(this.advance().value) })
      } else {
        this.addError(`Expected coordinate ${i + 1}`, this.peek())
        break
      }
    }

    const position: Position = {
      x: coords[0] || { type: 'relative', value: 0 },
      y: coords[1] || { type: 'relative', value: 0 },
      z: coords[2] || { type: 'relative', value: 0 },
    }

    return { type: 'position', value: position }
  }

  private parseNumberOrPosition(): CommandArgument {
    // 如果连续三个数字，可能是坐标
    const savedPos = this.pos
    const firstNum = parseFloat(this.advance().value)

    // 检查下一个 token
    if (this.check(TT.NUMBER)) {
      // 回退并作为坐标解析
      this.pos = savedPos
      return this.parsePosition()
    }

    // 单独的数字
    // 检查是否有单位（时间）
    if (this.check(TT.IDENTIFIER)) {
      const nextVal = this.peek().value
      if (['t', 's', 'd'].includes(nextVal)) {
        const unit = this.advance().value
        return { type: 'time', value: { value: firstNum, unit } }
      }
    }

    return { type: 'number', value: firstNum }
  }

  private parseIdentifier(): CommandArgument {
    const token = this.advance()
    let value = token.value

    // 检查是否是资源位置 (namespace:path)
    if (this.check(TT.COLON)) {
      this.advance() // 消耗 :
      const pathToken = this.consume(TT.IDENTIFIER, 'Expected path after :')
      if (pathToken) {
        value = `${value}:${pathToken.value}`
      }
    }

    // 检查是否是玩家名（不包含特殊字符）
    if (/^[a-zA-Z0-9_]+$/.test(value) && !isKnownCommand(value)) {
      // 可能是玩家名
      return { type: 'entity', value: { type: 'player', value } as PlayerReference }
    }

    // 作为字符串或资源位置返回
    if (value.includes(':') || /^[a-z_]+$/.test(value)) {
      return { type: 'resource', value: this.parseResourceLocation(value) }
    }

    return { type: 'string', value }
  }

  private parseResourceLocation(input: string): ResourceLocation {
    if (input.includes(':')) {
      const [namespace, path] = input.split(':')
      return { namespace, path }
    }
    return { namespace: 'minecraft', path: input }
  }

  private parseNBT(): CommandArgument {
    const nbt = this.parseNBTValue()
    return { type: 'nbt', value: nbt as NBTCompound }
  }

  private parseNBTValue(): NBTValue | null {
    if (this.check(TT.LBRACE)) {
      return this.parseNBTCompound()
    }
    if (this.check(TT.LBRACKET)) {
      return this.parseNBTList()
    }
    if (this.check(TT.STRING)) {
      return this.advance().value
    }
    if (this.check(TT.NUMBER)) {
      const numStr = this.advance().value
      // 检查是否有类型后缀
      if (this.check(TT.IDENTIFIER)) {
        const suffix = this.peek().value
        if (/^[bslfdBSLFD]$/.test(suffix)) {
          this.advance()
          return parseFloat(numStr) // 返回数字，忽略后缀
        }
      }
      return parseFloat(numStr)
    }
    if (this.check(TT.BOOLEAN)) {
      return this.advance().value === 'true'
    }

    this.addError('Expected NBT value', this.peek())
    return null
  }

  private parseNBTCompound(): NBTCompound {
    this.advance() // 消耗 {
    const result: NBTCompound = {}

    while (!this.check(TT.RBRACE) && !this.isAtEnd()) {
      // 键可以是字符串或标识符
      let key: string
      if (this.check(TT.STRING)) {
        key = this.advance().value
      } else if (this.check(TT.IDENTIFIER)) {
        key = this.advance().value
      } else {
        this.addError('Expected NBT key', this.peek())
        break
      }

      if (!this.check(TT.COLON)) {
        this.addError('Expected : after NBT key', this.peek())
        break
      }
      this.advance() // 消耗 :

      const value = this.parseNBTValue()
      if (value !== null) {
        result[key] = value
      }

      // 逗号分隔
      if (this.check(TT.COMMA)) {
        this.advance()
      }
    }

    this.consume(TT.RBRACE, 'Expected } to close NBT compound')
    return result
  }

  private parseNBTList(): NBTValue[] {
    this.advance() // 消耗 [
    const result: NBTValue[] = []

    while (!this.check(TT.RBRACKET) && !this.isAtEnd()) {
      const value = this.parseNBTValue()
      if (value !== null) {
        result.push(value)
      }

      if (this.check(TT.COMMA)) {
        this.advance()
      }
    }

    this.consume(TT.RBRACKET, 'Expected ] to close NBT list')
    return result
  }

  private tryParseRange(): CommandArgument | null {
    // 尝试解析范围 min..max 或 ..max 或 min..
    let min: number | undefined
    let max: number | undefined
    let exact: number | undefined

    if (this.check(TT.NUMBER)) {
      min = parseFloat(this.advance().value)

      if (this.check(TT.RANGE)) {
        this.advance()
        if (this.check(TT.NUMBER)) {
          max = parseFloat(this.advance().value)
        }
        return { type: 'range', value: { min, max } }
      }

      // 精确值
      exact = min
      return { type: 'range', value: { exact } }
    }

    if (this.check(TT.RANGE)) {
      this.advance()
      if (this.check(TT.NUMBER)) {
        max = parseFloat(this.advance().value)
      }
      return { type: 'range', value: { max } }
    }

    return null
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private advance(): Token {
    if (!this.isAtEnd()) {
      return this.tokens[this.pos++]
    }
    return this.tokens[this.tokens.length - 1]
  }

  private peek(): Token {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1]
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false
    return this.peek().type === type
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.peek().type === TT.EOF
  }

  private consume(type: TokenType, message: string): Token | null {
    if (this.check(type)) {
      return this.advance()
    }
    this.addError(message, this.peek())
    return null
  }

  private addError(message: string, token: Token): void {
    this.errors.push({ message, token })
  }
}

export const parser = new Parser()

// 便捷函数
export function parseCommand(input: string): { ast: CommandAST | null; errors: ParseError[] } {
  return parser.parse(input)
}
