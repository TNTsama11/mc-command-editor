// Core modules
// 注意：parser/ast.ts 和 commandBlock/types.ts 都定义了 CommandBlockType
// 为避免重复导出错误，这里选择从 commandBlock 模块导出（更完整）

// 从 generator 导出所有
export * from './generator'

// 从 validator 导出所有
export * from './validator'

// 从 commandBlock 导出所有（包括 CommandBlockType 和 FacingDirection）
export * from './commandBlock'

// 从 parser 导出（排除与 commandBlock 重复的 CommandBlockType）
export {
  // AST 类型
  type SelectorType,
  type CoordinateType,
  type GameMode,
  type Coordinate,
  type Position,
  type TargetSelector,
  type PlayerReference,
  type UUIDReference,
  type Target,
  type Range,
  type NBTCompound,
  type NBTValue,
  type ResourceLocation,
  type CommandAST,
  type CommandArgument,
  // Lexer
  type Token,
  Lexer,
  TokenType as LexerTokenType,
  type LexerError,
  // Parser
  type ParseError,
  Parser,
  parser,
  parseCommand,
  // Commands
  CommandType,
  createEntityArgument,
  createPositionArgument,
  createResourceArgument,
  COMMAND_REGISTRY,
  isKnownCommand,
  // Serializer
  CommandSerializer,
  serializer,
} from './parser'

// commandBlock 模块中的 CommandBlock 类型与 types/index.ts 中的不同
// 使用别名导出以区分
export { type CommandBlock as CoreCommandBlock } from './commandBlock'

// 从 datapack 导出（使用别名解决命名冲突）
// 冲突类型:
// - ExportResult (commandBlock/exporter.ts vs datapack/types.ts)
// - ValidationResult (validator/index.ts vs datapack/types.ts)
export {
  // 类型
  type NamespaceName,
  type FunctionFileName,
  type TagType,
  type PackFormat,
  type PackMeta,
  type PackMcmeta,
  type CommandLine,
  type FunctionFile,
  type TagEntry,
  type TagFile,
  type Namespace,
  type DatapackConfig,
  type Datapack,
  type ZipExportOptions,
  type ExportResult as DatapackExportResult,
  type ValidationSeverity,
  type ValidationIssue,
  type ValidationResult as DatapackValidationResult,
  type FileNode,
  type DatapackStats,

  // 常量
  PACK_FORMATS,
  DEFAULT_DATAPACK_CONFIG,

  // 工具函数
  isValidNamespaceName,
  isValidResourcePath,
  createPackMcmeta,
  createNamespace,
  createFunctionFile,
  createCommandLine,
  createTagFile,
  createDatapack,
  addNamespaceToDatapack,
  addFunctionToNamespace,
  updateFunctionCommands,
  functionToMcfunction,
  tagToJson,
  packMcmetaToJson,
  validateDatapack as validateDatapackStructure,
  getDatapackFileTree,
  getDatapackStats
} from './datapack'
