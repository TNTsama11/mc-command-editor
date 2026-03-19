import { beforeEach, describe, expect, it } from 'vitest'

import {
  getPinHandleClassName,
  getPinSemanticKind,
} from '@/components/flow/CommandNode'
import { FUNCTION_NODE_EDITOR_TITLE } from '@/components/flow/FunctionNodeEditor'
import { EMPTY_FLOW_HINTS } from '@/components/flow/FlowEditor'
import { createFunctionNode } from '@/components/flow/NodeFactory'
import { useProjectStore } from '@/store/projectStore'
import { type MCNode, useFlowStore } from '@/store/flowStore'

describe('Task 3 Integration', () => {
  beforeEach(() => {
    useFlowStore.getState().clear()
    useProjectStore.setState({
      currentProject: null,
      isDirty: false,
      projectList: [],
      autoSave: false,
      autoSaveInterval: 30000,
      storagePrefix: 'mc-editor-test',
    })
  })

  it('为执行流和数据流引脚提供不同的语义标记', () => {
    expect(getPinSemanticKind('execute')).toBe('execute')
    expect(getPinSemanticKind('number')).toBe('data')

    expect(getPinHandleClassName('execute')).toContain('rounded-full')
    expect(getPinHandleClassName('number')).toContain('rounded-sm')
  })

  it('空画布提示应明确推荐起点，并解释执行流和数据流', () => {
    expect(EMPTY_FLOW_HINTS.title).toBe('先从高频命令或 Execute 节点开始')
    expect(EMPTY_FLOW_HINTS.items).toContain('圆形引脚表示执行流')
    expect(EMPTY_FLOW_HINTS.items).toContain('方形引脚表示数据流')
  })

  it('拒绝不兼容连线时应保留可见的失败原因', () => {
    const numberNode: MCNode = {
      id: 'source',
      type: 'command',
      position: { x: 0, y: 0 },
      data: {
        label: 'Number',
        commandType: 'number',
        inputs: [],
        outputs: [{ id: 'value', name: '值', type: 'number' }],
      },
    }

    const entityNode: MCNode = {
      id: 'target',
      type: 'command',
      position: { x: 100, y: 0 },
      data: {
        label: 'Give',
        commandType: 'give',
        inputs: [{ id: 'target', name: '目标', type: 'entity', required: true }],
        outputs: [],
      },
    }

    useFlowStore.setState({
      nodes: [numberNode, entityNode],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      connectionError: null,
      workflowIssues: [],
    })

    useFlowStore.getState().onConnect({
      source: 'source',
      sourceHandle: 'value',
      target: 'target',
      targetHandle: 'target',
    })

    expect(useFlowStore.getState().edges).toHaveLength(0)
    expect(useFlowStore.getState().connectionError).toBe('无法连接：number 不能连接到 entity')
  })

  it('函数节点应引用目标工作流并暴露输入输出接口', () => {
    const functionNode = createFunctionNode(
      {
        workflowId: 'wf-reward',
        name: '奖励逻辑',
        description: '复用一段奖励流程',
        inputs: [{ id: 'target', name: '目标', type: 'entity', required: true }],
        outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
      },
      { x: 320, y: 160 }
    )

    expect(functionNode.data.commandType).toBe('function')
    expect(functionNode.data.workflowId).toBe('wf-reward')
    expect(functionNode.data.inputs).toEqual([
      { id: 'target', name: '目标', type: 'entity', required: true },
    ])
    expect(functionNode.data.outputs).toEqual([
      { id: 'exec-out', name: '执行', type: 'execute' },
    ])
  })

  it('函数编辑器骨架应暴露稳定标题，供后续进入子图编辑', () => {
    expect(FUNCTION_NODE_EDITOR_TITLE).toBe('函数节点编辑器')
  })

  it('工作流检查器结果应回写到 store，并同步节点错误状态', () => {
    const giveNode: MCNode = {
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
    }

    useFlowStore.setState({
      nodes: [giveNode],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      connectionError: null,
      workflowIssues: [],
    })

    useFlowStore.getState().validateGraph()

    expect(useFlowStore.getState().workflowIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-required-input',
          nodeId: 'give-node',
        }),
      ])
    )
    expect(useFlowStore.getState().nodes[0].data.errors).toEqual(
      expect.arrayContaining(['Give 缺少必填输入：目标', 'Give 缺少必填输入：物品'])
    )
  })

  it('工作流检查器应根据项目目标版本写入资源兼容警告', () => {
    useProjectStore.getState().createProject('Version Test')
    useProjectStore.getState().updateProjectInfo({ targetVersion: '1.20.4' })

    const giveNode: MCNode = {
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
    }

    useFlowStore.setState({
      nodes: [giveNode],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      connectionError: null,
      workflowIssues: [],
    })

    useFlowStore.getState().validateGraph(
      useProjectStore.getState().currentProject?.targetVersion
    )

    expect(useFlowStore.getState().workflowIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'resource-version-mismatch',
          nodeId: 'give-node',
          handleId: 'item',
        }),
      ])
    )
    expect(useFlowStore.getState().nodes[0].data.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('与目标版本不兼容')])
    )
  })
})
