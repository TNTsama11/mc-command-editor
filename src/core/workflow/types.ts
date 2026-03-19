export interface WorkflowPortDocument {
  id: string
  name: string
  type: string
  required?: boolean
  multiple?: boolean
  description?: string
}

export interface WorkflowInterface {
  inputs: WorkflowPortDocument[]
  outputs: WorkflowPortDocument[]
}

export interface WorkflowNodeDocument {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface WorkflowEdgeDocument {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: string
  animated?: boolean
  data?: Record<string, unknown>
}

export interface WorkflowMetadata {
  kind: 'main' | 'function'
  createdAt: number
  updatedAt: number
  description?: string
}

export interface WorkflowDocument {
  id: string
  name: string
  nodes: WorkflowNodeDocument[]
  edges: WorkflowEdgeDocument[]
  interface: WorkflowInterface
  metadata: WorkflowMetadata
}

export interface NodeValueSource {
  kind: 'manual' | 'connection' | 'default'
  nodeId?: string
  handleId?: string
}

export function createEmptyWorkflowDocument(
  id: string,
  name = '主工作流',
  kind: WorkflowMetadata['kind'] = 'main'
): WorkflowDocument {
  const now = Date.now()

  return {
    id,
    name,
    nodes: [],
    edges: [],
    interface: {
      inputs: [],
      outputs: [],
    },
    metadata: {
      kind,
      createdAt: now,
      updatedAt: now,
    },
  }
}
