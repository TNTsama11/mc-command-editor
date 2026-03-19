import type { WorkflowDocument } from '@/core/workflow/types'

export interface Datapack {
  id: string
  name: string
  description?: string
  version: string
  format: number
  namespaces: Namespace[]
}

export interface Namespace {
  name: string
  functions: McFunction[]
  tags?: McTag[]
}

export interface McFunction {
  name: string
  commands: Command[]
}

export interface McTag {
  name: string
  type: 'function' | 'block' | 'entity_type' | 'item' | 'fluid'
  values: string[]
}

export interface Command {
  id: string
  type: string
  raw: string
  parsed?: boolean
  error?: string
}

export interface CommandBlock {
  id: string
  type: 'impulse' | 'chain' | 'repeat'
  conditional: boolean
  command: string
  auto: boolean
}

export type TargetSelector = '@p' | '@a' | '@e' | '@r' | '@s' | string

export interface Position {
  x: number | string
  y: number | string
  z: number | string
}

export interface NBTTag {
  [key: string]: NBTValue
}

export type NBTValue = string | number | boolean | NBTTag | NBTValue[]

export interface Project {
  id: string
  name: string
  description?: string
  targetVersion: string
  createdAt: number
  updatedAt: number
  mainWorkflowId: string
  workflows: Record<string, WorkflowDocument>
  commandBlocks: CommandBlock[]
  datapacks: Datapack[]
}
