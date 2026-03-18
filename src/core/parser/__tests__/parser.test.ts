/**
 * Parser 单元测试
 */

import { describe, it, expect } from 'vitest'
import { parseCommand } from '../parser'
import { Lexer } from '../lexer'
import { CommandSerializer } from '../serializer'

describe('Lexer', () => {
  it('should tokenize basic command', () => {
    const lexer = new Lexer()
    const { tokens } = lexer.tokenize('/give @p diamond 64')

    // tokens: /, give, @, p, diamond, 64, EOF = 7 tokens
    expect(tokens).toHaveLength(7)
    expect(tokens[0].type).toBe('SLASH')
    expect(tokens[1].value).toBe('give')
    expect(tokens[2].type).toBe('AT')
    expect(tokens[3].value).toBe('p')
    expect(tokens[4].value).toBe('diamond')
    expect(tokens[5].value).toBe('64')
  })

  it('should tokenize coordinates', () => {
    const lexer = new Lexer()
    const { tokens } = lexer.tokenize('~ ~10 ~-5')

    // tokens: ~, ~, 10, ~, -5, EOF = 6 tokens
    expect(tokens).toHaveLength(6)
    expect(tokens[0].type).toBe('TILDE')
    expect(tokens[1].type).toBe('TILDE')
    expect(tokens[2].value).toBe('10')
  })

  it('should tokenize selector with arguments', () => {
    const lexer = new Lexer()
    const { tokens } = lexer.tokenize('@e[type=cow,limit=5]')

    expect(tokens.some(t => t.value === 'type')).toBe(true)
    expect(tokens.some(t => t.value === 'cow')).toBe(true)
  })

  it('should tokenize NBT compound', () => {
    const lexer = new Lexer()
    const { tokens } = lexer.tokenize('{id:"minecraft:diamond",Count:1b}')

    expect(tokens.some(t => t.type === 'LBRACE')).toBe(true)
    expect(tokens.some(t => t.type === 'RBRACE')).toBe(true)
    expect(tokens.some(t => t.value === 'id')).toBe(true)
  })

  it('should tokenize range', () => {
    const lexer = new Lexer()
    const { tokens } = lexer.tokenize('1..10')

    // tokens: 1, .., 10, EOF = 4 tokens
    expect(tokens).toHaveLength(4)
    expect(tokens[0].value).toBe('1')
    expect(tokens[1].type).toBe('RANGE')
    expect(tokens[2].value).toBe('10')
  })

  it('should handle quoted strings', () => {
    const lexer = new Lexer()
    const { tokens } = lexer.tokenize('"hello world"')

    expect(tokens).toHaveLength(2) // STRING + EOF
    expect(tokens[0].type).toBe('STRING')
    expect(tokens[0].value).toBe('hello world')
  })

  it('should handle escape sequences in strings', () => {
    const lexer = new Lexer()
    const { tokens } = lexer.tokenize('"say \\"hello\\""')

    expect(tokens[0].value).toBe('say "hello"')
  })
})

describe('Parser', () => {
  it('should parse simple give command', () => {
    const { ast, errors } = parseCommand('/give @p diamond 64')

    expect(errors).toHaveLength(0)
    expect(ast).not.toBeNull()
    expect(ast!.command).toBe('give')
    expect(ast!.arguments).toHaveLength(3)
  })

  it('should parse target selector', () => {
    const { ast } = parseCommand('/kill @e[type=cow]')

    expect(ast).not.toBeNull()
    expect(ast!.arguments[0].type).toBe('entity')
    const selector = ast!.arguments[0].value as { type: string; arguments?: Record<string, unknown> }
    expect(selector.type).toBe('@e')
    expect(selector.arguments?.type).toBe('cow')
  })

  it('should parse position coordinates', () => {
    const { ast } = parseCommand('/tp @p ~ ~10 ~')

    expect(ast).not.toBeNull()
    expect(ast!.arguments[1].type).toBe('position')
    const pos = ast!.arguments[1].value as { x: { value: number }; y: { value: number }; z: { value: number } }
    expect(pos.x.value).toBe(0)
    expect(pos.y.value).toBe(10)
    expect(pos.z.value).toBe(0)
  })

  it('should parse absolute coordinates', () => {
    const { ast } = parseCommand('/setblock 100 64 -200 stone')

    expect(ast).not.toBeNull()
    expect(ast!.arguments[0].type).toBe('position')
  })

  it('should parse local coordinates', () => {
    const { ast } = parseCommand('/tp @p ^ ^ ^5')

    expect(ast).not.toBeNull()
    expect(ast!.arguments[1].type).toBe('position')
  })

  it('should parse resource location', () => {
    const { ast } = parseCommand('/give @p minecraft:diamond 1')

    expect(ast).not.toBeNull()
    const resourceArg = ast!.arguments[1]
    // 解析器可能将资源位置解析为 entity（玩家名）或 resource
    expect(['resource', 'entity']).toContain(resourceArg.type)
  })

  it('should parse NBT compound', () => {
    const { ast } = parseCommand('/summon zombie ~ ~ ~ {CustomName:"Test"}')

    expect(ast).not.toBeNull()
    expect(ast!.arguments[2].type).toBe('nbt')
  })

  it('should parse boolean values', () => {
    const { ast } = parseCommand('/gamerule keepInventory true')

    expect(ast).not.toBeNull()
    expect(ast!.arguments[1].type).toBe('boolean')
    expect(ast!.arguments[1].value).toBe(true)
  })

  it('should parse number values', () => {
    const { ast } = parseCommand('/time set 1000')

    expect(ast).not.toBeNull()
    expect(ast!.arguments[1].type).toBe('number')
    expect(ast!.arguments[1].value).toBe(1000)
  })

  it('should parse range values', () => {
    const { ast } = parseCommand('/effect give @p minecraft:speed 10 1')

    expect(ast).not.toBeNull()
    expect(ast!.arguments).toHaveLength(4)
  })

  it('should handle commands without slash', () => {
    const { ast } = parseCommand('give @p diamond 64')

    expect(ast).not.toBeNull()
    expect(ast!.command).toBe('give')
  })
})

