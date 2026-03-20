import { beforeEach, describe, expect, it } from 'vitest'

import {
  deserializeProjectDocument,
  serializeProjectDocument,
} from '@/core/workflow/projectSerializer'
import { createWorkflowDocumentSnapshot, type MCNode, useFlowStore } from '@/store/flowStore'
import { useProjectStore } from '@/store/projectStore'

describe('project workflow model', () => {
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

  it('新建项目时应初始化主工作流、工作流映射表和目标版本', () => {
    const project = useProjectStore.getState().createProject('Workflow Project')

    expect(project.targetVersion).toBe('1.21')
    expect(project.mainWorkflowId).toBeTruthy()
    expect(Object.keys(project.workflows)).toEqual([project.mainWorkflowId])

    const mainWorkflow = project.workflows[project.mainWorkflowId]
    expect(mainWorkflow.name).toBe('主工作流')
    expect(mainWorkflow.nodes).toEqual([])
    expect(mainWorkflow.edges).toEqual([])
    expect(mainWorkflow.interface).toEqual({
      inputs: [],
      outputs: [],
    })
  })

  it('flow store 应能导出当前画布为工作流文档快照', () => {
    const giveNode: MCNode = {
      id: 'give-node',
      type: 'command',
      position: { x: 120, y: 80 },
      data: {
        label: 'Give',
        commandType: 'give',
        inputs: [
          { id: 'exec-in', name: '执行', type: 'execute', required: true },
          { id: 'target', name: '目标', type: 'entity', required: true },
        ],
        outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
        config: { target: '@p', item: 'minecraft:diamond' },
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

    const workflow = createWorkflowDocumentSnapshot({
      id: 'main',
      name: '主工作流',
      kind: 'main',
    })

    expect(workflow.id).toBe('main')
    expect(workflow.nodes).toHaveLength(1)
    expect(workflow.edges).toEqual([])
    expect(workflow.interface).toEqual({
      inputs: [],
      outputs: [],
    })
    expect(workflow.metadata.kind).toBe('main')
  })

  it('更新项目信息时应保留目标版本字段', () => {
    useProjectStore.getState().createProject('Workflow Project')
    useProjectStore.getState().updateProjectInfo({
      name: 'Workflow Project v2',
      targetVersion: '1.20.4',
    })

    expect(useProjectStore.getState().currentProject?.targetVersion).toBe('1.20.4')
  })

  it('项目应支持更新指定工作流文档', () => {
    const project = useProjectStore.getState().createProject('Workflow Project')

    useProjectStore.getState().setWorkflowDocument(project.mainWorkflowId, {
      ...project.workflows[project.mainWorkflowId],
      nodes: [
        {
          id: 'give-node',
          type: 'command',
          position: { x: 120, y: 80 },
          data: {
            label: 'Give',
            commandType: 'give',
          },
        },
      ],
    })

    expect(useProjectStore.getState().currentProject?.workflows[project.mainWorkflowId]?.nodes).toHaveLength(1)
    expect(useProjectStore.getState().currentProject?.workflows[project.mainWorkflowId]?.nodes[0]?.id).toBe(
      'give-node'
    )
  })

  it('项目应支持创建函数工作流，并保留接口定义', () => {
    const project = useProjectStore.getState().createProject('Workflow Project')

    const functionWorkflow = useProjectStore.getState().createFunctionWorkflow({
      name: '奖励逻辑',
      description: '复用一段奖励流程',
      inputs: [{ id: 'target', name: '目标', type: 'entity', required: true }],
      outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
    })

    expect(functionWorkflow.id).not.toBe(project.mainWorkflowId)
    expect(functionWorkflow.metadata.kind).toBe('function')
    expect(functionWorkflow.name).toBe('奖励逻辑')
    expect(functionWorkflow.metadata.description).toBe('复用一段奖励流程')
    expect(functionWorkflow.interface.inputs).toEqual([
      { id: 'target', name: '目标', type: 'entity', required: true },
    ])
    expect(functionWorkflow.interface.outputs).toEqual([
      { id: 'exec-out', name: '执行', type: 'execute' },
    ])
    expect(useProjectStore.getState().currentProject?.workflows[functionWorkflow.id]).toEqual(functionWorkflow)
  })

  it('项目应能筛出可复用的函数工作流列表', () => {
    useProjectStore.getState().createProject('Workflow Project')
    const rewardWorkflow = useProjectStore.getState().createFunctionWorkflow({
      name: '奖励逻辑',
    })
    const combatWorkflow = useProjectStore.getState().createFunctionWorkflow({
      name: '战斗逻辑',
    })

    const functionWorkflows = useProjectStore.getState().getFunctionWorkflows()

    expect(functionWorkflows).toHaveLength(2)
    expect(functionWorkflows.map((workflow) => workflow.id)).toEqual([rewardWorkflow.id, combatWorkflow.id])
    expect(functionWorkflows.every((workflow) => workflow.metadata.kind === 'function')).toBe(true)
  })

  it('项目序列化后应保留工作流和目标版本', () => {
    const project = useProjectStore.getState().createProject('Workflow Project')
    project.workflows['wf-reward'] = {
      id: 'wf-reward',
      name: '奖励逻辑',
      nodes: [],
      edges: [],
      interface: {
        inputs: [{ id: 'target', name: '目标', type: 'entity' }],
        outputs: [{ id: 'exec-out', name: '执行', type: 'execute' }],
      },
      metadata: {
        kind: 'function',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }

    const serialized = serializeProjectDocument(project)
    const restored = deserializeProjectDocument(serialized)

    expect(restored.targetVersion).toBe('1.21')
    expect(restored.workflows['wf-reward']?.name).toBe('奖励逻辑')
    expect(restored.workflows['wf-reward']?.metadata.kind).toBe('function')
  })
})
