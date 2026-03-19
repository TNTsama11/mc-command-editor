/**
 * 变量系统 - 数据类型定义
 * 支持记分板和存储变量
 */

// 变量类型
export type VariableType =
  | 'score'      // 记分板分数
  | 'storage'    // 存储数据
  | 'entity'     // 实体数据
  | 'block'      // 方块数据

// 变量数据类型
export type VariableDataType =
  | 'int'        // 整数
  | 'float'      // 浮点数
  | 'string'     // 字符串
  | 'boolean'    // 布尔值
  | 'nbt'        // NBT 复合标签
  | 'list'       // 列表
  | 'pos'        // 坐标

// 变量作用域
export type VariableScope =
  | 'global'     // 全局变量
  | 'local'      // 函数局部变量
  | 'temp'       // 临时变量

// 基础变量定义
export interface VariableDefinition {
  id: string
  name: string
  type: VariableType
  dataType: VariableDataType
  scope: VariableScope
  description?: string

  // 初始值
  defaultValue?: unknown

  // 记分板专用配置
  objective?: string
  criterion?: string
  displayName?: string

  // 存储专用配置
  storageNamespace?: string
  storagePath?: string

  // 实体数据专用配置
  entityTarget?: string
  entityPath?: string

  // 方块数据专用配置
  blockPos?: string
  blockPath?: string
}

// 记分板目标
export interface ScoreboardObjective {
  name: string
  criterion: string
  displayName?: string
  renderType?: 'integer' | 'hearts'
}

// 存储目标
export interface StorageTarget {
  namespace: string
  path: string
}

// 变量操作类型
export type VariableOperationType =
  | 'get'        // 读取
  | 'set'        // 设置
  | 'add'        // 加法
  | 'remove'     // 减法
  | 'reset'      // 重置
  | 'merge'      // 合并（NBT）
  | 'scale'      // 缩放

// 变量操作定义
export interface VariableOperation {
  variableId: string
  operation: VariableOperationType
  source?: string | number | VariableReference
  target?: string
}

// 变量引用（用于节点间传递）
export interface VariableReference {
  type: 'variable'
  variableId: string
  path?: string  // 用于嵌套访问
}

// 运算操作类型
export type ArithmeticOperation =
  | 'add'        // +
  | 'subtract'   // -
  | 'multiply'   // *
  | 'divide'     // /
  | 'modulo'     // %
  | 'min'        // min
  | 'max'        // max
  | 'abs'        // abs
  | 'power'      // ^

// 比较操作类型
export type ComparisonOperation =
  | 'eq'         // ==
  | 'ne'         // !=
  | 'lt'         // <
  | 'le'         // <=
  | 'gt'         // >
  | 'ge'         // >=
  | 'matches'    // matches

// 记分板运算命令生成
export function generateScoreboardCommand(
  operation: VariableOperation,
  variables: VariableDefinition[]
): string {
  const variable = variables.find(v => v.id === operation.variableId)
  if (!variable || !variable.objective) {
    throw new Error(`Variable ${operation.variableId} not found or not a scoreboard variable`)
  }

  const target = operation.target || '@s'

  switch (operation.operation) {
    case 'get':
      return `scoreboard players get ${target} ${variable.objective}`

    case 'set':
      if (typeof operation.source === 'number') {
        return `scoreboard players set ${target} ${variable.objective} ${operation.source}`
      }
      if (typeof operation.source === 'object' && operation.source !== null && 'variableId' in operation.source) {
        const sourceRef = operation.source as VariableReference
        const sourceVar = variables.find(v => v.id === sourceRef.variableId)
        if (sourceVar?.objective) {
          return `scoreboard players operation ${target} ${variable.objective} = @s ${sourceVar.objective}`
        }
      }
      throw new Error('Invalid source for set operation')

    case 'add':
      if (typeof operation.source === 'number') {
        return `scoreboard players add ${target} ${variable.objective} ${operation.source}`
      }
      if (typeof operation.source === 'object' && operation.source !== null && 'variableId' in operation.source) {
        const sourceRef = operation.source as VariableReference
        const sourceVar = variables.find(v => v.id === sourceRef.variableId)
        if (sourceVar?.objective) {
          return `scoreboard players operation ${target} ${variable.objective} += @s ${sourceVar.objective}`
        }
      }
      throw new Error('Invalid source for add operation')

    case 'remove':
      if (typeof operation.source === 'number') {
        return `scoreboard players remove ${target} ${variable.objective} ${operation.source}`
      }
      if (typeof operation.source === 'object' && operation.source !== null && 'variableId' in operation.source) {
        const sourceRef = operation.source as VariableReference
        const sourceVar = variables.find(v => v.id === sourceRef.variableId)
        if (sourceVar?.objective) {
          return `scoreboard players operation ${target} ${variable.objective} -= @s ${sourceVar.objective}`
        }
      }
      throw new Error('Invalid source for remove operation')

    case 'reset':
      return `scoreboard players reset ${target} ${variable.objective}`

    default:
      throw new Error(`Unsupported operation: ${operation.operation}`)
  }
}

