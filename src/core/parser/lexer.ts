/**
 * Minecraft 命令词法分析器 (Lexer)
 *
 * 将命令字符串分解为 Token 序列
 */

export enum TokenType {
  // 字面量
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  IDENTIFIER = 'IDENTIFIER',

  // 特殊符号
  SLASH = 'SLASH',           // /
  TILDE = 'TILDE',           // ~
  CARET = 'CARET',           // ^
  AT = 'AT',                 // @
  COLON = 'COLON',           // :
  DOT = 'DOT',               // .
  COMMA = 'COMMA',           // ,
  EQUALS = 'EQUALS',         // =
  EXCLAIM = 'EXCLAIM',       // !
  HASH = 'HASH',             // #

  // 括号
  LPAREN = 'LPAREN',         // (
  RPAREN = 'RPAREN',         // )
  LBRACE = 'LBRACE',         // {
  RBRACE = 'RBRACE',         // }
  LBRACKET = 'LBRACKET',     // [
  RBRACKET = 'RBRACKET',     // ]

  // 范围
  RANGE = 'RANGE',           // ..

  // 结束
  EOF = 'EOF',
  ERROR = 'ERROR',
}

export interface Token {
  type: TokenType
  value: string
  start: number
  end: number
  line: number
  column: number
}

export interface LexerError {
  message: string
  start: number
  end: number
  line: number
  column: number
}

export class Lexer {
  private input: string = ''
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private tokens: Token[] = []
  private errors: LexerError[] = []

  tokenize(input: string): { tokens: Token[]; errors: LexerError[] } {
    this.input = input
    this.pos = 0
    this.line = 1
    this.column = 1
    this.tokens = []
    this.errors = []

    while (!this.isAtEnd()) {
      this.skipWhitespace()
      if (this.isAtEnd()) break

      const token = this.nextToken()
      if (token) {
        this.tokens.push(token)
      }
    }

    this.tokens.push(this.makeToken(TokenType.EOF, '', this.pos, this.pos))

    return { tokens: this.tokens, errors: this.errors }
  }

  private nextToken(): Token | null {
    const start = this.pos
    const startLine = this.line
    const startColumn = this.column

    const char = this.advance()

    switch (char) {
      case '/':
        return this.makeToken(TokenType.SLASH, '/', start, this.pos, startLine, startColumn)
      case '~':
        return this.makeToken(TokenType.TILDE, '~', start, this.pos, startLine, startColumn)
      case '^':
        return this.makeToken(TokenType.CARET, '^', start, this.pos, startLine, startColumn)
      case '@':
        return this.makeToken(TokenType.AT, '@', start, this.pos, startLine, startColumn)
      case ':':
        return this.makeToken(TokenType.COLON, ':', start, this.pos, startLine, startColumn)
      case '.':
        if (this.peek() === '.') {
          this.advance()
          return this.makeToken(TokenType.RANGE, '..', start, this.pos, startLine, startColumn)
        }
        return this.makeToken(TokenType.DOT, '.', start, this.pos, startLine, startColumn)
      case ',':
        return this.makeToken(TokenType.COMMA, ',', start, this.pos, startLine, startColumn)
      case '=':
        return this.makeToken(TokenType.EQUALS, '=', start, this.pos, startLine, startColumn)
      case '!':
        return this.makeToken(TokenType.EXCLAIM, '!', start, this.pos, startLine, startColumn)
      case '#':
        return this.makeToken(TokenType.HASH, '#', start, this.pos, startLine, startColumn)
      case '(':
        return this.makeToken(TokenType.LPAREN, '(', start, this.pos, startLine, startColumn)
      case ')':
        return this.makeToken(TokenType.RPAREN, ')', start, this.pos, startLine, startColumn)
      case '{':
        return this.makeToken(TokenType.LBRACE, '{', start, this.pos, startLine, startColumn)
      case '}':
        return this.makeToken(TokenType.RBRACE, '}', start, this.pos, startLine, startColumn)
      case '[':
        return this.makeToken(TokenType.LBRACKET, '[', start, this.pos, startLine, startColumn)
      case ']':
        return this.makeToken(TokenType.RBRACKET, ']', start, this.pos, startLine, startColumn)
      case '"':
      case "'":
        return this.readString(char, start, startLine, startColumn)
      default:
        if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek()))) {
          return this.readNumber(start, startLine, startColumn)
        }
        if (this.isAlpha(char)) {
          return this.readIdentifier(start, startLine, startColumn)
        }
        this.addError(`Unexpected character: ${char}`, start, this.pos, startLine, startColumn)
        return null
    }
  }

  private readString(quote: string, start: number, startLine: number, startColumn: number): Token {
    let value = ''

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance()
        if (!this.isAtEnd()) {
          value += this.advance()
        }
      } else {
        value += this.advance()
      }
    }

    if (this.isAtEnd()) {
      this.addError('Unterminated string', start, this.pos, startLine, startColumn)
    } else {
      this.advance()
    }

    return this.makeToken(TokenType.STRING, value, start, this.pos, startLine, startColumn)
  }

  private readNumber(start: number, startLine: number, startColumn: number): Token {
    let value = ''

    if (this.input[this.pos - 1] === '-') {
      value = '-'
    } else {
      this.pos--
      this.column--
    }

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance()
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance()
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance()
      }
    }

    return this.makeToken(TokenType.NUMBER, value, start, this.pos, startLine, startColumn)
  }

  private readIdentifier(start: number, startLine: number, startColumn: number): Token {
    let value = ''

    this.pos--
    this.column--

    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      value += this.advance()
    }

    if (value === 'true' || value === 'false') {
      return this.makeToken(TokenType.BOOLEAN, value, start, this.pos, startLine, startColumn)
    }

    return this.makeToken(TokenType.IDENTIFIER, value, start, this.pos, startLine, startColumn)
  }

  private advance(): string {
    const char = this.input[this.pos++]
    if (char === '\n') {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
    return char
  }

  private peek(): string {
    return this.input[this.pos] || '\0'
  }

  private peekNext(): string {
    return this.input[this.pos + 1] || '\0'
  }

  private isAtEnd(): boolean {
    return this.pos >= this.input.length
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9'
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_'
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char)
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek()
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance()
      } else if (char === '#' && this.pos === 0) {
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance()
        }
      } else {
        break
      }
    }
  }

  private makeToken(
    type: TokenType,
    value: string,
    start: number,
    end: number,
    line: number = this.line,
    column: number = this.column
  ): Token {
    return { type, value, start, end, line, column }
  }

  private addError(message: string, start: number, end: number, line: number, column: number): void {
    this.errors.push({ message, start, end, line, column })
  }
}

export const lexer = new Lexer()
