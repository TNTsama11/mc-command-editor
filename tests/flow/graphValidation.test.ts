import { describe, expect, it } from 'vitest'

import { validateWorkflowGraph } from '@/core/workflow/graphValidation'
import type { MCEdge, MCNode } from '@/store/flowStore'

describe('workflow graph validation', () => {
  it('检测缺失必填输入的节点', () => {
    const nodes: MCNode[] = [
      {
        id: 'give-node',
        type: 'command',
        position: { x: 0, y: 0 },
        data: {
          label: 'Give',
          commandType: 'give',
          inputs: [
            { id: 'exec-in', name: '执行', type: 'execute', required: true },
            { id: 'target', name: '目标', type: 'entity', required: true },
            { id: 'item', name: '物品', type: 'resource', required: true },
          ],
          outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
          config: {},
        },
      },
    ]

    const result = validateWorkflowGraph(nodes, [])

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'missing-required-input',
          nodeId: 'give-node',
          handleId: 'target',
        }),
        expect.objectContaining({
          severity: 'error',
          code: 'missing-required-input',
          nodeId: 'give-node',
          handleId: 'item',
        }),
      ])
    )
  })

  it('检测孤立节点', () => {
    const nodes: MCNode[] = [
      {
        id: 'number-node',
        type: 'command',
        position: { x: 80, y: 40 },
        data: {
          label: 'Number',
          commandType: 'number',
          inputs: [],
          outputs: [{ id: 'value', name: '值', type: 'number' }],
          config: { value: 1 },
        },
      },
    ]

    const result = validateWorkflowGraph(nodes, [])

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'isolated-node',
          nodeId: 'number-node',
        }),
      ])
    )
  })

  it('检测未接入执行流的命令节点', () => {
    const nodes: MCNode[] = [
      {
        id: 'give-node',
        type: 'command',
        position: { x: 0, y: 0 },
        data: {
          label: 'Give',
          commandType: 'give',
          inputs: [
            { id: 'exec-in', name: '执行', type: 'execute', required: true },
            { id: 'target', name: '目标', type: 'entity', required: true },
            { id: 'item', name: '物品', type: 'resource', required: true },
          ],
          outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
          config: {
            target: '@p',
            item: 'minecraft:diamond',
          },
        },
      },
      {
        id: 'selector-node',
        type: 'command',
        position: { x: -160, y: 0 },
        data: {
          label: 'Select Entity',
          commandType: 'selector',
          inputs: [],
          outputs: [{ id: 'entity', name: '实体', type: 'entity' }],
          config: {},
        },
      },
    ]

    const edges: MCEdge[] = [
      {
        id: 'selector-entity-give-target',
        source: 'selector-node',
        sourceHandle: 'entity',
        target: 'give-node',
        targetHandle: 'target',
        data: { type: 'entity' },
      },
    ]

    const result = validateWorkflowGraph(nodes, edges)

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'disconnected-execute',
          nodeId: 'give-node',
          handleId: 'exec-in',
        }),
      ])
    )
  })

  it('检测与目标版本不兼容的资源参数', () => {
    const nodes: MCNode[] = [
      {
        id: 'give-node',
        type: 'command',
        position: { x: 0, y: 0 },
        data: {
          label: 'Give',
          commandType: 'give',
          inputs: [
            { id: 'exec-in', name: '执行', type: 'execute', required: true },
            { id: 'target', name: '目标', type: 'entity', required: true },
            { id: 'item', name: '物品', type: 'resource', required: true },
          ],
          outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
          config: {
            target: '@p',
            item: 'minecraft:mace',
          },
        },
      },
      {
        id: 'execute-node',
        type: 'command',
        position: { x: -180, y: 0 },
        data: {
          label: 'Execute',
          commandType: 'execute',
          inputs: [],
          outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
          config: {},
        },
      },
    ]

    const edges: MCEdge[] = [
      {
        id: 'execute-give',
        source: 'execute-node',
        sourceHandle: 'exec-out',
        target: 'give-node',
        targetHandle: 'exec-in',
        data: { type: 'execute' },
      },
    ]

    const result = validateWorkflowGraph(nodes, edges, { targetVersion: '1.20.4' })

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'warning',
          code: 'resource-version-mismatch',
          nodeId: 'give-node',
          handleId: 'item',
        }),
      ])
    )
  })
})
