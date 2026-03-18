/**
 * 函数文件生成器单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  FunctionGenerator,
  stripSlash,
  formatComment,
  isValidCommand,
  generateMcfunction,
  generateMcfunctionFromCommands,
  generateMcfunctionFromStrings,
  parseMcfunction,
  getFunctionGenerator,
  type CommandEntry
} from '../functionGenerator'
import {
  createFunctionFile,
  createCommandLine
} from '../types'

// ============================================================================
// 辅助函数测试
// ============================================================================

describe('stripSlash', () => {
  it('should remove leading slash from command', () => {
    expect(stripSlash('/say Hello')).toBe('say Hello')
    expect(stripSlash('/give @p diamond 1')).toBe('give @p diamond 1')
  })

  it('should not modify command without leading slash', () => {
    expect(stripSlash('say Hello')).toBe('say Hello')
    expect(stripSlash('give @p diamond 1')).toBe('give @p diamond 1')
  })

  it('should handle empty string', () => {
    expect(stripSlash('')).toBe('')
  })

  it('should only remove one leading slash', () => {
    expect(stripSlash('//say Hello')).toBe('/say Hello')
  })
})

describe('formatComment', () => {
  it('should add # prefix to plain text', () => {
    expect(formatComment('This is a comment')).toBe('# This is a comment')
  })

  it('should not duplicate # prefix', () => {
    expect(formatComment('# Already a comment')).toBe('# Already a comment')
    expect(formatComment('#Already a comment')).toBe('#Already a comment')
  })

  it('should trim whitespace', () => {
    expect(formatComment('  This is a comment  ')).toBe('# This is a comment')
  })

  it('should handle empty string', () => {
    // 空字符串经过 trim 后变成空，然后添加 '# ' 前缀
    expect(formatComment('')).toBe('# ')
  })
})

describe('isValidCommand', () => {
  it('should return true for valid commands', () => {
    expect(isValidCommand('say Hello')).toBe(true)
    expect(isValidCommand('/give @p diamond 1')).toBe(true)
    expect(isValidCommand('execute as @a run say hi')).toBe(true)
  })

  it('should return false for empty strings', () => {
    expect(isValidCommand('')).toBe(false)
    expect(isValidCommand('   ')).toBe(false)
  })

  it('should return false for comment lines', () => {
    expect(isValidCommand('# This is a comment')).toBe(false)
    expect(isValidCommand('#say Hello')).toBe(false)
  })
})

// ============================================================================
// FunctionGenerator 类测试
// ============================================================================

describe('FunctionGenerator', () => {
  let generator: FunctionGenerator

  beforeEach(() => {
    generator = new FunctionGenerator()
  })

  describe('constructor', () => {
    it('should create generator with default options', () => {
      const gen = new FunctionGenerator()
      expect(gen).toBeDefined()
    })

    it('should accept custom options', () => {
      const gen = new FunctionGenerator({
        includeHeaderComment: false,
        stripLeadingSlash: false
      })
      expect(gen).toBeDefined()
    })
  })

  describe('generate from FunctionFile', () => {
    it('should generate content from FunctionFile', () => {
      const func = createFunctionFile('test', {
        commands: [
          createCommandLine('say Hello', false),
          createCommandLine('This is a comment', true),
          createCommandLine('give @p diamond 1', false)
        ],
        description: 'Test function'
      })

      const result = generator.generate(func)

      expect(result.content).toBeDefined()
      expect(result.commandCount).toBe(2)
      expect(result.commentCount).toBeGreaterThan(0)
    })

    it('should strip leading slash by default', () => {
      const func = createFunctionFile('test', {
        commands: [
          createCommandLine('/say Hello', false)
        ]
      })

      const result = generator.generate(func)
      expect(result.content).toContain('say Hello')
      expect(result.content).not.toContain('/say Hello')
    })

    it('should preserve leading slash when option is false', () => {
      const gen = new FunctionGenerator({ stripLeadingSlash: false })
      const func = createFunctionFile('test', {
        commands: [
          createCommandLine('/say Hello', false)
        ]
      })

      const result = gen.generate(func)
      expect(result.content).toContain('/say Hello')
    })

    it('should include header comment by default', () => {
      const func = createFunctionFile('test', {
        description: 'Test function'
      })

      const result = generator.generate(func)
      expect(result.content).toContain('# Function: test')
      expect(result.content).toContain('# Test function')
      expect(result.content).toContain('Generated:')
    })

    it('should exclude header comment when option is false', () => {
      const gen = new FunctionGenerator({ includeHeaderComment: false })
      const func = createFunctionFile('test', {
        commands: [createCommandLine('say Hello', false)]
      })

      const result = gen.generate(func)
      expect(result.content).not.toContain('# Function:')
      expect(result.content).toBe('say Hello')
    })

    it('should count lines correctly', () => {
      const func = createFunctionFile('test', {
        commands: [
          createCommandLine('say Hello', false),
          createCommandLine('Comment 1', true),
          createCommandLine('give @p diamond', false),
          createCommandLine('', false) // 空行
        ]
      })

      const result = generator.generate(func)
      expect(result.commandCount).toBe(2)
      expect(result.commentCount).toBeGreaterThan(1) // 包含 header 注释
      expect(result.totalLines).toBeGreaterThan(0)
    })
  })

  describe('generateFromCommands', () => {
    it('should generate content from command entries', () => {
      const entries: CommandEntry[] = [
        { command: 'say Hello' },
        { command: 'This is a comment', isComment: true },
        { command: 'give @p diamond 1' }
      ]

      const result = generator.generateFromCommands(entries)

      expect(result.content).toContain('say Hello')
      expect(result.content).toContain('# This is a comment')
      expect(result.content).toContain('give @p diamond 1')
      expect(result.commandCount).toBe(2)
      expect(result.commentCount).toBeGreaterThan(1)
    })

    it('should handle empty lines', () => {
      const entries: CommandEntry[] = [
        { command: 'say Hello' },
        { command: '', isEmptyLine: true },
        { command: 'give @p diamond 1' }
      ]

      const result = generator.generateFromCommands(entries, { name: 'test' })

      expect(result.content).toContain('say Hello')
      expect(result.content).toContain('give @p diamond 1')
      expect(result.emptyLineCount).toBeGreaterThan(0)
    })

    it('should include metadata in header', () => {
      const entries: CommandEntry[] = [
        { command: 'say Hello' }
      ]

      const result = generator.generateFromCommands(entries, {
        name: 'my_function',
        description: 'My custom function'
      })

      expect(result.content).toContain('# Function: my_function')
      expect(result.content).toContain('# My custom function')
    })
  })

  describe('generateFromStrings', () => {
    it('should generate content from string array', () => {
      const commands = [
        'say Hello World',
        '# This is a comment',
        'give @p diamond 1'
      ]

      const result = generator.generateFromStrings(commands)

      expect(result.content).toContain('say Hello World')
      expect(result.content).toContain('# This is a comment')
      expect(result.content).toContain('give @p diamond 1')
    })

    it('should auto-detect comments', () => {
      const commands = [
        '# Comment line',
        '#Another comment'
      ]

      const result = generator.generateFromStrings(commands, { name: 'test' })

      expect(result.content).toContain('# Comment line')
      // '#Another comment' 会被处理为 '# Another comment'（添加空格）
      expect(result.content).toContain('# Another comment')
      expect(result.commentCount).toBeGreaterThan(2)
    })

    it('should auto-detect empty lines', () => {
      const commands = [
        'say Hello',
        '',
        '   ',
        'give @p diamond'
      ]

      const result = generator.generateFromStrings(commands, { name: 'test' })

      expect(result.content).toContain('say Hello')
      expect(result.content).toContain('give @p diamond')
    })
  })
})

// ============================================================================
// 便捷函数测试
// ============================================================================

describe('generateMcfunction', () => {
  it('should generate content from FunctionFile', () => {
    const func = createFunctionFile('test', {
      commands: [
        createCommandLine('say Hello', false),
        createCommandLine('give @p diamond 1', false)
      ]
    })

    const content = generateMcfunction(func)
    expect(content).toContain('say Hello')
    expect(content).toContain('give @p diamond 1')
  })
})

describe('generateMcfunctionFromCommands', () => {
  it('should generate content from command entries', () => {
    const entries: CommandEntry[] = [
      { command: 'say Hello' },
      { command: 'Comment', isComment: true },
      { command: 'kill @e[type=zombie]' }
    ]

    const content = generateMcfunctionFromCommands(entries, { name: 'test' })
    expect(content).toContain('say Hello')
    expect(content).toContain('# Comment')
    expect(content).toContain('kill @e[type=zombie]')
  })
})

describe('generateMcfunctionFromStrings', () => {
  it('should generate content from string array', () => {
    const commands = [
      'say Hello',
      '# My comment',
      'give @p diamond 1'
    ]

    const content = generateMcfunctionFromStrings(commands, { name: 'test' })
    expect(content).toContain('say Hello')
    expect(content).toContain('# My comment')
    expect(content).toContain('give @p diamond 1')
  })
})

describe('parseMcfunction', () => {
  it('should parse mcfunction content', () => {
    const content = `# This is a comment
say Hello World
give @p diamond 1`

    const entries = parseMcfunction(content)

    expect(entries).toHaveLength(3)
    expect(entries[0].isComment).toBe(true)
    expect(entries[0].command).toBe('This is a comment')
    expect(entries[1].command).toBe('say Hello World')
    expect(entries[1].isComment).toBeFalsy()
    expect(entries[2].command).toBe('give @p diamond 1')
  })

  it('should handle empty lines', () => {
    const content = `say Hello

give @p diamond`

    const entries = parseMcfunction(content)

    expect(entries).toHaveLength(3)
    expect(entries[1].isEmptyLine).toBe(true)
  })

  it('should handle CRLF line endings', () => {
    const content = 'say Hello\r\ngive @p diamond'

    const entries = parseMcfunction(content)

    expect(entries).toHaveLength(2)
    expect(entries[0].command).toBe('say Hello')
    expect(entries[1].command).toBe('give @p diamond')
  })
})

describe('getFunctionGenerator', () => {
  it('should return singleton instance', () => {
    const gen1 = getFunctionGenerator()
    const gen2 = getFunctionGenerator()

    expect(gen1).toBe(gen2)
  })

  it('should accept options', () => {
    const gen = getFunctionGenerator({ includeHeaderComment: false })
    expect(gen).toBeDefined()
  })
})

// ============================================================================
// 集成测试
// ============================================================================

describe('Integration Tests', () => {
  it('should roundtrip: generate -> parse -> generate', () => {
    const originalCommands: CommandEntry[] = [
      { command: 'say Hello World' },
      { command: 'Section 1', isComment: true },
      { command: 'give @p diamond 1' },
      { command: '', isEmptyLine: true },
      { command: 'kill @e[type=zombie]' }
    ]

    const generator = new FunctionGenerator({ includeHeaderComment: false })
    const generated = generator.generateFromCommands(originalCommands, { name: 'test' })

    const parsed = parseMcfunction(generated.content)

    // 验证解析后的命令数量
    expect(parsed.length).toBe(5)
    expect(parsed[0].command).toBe('say Hello World')
    expect(parsed[1].isComment).toBe(true)
    expect(parsed[2].command).toBe('give @p diamond 1')
    expect(parsed[3].isEmptyLine).toBe(true)
    expect(parsed[4].command).toBe('kill @e[type=zombie]')
  })

  it('should handle complex mcfunction file', () => {
    const commands = [
      '# Main function header',
      '# Generated for testing',
      '',
      '# Teleport all players',
      'tp @a ~ ~ ~',
      '',
      '# Give items',
      'give @a diamond 64',
      'give @a emerald 32',
      '',
      '# Play sound',
      'playsound minecraft:entity.player.levelup master @a'
    ]

    const generator = new FunctionGenerator({ includeHeaderComment: false })
    const result = generator.generateFromStrings(commands, { name: 'main' })

    expect(result.commandCount).toBe(4)
    expect(result.commentCount).toBe(5)
    expect(result.emptyLineCount).toBe(3)
    expect(result.totalLines).toBe(12)
  })

  it('should format output correctly', () => {
    const func = createFunctionFile('tick', {
      commands: [
        createCommandLine('Main tick function', true),
        createCommandLine('execute as @a run say hello', false),
        createCommandLine('', false),
        createCommandLine('Another section', true),
        createCommandLine('scoreboard players add @a ticks 1', false)
      ],
      description: 'Runs every tick'
    })

    const generator = new FunctionGenerator({ includeHeaderComment: false })
    const result = generator.generate(func)
    const lines = result.content.split('\n')

    expect(lines[0]).toBe('# Main tick function')
    expect(lines[1]).toBe('execute as @a run say hello')
    expect(lines[2]).toBe('')
    expect(lines[3]).toBe('# Another section')
    expect(lines[4]).toBe('scoreboard players add @a ticks 1')
  })
})
