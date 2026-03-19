import { create } from 'zustand'
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'

import { validateWorkflowGraph, type WorkflowIssue } from '@/core/workflow/graphValidation'
import type { WorkflowDocument, WorkflowMetadata } from '@/core/workflow/types'

export type PinDataType =
  | 'execute'
  | 'position'
  | 'entity'
  | 'number'
  | 'string'
  | 'boolean'
  | 'nbt'
  | 'resource'
  | 'any'

export interface PinDefinition {
  id: string
  name: string
  type: PinDataType
  description?: string
  required?: boolean
  multiple?: boolean
}

export interface CommandNodeData {
  [key: string]: unknown
  label: string
  commandType: string
  description?: string
  inputs: PinDefinition[]
  outputs: PinDefinition[]
  config?: Record<string, unknown>
  errors?: string[]
}

export type MCNode = Node<CommandNodeData, 'command'>
export type MCEdge = Edge<{ type: PinDataType }>

interface FlowState {
  nodes: MCNode[]
  edges: MCEdge[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  viewport: { x: number; y: number; zoom: number }
  connectionError: string | null
  workflowIssues: WorkflowIssue[]

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void

  setNodes: (nodes: MCNode[]) => void
  setEdges: (edges: MCEdge[]) => void
  addNode: (node: MCNode) => void
  removeNode: (id: string) => void
  removeEdge: (id: string) => void
  updateNodeData: (id: string, data: Partial<CommandNodeData>) => void

  setSelectedNode: (id: string | null) => void
  setSelectedEdge: (id: string | null) => void
  clearConnectionError: () => void
  validateGraph: (targetVersion?: string) => void

  exportToJson: () => string
  importFromJson: (json: string) => void
  clear: () => void
}

interface WorkflowSnapshotOptions {
  id: string
  name: string
  kind: WorkflowMetadata['kind']
  description?: string
}

const INITIAL_VIEWPORT = { x: 0, y: 0, zoom: 1 }

function buildConnectionError(sourceType: PinDataType, targetType: PinDataType) {
  return `无法连接：${sourceType} 不能连接到 ${targetType}`
}

function buildEdgeId(connection: Connection) {
  return `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`
}

function applyIssuesToNodes(nodes: MCNode[], issues: WorkflowIssue[]) {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      errors: issues.filter((issue) => issue.nodeId === node.id).map((issue) => issue.message),
    },
  }))
}

function hasSameNodeErrors(left: MCNode[], right: MCNode[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((node, index) => {
    const peer = right[index]
    const leftErrors = node.data.errors ?? []
    const rightErrors = peer?.data.errors ?? []

    if (!peer || node.id !== peer.id || leftErrors.length !== rightErrors.length) {
      return false
    }

    return leftErrors.every((error, errorIndex) => error === rightErrors[errorIndex])
  })
}

function isConnectionCompatible(sourceType: PinDataType, targetType: PinDataType) {
  return sourceType === 'any' || targetType === 'any' || sourceType === targetType
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  viewport: INITIAL_VIEWPORT,
  connectionError: null,
  workflowIssues: [],

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as MCNode[],
    })
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges) as MCEdge[],
    })
  },

  onConnect: (connection) => {
    const sourceNode = get().nodes.find((node) => node.id === connection.source)
    const targetNode = get().nodes.find((node) => node.id === connection.target)
    const sourceHandle = sourceNode?.data.outputs.find((pin) => pin.id === connection.sourceHandle)
    const targetHandle = targetNode?.data.inputs.find((pin) => pin.id === connection.targetHandle)

    const sourceType = sourceHandle?.type ?? 'any'
    const targetType = targetHandle?.type ?? 'any'

    if (!isConnectionCompatible(sourceType, targetType)) {
      console.warn(`类型不匹配: ${sourceType} -> ${targetType}`)
      set({
        connectionError: buildConnectionError(sourceType, targetType),
      })
      return
    }

    const nextEdge: MCEdge = {
      id: buildEdgeId(connection),
      source: connection.source ?? '',
      sourceHandle: connection.sourceHandle,
      target: connection.target ?? '',
      targetHandle: connection.targetHandle,
      data: { type: sourceType },
      type: 'smoothstep',
      animated: sourceType === 'execute',
      style: { stroke: getPinColor(sourceType) },
    }

    set((state) => ({
      edges: [...state.edges, nextEdge],
      connectionError: null,
    }))
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    })),

  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    })),

  updateNodeData: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    })),

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearConnectionError: () => set({ connectionError: null }),

  validateGraph: (targetVersion) => {
    const state = get()
    const result = validateWorkflowGraph(state.nodes, state.edges, { targetVersion })
    const nextNodes = applyIssuesToNodes(state.nodes, result.issues)

    set({
      workflowIssues: result.issues,
      nodes: hasSameNodeErrors(state.nodes, nextNodes) ? state.nodes : nextNodes,
    })
  },

  exportToJson: () => {
    const state = get()

    return JSON.stringify(
      {
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
      },
      null,
      2
    )
  },

  importFromJson: (json) => {
    try {
      const parsed = JSON.parse(json) as Partial<{
        nodes: MCNode[]
        edges: MCEdge[]
        viewport: FlowState['viewport']
      }>

      set({
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        viewport: parsed.viewport || INITIAL_VIEWPORT,
        connectionError: null,
        workflowIssues: [],
      })
    } catch (error) {
      console.error('导入工作流失败:', error)
    }
  },

  clear: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      viewport: INITIAL_VIEWPORT,
      connectionError: null,
      workflowIssues: [],
    }),
}))

export function createWorkflowDocumentSnapshot(
  options: WorkflowSnapshotOptions
): WorkflowDocument {
  const { nodes, edges } = useFlowStore.getState()
  const now = Date.now()

  return {
    id: options.id,
    name: options.name,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      animated: edge.animated,
      data: edge.data as Record<string, unknown> | undefined,
    })),
    interface: {
      inputs: [],
      outputs: [],
    },
    metadata: {
      kind: options.kind,
      description: options.description,
      createdAt: now,
      updatedAt: now,
    },
  }
}

export function getPinColor(type: PinDataType): string {
  const colors: Record<PinDataType, string> = {
    execute: 'var(--mc-pin-execute, #ffffff)',
    position: 'var(--mc-pin-position, #22c55e)',
    entity: 'var(--mc-pin-entity, #ef4444)',
    number: 'var(--mc-pin-number, #3b82f6)',
    string: 'var(--mc-pin-string, #eab308)',
    boolean: 'var(--mc-pin-boolean, #a855f7)',
    nbt: 'var(--mc-pin-nbt, #f97316)',
    resource: 'var(--mc-pin-resource, #06b6d4)',
    any: 'var(--mc-pin-any, #6b7280)',
  }

  return colors[type] || colors.any
}
