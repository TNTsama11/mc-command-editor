/**
 * 节点工厂
 * 用于创建各种命令节点
 */

import { v4 as uuidv4 } from 'uuid'
import type { WorkflowDocument } from '@/core/workflow/types'
import { MCNode, CommandNodeData, PinDefinition, PinDataType } from '@/store/flowStore'

// 预定义的命令节点配置
export const COMMAND_NODE_CONFIGS: Record<string, Partial<CommandNodeData>> = {
  // 执行控制
  execute: {
    label: 'Execute',
    commandType: 'execute',
    description: '条件执行命令',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'as', name: '实体', type: 'entity' as PinDataType },
      { id: 'at', name: '位置', type: 'position' as PinDataType },
      { id: 'if', name: '条件', type: 'boolean' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
  },

  // 物品给予
  give: {
    label: 'Give',
    commandType: 'give',
    description: '给予玩家物品',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'item', name: '物品', type: 'resource' as PinDataType, required: true },
      { id: 'count', name: '数量', type: 'number' as PinDataType },
      { id: 'nbt', name: 'NBT', type: 'nbt' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      target: '@p',
      item: 'minecraft:diamond',
      count: 1,
    },
  },

  // 传送
  tp: {
    label: 'Teleport',
    commandType: 'tp',
    description: '传送实体',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'destination', name: '目的地', type: 'position' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      target: '@s',
      destination: '~ ~ ~',
    },
  },

  // 召唤实体
  summon: {
    label: 'Summon',
    commandType: 'summon',
    description: '召唤实体',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'entity', name: '实体类型', type: 'resource' as PinDataType, required: true },
      { id: 'pos', name: '位置', type: 'position' as PinDataType },
      { id: 'nbt', name: 'NBT', type: 'nbt' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
      { id: 'spawned', name: '生成的实体', type: 'entity' as PinDataType },
    ],
    config: {
      entity: 'minecraft:zombie',
      pos: '~ ~ ~',
    },
  },

  // 击杀
  kill: {
    label: 'Kill',
    commandType: 'kill',
    description: '杀死实体',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      target: '@e',
    },
  },

  // 填充方块
  fill: {
    label: 'Fill',
    commandType: 'fill',
    description: '填充方块区域',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'from', name: '起点', type: 'position' as PinDataType, required: true },
      { id: 'to', name: '终点', type: 'position' as PinDataType, required: true },
      { id: 'block', name: '方块', type: 'resource' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      from: '~ ~ ~',
      to: '~ ~ ~',
      block: 'minecraft:stone',
    },
  },

  // 放置方块
  setblock: {
    label: 'Setblock',
    commandType: 'setblock',
    description: '放置单个方块',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'pos', name: '位置', type: 'position' as PinDataType, required: true },
      { id: 'block', name: '方块', type: 'resource' as PinDataType, required: true },
      { id: 'nbt', name: 'NBT', type: 'nbt' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      pos: '~ ~ ~',
      block: 'minecraft:stone',
    },
  },

  // 条件判断
  'if-else': {
    label: 'If/Else',
    commandType: 'if-else',
    description: '条件分支',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'condition', name: '条件', type: 'boolean' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-true', name: 'True', type: 'execute' as PinDataType },
      { id: 'exec-false', name: 'False', type: 'execute' as PinDataType },
    ],
  },

  // 循环
  loop: {
    label: 'Loop',
    commandType: 'loop',
    description: '循环执行',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'times', name: '次数', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-body', name: '循环体', type: 'execute' as PinDataType },
      { id: 'exec-after', name: '结束后', type: 'execute' as PinDataType },
      { id: 'index', name: '索引', type: 'number' as PinDataType },
    ],
  },

  // 获取位置
  'get-position': {
    label: 'Get Position',
    commandType: 'position',
    description: '获取坐标',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'x', name: 'X', type: 'number' as PinDataType },
      { id: 'y', name: 'Y', type: 'number' as PinDataType },
      { id: 'z', name: 'Z', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
      { id: 'pos', name: '位置', type: 'position' as PinDataType },
    ],
  },

  // 选择实体
  'select-entity': {
    label: 'Select Entity',
    commandType: 'selector',
    description: '实体选择器',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
      { id: 'entity', name: '实体', type: 'entity' as PinDataType },
    ],
    config: {
      selector: '@a',
    },
  },

  // 数值常量
  'number-const': {
    label: 'Number',
    commandType: 'number',
    description: '数值常量',
    inputs: [],
    outputs: [
      { id: 'value', name: '值', type: 'number' as PinDataType },
    ],
    config: {
      value: 0,
    },
  },

  // 字符串常量
  'string-const': {
    label: 'String',
    commandType: 'string',
    description: '字符串常量',
    inputs: [],
    outputs: [
      { id: 'value', name: '值', type: 'string' as PinDataType },
    ],
    config: {
      value: '',
    },
  },

  // ========== 变量系统 ==========

  // 记分板分数读取
  'score-get': {
    label: 'Score Get',
    commandType: 'score-get',
    description: '读取记分板分数',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
      { id: 'value', name: '分数', type: 'number' as PinDataType },
    ],
    config: {
      objective: '',
      target: '@s',
    },
  },

  // 记分板分数设置
  'score-set': {
    label: 'Score Set',
    commandType: 'score-set',
    description: '设置记分板分数',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType },
      { id: 'value', name: '值', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      objective: '',
      target: '@s',
      operation: 'set',
    },
  },

  // 记分板运算
  'score-operation': {
    label: 'Score Operation',
    commandType: 'score-operation',
    description: '记分板运算',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
      { id: 'result', name: '结果', type: 'number' as PinDataType },
    ],
    config: {
      targetObjective: '',
      sourceObjective: '',
      targetHolder: '@s',
      sourceHolder: '@s',
      operation: 'add',
    },
  },

  // 记分板比较
  'score-compare': {
    label: 'Score Compare',
    commandType: 'score-compare',
    description: '比较记分板分数',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-true', name: 'True', type: 'execute' as PinDataType },
      { id: 'exec-false', name: 'False', type: 'execute' as PinDataType },
      { id: 'result', name: '结果', type: 'boolean' as PinDataType },
    ],
    config: {
      objective: '',
      comparison: 'eq',
      value: 0,
    },
  },

  // 存储读取
  'storage-get': {
    label: 'Storage Get',
    commandType: 'storage-get',
    description: '读取存储数据',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
      { id: 'value', name: '数据', type: 'nbt' as PinDataType },
    ],
    config: {
      namespace: '',
      path: '',
    },
  },

  // 存储设置
  'storage-set': {
    label: 'Storage Set',
    commandType: 'storage-set',
    description: '设置存储数据',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'value', name: '值', type: 'nbt' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      namespace: '',
      path: '',
      operation: 'set',
    },
  },

  // ========== 数学运算 ==========

  // 加法
  'math-add': {
    label: 'Add',
    commandType: 'math-add',
    description: '加法运算',
    inputs: [
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' as PinDataType },
    ],
    config: {},
  },

  // 减法
  'math-subtract': {
    label: 'Subtract',
    commandType: 'math-subtract',
    description: '减法运算',
    inputs: [
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' as PinDataType },
    ],
    config: {},
  },

  // 乘法
  'math-multiply': {
    label: 'Multiply',
    commandType: 'math-multiply',
    description: '乘法运算',
    inputs: [
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' as PinDataType },
    ],
    config: {},
  },

  // 除法
  'math-divide': {
    label: 'Divide',
    commandType: 'math-divide',
    description: '除法运算',
    inputs: [
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' as PinDataType },
    ],
    config: {},
  },

  // 取模
  'math-modulo': {
    label: 'Modulo',
    commandType: 'math-modulo',
    description: '取模运算',
    inputs: [
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' as PinDataType },
    ],
    config: {},
  },

  // 数学函数
  'math-function': {
    label: 'Math Function',
    commandType: 'math-function',
    description: '数学函数 (min/max/abs)',
    inputs: [
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'number' as PinDataType },
    ],
    config: {
      function: 'min',
    },
  },

  // 比较器
  comparator: {
    label: 'Compare',
    commandType: 'comparator',
    description: '数值比较',
    inputs: [
      { id: 'a', name: 'A', type: 'number' as PinDataType, required: true },
      { id: 'b', name: 'B', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'result', name: '结果', type: 'boolean' as PinDataType },
    ],
    config: {
      comparison: 'eq',
    },
  },

  // 创建记分板
  'scoreboard-create': {
    label: 'Create Scoreboard',
    commandType: 'scoreboard-create',
    description: '创建记分板目标',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      objective: '',
      criterion: 'dummy',
      displayName: '',
    },
  },

  // 重置记分板
  'scoreboard-reset': {
    label: 'Reset Score',
    commandType: 'scoreboard-reset',
    description: '重置分数',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      objective: '',
      target: '@s',
    },
  },

  // ========== 实体操作扩展 ==========

  // 效果给予
  effect: {
    label: 'Effect',
    commandType: 'effect',
    description: '给予实体效果',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'effect', name: '效果', type: 'resource' as PinDataType, required: true },
      { id: 'duration', name: '时长', type: 'number' as PinDataType },
      { id: 'amplifier', name: '等级', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      effect: 'minecraft:speed',
      duration: 10,
      amplifier: 0,
      ambient: false,
      particles: true,
    },
  },

  // 效果清除
  'effect-clear': {
    label: 'Clear Effect',
    commandType: 'effect-clear',
    description: '清除实体效果',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'effect', name: '效果', type: 'resource' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      effect: '',
    },
  },

  // 物品清除
  'clear-item': {
    label: 'Clear Item',
    commandType: 'clear-item',
    description: '清除玩家物品',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType },
      { id: 'item', name: '物品', type: 'resource' as PinDataType },
      { id: 'count', name: '数量', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      item: '',
      count: -1,
    },
  },

  // 替换物品
  'replaceitem': {
    label: 'Replace Item',
    commandType: 'replaceitem',
    description: '替换物品栏',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'slot', name: '槽位', type: 'string' as PinDataType, required: true },
      { id: 'item', name: '物品', type: 'resource' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      slot: 'weapon.mainhand',
      item: 'minecraft:diamond_sword',
      count: 1,
    },
  },

  // ========== 方块操作扩展 ==========

  // 克隆方块
  clone: {
    label: 'Clone',
    commandType: 'clone',
    description: '克隆方块区域',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'from', name: '起点', type: 'position' as PinDataType, required: true },
      { id: 'to', name: '终点', type: 'position' as PinDataType, required: true },
      { id: 'destination', name: '目的地', type: 'position' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      mode: 'replace',
    },
  },

  // 破坏方块
  'break-block': {
    label: 'Break Block',
    commandType: 'break-block',
    description: '挖掘方块',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'pos', name: '位置', type: 'position' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      drop: true,
    },
  },

  // 检测方块
  'test-block': {
    label: 'Test Block',
    commandType: 'test-block',
    description: '检测方块状态',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'pos', name: '位置', type: 'position' as PinDataType, required: true },
      { id: 'block', name: '方块', type: 'resource' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-true', name: 'True', type: 'execute' as PinDataType },
      { id: 'exec-false', name: 'False', type: 'execute' as PinDataType },
      { id: 'result', name: '结果', type: 'boolean' as PinDataType },
    ],
    config: {
      block: 'minecraft:stone',
    },
  },

  // ========== 条件判断扩展 ==========

  // 检测实体
  'test-entity': {
    label: 'Test Entity',
    commandType: 'test-entity',
    description: '检测实体是否存在',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-true', name: 'True', type: 'execute' as PinDataType },
      { id: 'exec-false', name: 'False', type: 'execute' as PinDataType },
      { id: 'result', name: '结果', type: 'boolean' as PinDataType },
    ],
    config: {},
  },

  // 检测记分板
  'test-score': {
    label: 'Test Score',
    commandType: 'test-score',
    description: '检测记分板分数',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType },
      { id: 'min', name: '最小值', type: 'number' as PinDataType },
      { id: 'max', name: '最大值', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-true', name: 'True', type: 'execute' as PinDataType },
      { id: 'exec-false', name: 'False', type: 'execute' as PinDataType },
      { id: 'result', name: '结果', type: 'boolean' as PinDataType },
    ],
    config: {
      objective: '',
      min: 0,
      max: undefined,
    },
  },

  // 检测NBT
  'test-nbt': {
    label: 'Test NBT',
    commandType: 'test-nbt',
    description: '检测NBT数据',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType },
      { id: 'nbt', name: 'NBT路径', type: 'string' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-true', name: 'True', type: 'execute' as PinDataType },
      { id: 'exec-false', name: 'False', type: 'execute' as PinDataType },
      { id: 'result', name: '结果', type: 'boolean' as PinDataType },
    ],
    config: {
      nbtPath: '',
    },
  },

  // ========== 延时执行 ==========

  // 延时执行
  schedule: {
    label: 'Schedule',
    commandType: 'schedule',
    description: '延时执行函数',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'function', name: '函数', type: 'resource' as PinDataType, required: true },
      { id: 'delay', name: '延迟(tick)', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      function: '',
      delay: 20,
      append: true,
    },
  },

  // 取消延时
  'schedule-clear': {
    label: 'Cancel Schedule',
    commandType: 'schedule-clear',
    description: '取消延时任务',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'function', name: '函数', type: 'resource' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      function: '',
    },
  },

  // ========== 粒子与音效 ==========

  // 粒子效果
  particle: {
    label: 'Particle',
    commandType: 'particle',
    description: '生成粒子效果',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'pos', name: '位置', type: 'position' as PinDataType },
      { id: 'particle', name: '粒子', type: 'resource' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      particle: 'minecraft:flame',
      speed: 0.1,
      count: 10,
      dx: 0.5,
      dy: 0.5,
      dz: 0.5,
      mode: 'normal',
    },
  },

  // 播放音效
  playsound: {
    label: 'Play Sound',
    commandType: 'playsound',
    description: '播放音效',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'pos', name: '位置', type: 'position' as PinDataType },
      { id: 'target', name: '听众', type: 'entity' as PinDataType },
      { id: 'sound', name: '音效', type: 'resource' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      sound: 'minecraft:block.note_block.pling',
      source: 'master',
      volume: 1.0,
      pitch: 1.0,
      minVolume: 0.0,
    },
  },

  // 停止音效
  'stopsound': {
    label: 'Stop Sound',
    commandType: 'stopsound',
    description: '停止音效',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '听众', type: 'entity' as PinDataType },
      { id: 'sound', name: '音效', type: 'resource' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      sound: '',
      source: '*',
    },
  },

  // 标题显示
  title: {
    label: 'Title',
    commandType: 'title',
    description: '显示标题',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'text', name: '文本', type: 'string' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      type: 'title', // title, subtitle, actionbar
      fadeIn: 10,
      stay: 70,
      fadeOut: 20,
    },
  },

  // 聊天消息
  tellraw: {
    label: 'Tellraw',
    commandType: 'tellraw',
    description: '发送JSON消息',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'text', name: '文本', type: 'string' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      json: '{"text":"Hello"}',
    },
  },

  // Boss栏
  bossbar: {
    label: 'Boss Bar',
    commandType: 'bossbar',
    description: '操作Boss栏',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'value', name: '值', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      id: 'minecraft:custom',
      action: 'set', // set, get, remove, add, remove
      value: 0,
      max: 100,
      color: 'white',
      style: 'progress',
      name: '{"text":"Boss Bar"}',
    },
  },

  // 世界时间
  time: {
    label: 'Time',
    commandType: 'time',
    description: '设置世界时间',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'value', name: '时间', type: 'number' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      action: 'set', // set, add, query
      value: 1000,
    },
  },

  // 天气
  weather: {
    label: 'Weather',
    commandType: 'weather',
    description: '设置天气',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      type: 'clear', // clear, rain, thunder
      duration: 6000,
    },
  },

  // 游戏规则
  gamerule: {
    label: 'Gamerule',
    commandType: 'gamerule',
    description: '设置游戏规则',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'value', name: '值', type: 'any' as PinDataType },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      rule: 'doDaylightCycle',
      value: 'true',
    },
  },

  // 属性修改
  attribute: {
    label: 'Attribute',
    commandType: 'attribute',
    description: '修改实体属性',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
      { id: 'value', name: '值', type: 'number' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {
      attribute: 'minecraft:generic.max_health',
      operation: 'set', // set, add, multiply, multiply_base
      value: 20,
      uuid: '',
      name: 'custom_modifier',
    },
  },

  // 传送实体到实体
  'tp-entity': {
    label: 'TP to Entity',
    commandType: 'tp-entity',
    description: '传送实体到另一个实体',
    inputs: [
      { id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true },
      { id: 'source', name: '源', type: 'entity' as PinDataType, required: true },
      { id: 'target', name: '目标', type: 'entity' as PinDataType, required: true },
    ],
    outputs: [
      { id: 'exec-out', name: '执行', type: 'execute' as PinDataType },
    ],
    config: {},
  },
}

