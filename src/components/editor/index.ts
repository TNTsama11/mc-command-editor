/**
 * 编辑器组件导出
 */

export { ParameterInput, default as parameterInput } from './ParameterInput'
export type {
  ParameterInputProps,
  ParameterValue,
  ValidationError,
} from './ParameterInput'

// 语法高亮组件
export {
  SyntaxHighlighter,
  SyntaxThemeProvider,
  InlineCode,
  CodeBlock,
  HighlightSpan,
  highlightCommand,
  highlightCommandAdvanced,
  darkTheme,
  lightTheme,
  useSyntaxTheme,
  getSyntaxClassName,
} from './SyntaxHighlighter'
export type {
  SyntaxKind,
  HighlightToken,
  HighlightResult,
  SyntaxTheme,
} from './SyntaxHighlighter'
export { default as syntaxHighlighter } from './SyntaxHighlighter'

// NBT 编辑器组件
export { NBTEditor, default as nbtEditor } from './NBTEditor'
export type { NBTEditorProps } from './NBTEditor'
export {
  parseNBTString,
  formatJSON,
  minifyJSON,
  nbtToCommandString,
  getNBTType,
} from './NBTEditor'

// 历史记录面板组件
export { HistoryPanel, default as historyPanel } from './HistoryPanel'

// 项目设置组件
export { ProjectSettings, default as projectSettings } from './ProjectSettings'
