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