// 创建节点
export function createNode(
  type: string,
  position: { x: number; y: number }
): MCNode {
  const config = COMMAND_NODE_CONFIGS[type] || {
    label: type,
    commandType: type,
    inputs: [{ id: 'exec-in', name: '执行', type: 'execute' as PinDataType, required: true }],
    outputs: [{ id: 'exec-out', name: '执行', type: 'execute' as PinDataType }],
  }

  return {
    id: uuidv4(),
    type: 'command',
    position,
    data: {
      label: config.label || type,
      commandType: config.commandType || type,
      description: config.description,
      inputs: config.inputs || [],
      outputs: config.outputs || [],
      config: config.config || {},
      errors: [],
    },
  }
}

// 获取所有可用的节点类型
export function getAvailableNodeTypes(): string[] {
  return Object.keys(COMMAND_NODE_CONFIGS)
}

interface FunctionNodeOptions {
  workflowId: string
  name: string
  description?: string
  inputs: PinDefinition[]
  outputs: PinDefinition[]
}

export function createFunctionNode(
  options: FunctionNodeOptions,
  position: { x: number; y: number }
): MCNode {
  return {
    id: uuidv4(),
    type: 'command',
    position,
    data: {
      label: options.name,
      commandType: 'function',
      description: options.description || '封装工作流为可复用函数节点',
      workflowId: options.workflowId,
      inputs: options.inputs,
      outputs: options.outputs,
      config: {},
      errors: [],
    },
  }
}

export function createFunctionNodeFromWorkflow(
  workflow: WorkflowDocument,
  position: { x: number; y: number }
): MCNode {
  return createFunctionNode(
    {
      workflowId: workflow.id,
      name: workflow.name,
      description: workflow.metadata.description,
      inputs: workflow.interface.inputs as PinDefinition[],
      outputs: workflow.interface.outputs as PinDefinition[],
    },
    position
  )
}