// 存储操作命令生成
export function generateStorageCommand(
  operation: VariableOperation,
  variables: VariableDefinition[]
): string {
  const variable = variables.find(v => v.id === operation.variableId)
  if (!variable || !variable.storageNamespace) {
    throw new Error(`Variable ${operation.variableId} not found or not a storage variable`)
  }

  const storage = `${variable.storageNamespace}:${variable.storagePath || 'data'}`
  const path = variable.storagePath || ''

  switch (operation.operation) {
    case 'get':
      return `data get storage ${storage} ${path}`

    case 'set':
      if (typeof operation.source === 'string') {
        return `data modify storage ${storage} ${path} set value ${operation.source}`
      }
      if (typeof operation.source === 'number') {
        return `data modify storage ${storage} ${path} set value ${operation.source}`
      }
      throw new Error('Invalid source for storage set operation')

    case 'merge':
      if (typeof operation.source === 'string') {
        return `data modify storage ${storage} ${path} merge value ${operation.source}`
      }
      throw new Error('Invalid source for merge operation')

    case 'remove':
      return `data remove storage ${storage} ${path}`

    default:
      throw new Error(`Unsupported storage operation: ${operation.operation}`)
  }
}

// 生成算术运算命令
export function generateArithmeticCommand(
  operation: ArithmeticOperation,
  target: { objective: string; holder: string },
  operandA: { objective: string; holder: string },
  operandB: { objective: string; holder: string } | number
): string {
  const { objective, holder } = target
  const { objective: objA, holder: holdA } = operandA

  if (typeof operandB === 'number') {
    // 数值运算
    switch (operation) {
      case 'add':
        return `scoreboard players add ${holder} ${objective} ${operandB}`
      case 'subtract':
        return `scoreboard players remove ${holder} ${objective} ${operandB}`
      default:
        throw new Error(`Cannot use number operand for ${operation}`)
    }
  }

  const { objective: objB, holder: holdB } = operandB
  const ops: Record<ArithmeticOperation, string> = {
    add: '+=',
    subtract: '-=',
    multiply: '*=',
    divide: '/=',
    modulo: '%=',
    min: '><',  // 特殊处理
    max: '><',  // 特殊处理
    abs: '=',   // 特殊处理
    power: '^', // 特殊处理
  }

  const op = ops[operation]
  return `scoreboard players operation ${holder} ${objective} ${op} ${holdB} ${objB}`
}

// 生成比较命令
export function generateComparisonCommand(
  operation: ComparisonOperation,
  target: { objective: string; holder: string },
  value: { objective: string; holder: string } | number | string
): string {
  const { objective, holder } = target

  if (typeof value === 'number') {
    // 与数值比较
    const range = operation === 'matches'
      ? `${value}`
      : `${operation === 'ge' ? value : value}..${operation === 'le' ? value : value}`

    switch (operation) {
      case 'eq':
        return `score ${holder} ${objective} matches ${value}`
      case 'ne':
        return `score ${holder} ${objective} matches !${value}`
      case 'lt':
        return `score ${holder} ${objective} matches ..${value - 1}`
      case 'le':
        return `score ${holder} ${objective} matches ..${value}`
      case 'gt':
        return `score ${holder} ${objective} matches ${value + 1}..`
      case 'ge':
        return `score ${holder} ${objective} matches ${value}..`
      case 'matches':
        return `score ${holder} ${objective} matches ${value}`
    }
  }

  // 与其他记分板比较
  if (typeof value === 'object' && 'objective' in value) {
    const { objective: objB, holder: holdB } = value
    return `score ${holder} ${objective} ${operation} ${holdB} ${objB}`
  }

  throw new Error('Invalid comparison value')
}
