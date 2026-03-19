import { describe, expect, it } from 'vitest'

import {
  getResourceOptionsForField,
  getResourceSuggestions,
  getNodeConfigSections,
  getInputSourceSummaries,
} from '@/components/flow/NodeConfigPanel'
import { type MCEdge, type MCNode } from '@/store/flowStore'

describe('NodeConfigPanel helpers', () => {
  it('将 give 节点参数拆分为常用参数和高级参数', () => {
    const sections = getNodeConfigSections('give')

    expect(sections.common.map((field) => field.key)).toEqual(['target', 'item', 'count'])
    expect(sections.advanced.map((field) => field.key)).toEqual(['nbt'])
  })

  it('为已接线输入生成来源摘要，并区分手动输入参数', () => {
    const nodes: MCNode[] = [
      {
        id: 'selector-node',
        type: 'command',
        position: { x: 0, y: 0 },
        data: {
          label: 'Select Entity',
          commandType: 'selector',
          inputs: [],
          outputs: [{ id: 'entity', name: '实体', type: 'entity' }],
          config: {},
        },
      },
      {
        id: 'give-node',
        type: 'command',
        position: { x: 200, y: 0 },
        data: {
          label: 'Give',
          commandType: 'give',
          inputs: [
            { id: 'target', name: '目标', type: 'entity', required: true },
            { id: 'item', name: '物品', type: 'resource', required: true },
            { id: 'nbt', name: 'NBT', type: 'nbt' },
          ],
          outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
          config: {
            target: '@p',
            item: 'minecraft:diamond',
          },
        },
      },
    ]

    const edges: MCEdge[] = [
      {
        id: 'selector-node-entity-give-node-target',
        source: 'selector-node',
        sourceHandle: 'entity',
        target: 'give-node',
        targetHandle: 'target',
        data: { type: 'entity' },
      },
    ]

    const summaries = getInputSourceSummaries(nodes[1], nodes, edges)

    expect(summaries).toEqual([
      {
        key: 'target',
        label: '目标',
        sourceType: 'connection',
        summary: '来自 Select Entity · 实体',
      },
      {
        key: 'item',
        label: '物品',
        sourceType: 'manual',
        summary: '当前使用面板填写的值',
      },
      {
        key: 'nbt',
        label: 'NBT',
        sourceType: 'manual',
        summary: '当前使用面板填写的值',
      },
    ])
  })

  it('为资源字段按类型提供候选项，避免混入无关资源', () => {
    const giveSections = getNodeConfigSections('give')
    const itemField = giveSections.common.find((field) => field.key === 'item')

    expect(itemField).toBeTruthy()

    const options = getResourceOptionsForField(itemField!)

    expect(options.map((entry) => entry.id)).toContain('minecraft:diamond')
    expect(options.map((entry) => entry.id)).not.toContain('minecraft:stone')
  })

  it('资源候选应根据当前输入过滤，并优先返回匹配项', () => {
    const giveSections = getNodeConfigSections('give')
    const itemField = giveSections.common.find((field) => field.key === 'item')

    expect(itemField).toBeTruthy()

    const suggestions = getResourceSuggestions(itemField!, 'diamond')

    expect(suggestions.map((entry) => entry.id)).toContain('minecraft:diamond')
    expect(suggestions.map((entry) => entry.id)).toContain('minecraft:diamond_sword')
    expect(suggestions.map((entry) => entry.id)).not.toContain('minecraft:stone')
  })
})