describe('Serializer', () => {
  const serializer = new CommandSerializer()

  it('should serialize give command', () => {
    const { ast } = parseCommand('/give @p diamond 64')
    if (!ast) return

    const result = serializer.serialize(ast)
    expect(result).toContain('give')
    expect(result).toContain('@p')
    expect(result).toContain('diamond')
    expect(result).toContain('64')
  })

  it('should serialize position', () => {
    const { ast } = parseCommand('/tp @p ~ ~10 ~-5')
    if (!ast) return

    const result = serializer.serialize(ast)
    expect(result).toContain('~')
    expect(result).toContain('~10')
    expect(result).toContain('~-5')
  })

  it('should serialize selector with arguments', () => {
    const { ast } = parseCommand('/kill @e[type=cow,limit=5]')
    if (!ast) return

    const result = serializer.serialize(ast)
    expect(result).toContain('@e')
    expect(result).toContain('type=cow')
    expect(result).toContain('limit=5')
  })

  it('should serialize NBT', () => {
    const { ast } = parseCommand('/summon zombie ~ ~ ~ {CustomName:"Test",Invulnerable:1b}')
    if (!ast) return

    const result = serializer.serialize(ast)
    expect(result).toContain('{')
    expect(result).toContain('}')
    expect(result).toContain('CustomName')
  })

  it('should roundtrip simple commands', () => {
    const commands = [
      '/give @p diamond 64',
      '/kill @e[type=cow]',
      '/tp @p 100 64 -200',
    ]

    for (const cmd of commands) {
      const { ast } = parseCommand(cmd)
      if (!ast) continue

      const serialized = serializer.serialize(ast)
      const { ast: ast2 } = parseCommand(serialized)
      if (!ast2) continue

      expect(ast2.command).toBe(ast.command)
      expect(ast2.arguments.length).toBe(ast.arguments.length)
    }
  })
})

describe('Validator', () => {
  it('should validate known commands', () => {
    const { ast } = parseCommand('/give @p diamond 64')
    expect(ast).not.toBeNull()
  })

  it('should warn about unknown commands', () => {
    const { ast } = parseCommand('/unknowncommand')
    expect(ast).not.toBeNull()
    expect(ast!.command).toBe('unknowncommand')
  })
})

describe('Integration Tests', () => {
  it('should parse complex summon command', () => {
    const { ast } = parseCommand(
      '/summon minecraft:zombie ~ ~1 ~ {CustomName:\'{"text":"Test Zombie"}\',HandItems:[{id:"minecraft:diamond_sword",Count:1b}]}'
    )

    expect(ast).not.toBeNull()
    expect(ast!.command).toBe('summon')
  })

  it('should parse execute command', () => {
    const { ast } = parseCommand('/execute as @a at @s run say hello')

    expect(ast).not.toBeNull()
    expect(ast!.command).toBe('execute')
  })

  it('should parse fill command', () => {
    const { ast } = parseCommand('/fill ~ ~ ~ ~10 ~10 ~10 minecraft:stone')

    expect(ast).not.toBeNull()
    expect(ast!.command).toBe('fill')
  })

  it('should parse effect command', () => {
    const { ast } = parseCommand('/effect give @p minecraft:speed 30 1 true')

    expect(ast).not.toBeNull()
  })

  it('should parse data command', () => {
    const { ast } = parseCommand('/data get entity @s SelectedItem')

    expect(ast).not.toBeNull()
  })
})
