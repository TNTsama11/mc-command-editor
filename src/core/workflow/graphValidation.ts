import { RESOURCE_CATALOG } from '@/core/resources/catalog'
import type { MCEdge, MCNode, PinDefinition } from '@/store/flowStore'

export type WorkflowIssueSeverity = 'error' | 'warning'

export interface WorkflowIssue {
  severity: WorkflowIssueSeverity
  code:
    | 'missing-required-input'
    | 'isolated-node'
    | 'disconnected-execute'
    | 'resource-version-mismatch'
  message: string
  nodeId: string
  handleId?: string
}

export interface WorkflowValidationResult {
  issues: WorkflowIssue[]
}

export interface WorkflowValidationOptions {
  targetVersion?: string
}

function hasIncomingEdge(edges: MCEdge[], nodeId: string, handleId: string) {
  return edges.some((edge) => edge.target === nodeId && edge.targetHandle === handleId)
}

function hasAnyConnection(edges: MCEdge[], nodeId: string) {
  return edges.some((edge) => edge.source === nodeId || edge.target === nodeId)
}

function isRequiredInputSatisfied(
  input: PinDefinition,
  node: MCNode,
  edges: MCEdge[],
  config: Record<string, unknown>
) {
  if (hasIncomingEdge(edges, node.id, input.id)) {
    return true
  }

  const configValue = config[input.id]
  if (typeof configValue === 'string') {
    return configValue.trim().length > 0
  }

  if (typeof configValue === 'number' || typeof configValue === 'boolean') {
    return true
  }

  return false
}

function parseVersion(version: string) {
  return version
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part))
}

function compareVersions(left: string, right: string) {
  const leftParts = parseVersion(left)
  const rightParts = parseVersion(right)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0
    const rightValue = rightParts[index] ?? 0

    if (leftValue > rightValue) return 1
    if (leftValue < rightValue) return -1
  }

  return 0
}

function getResourceVersionMismatchMessage(resourceId: string, targetVersion: string) {
  const resource = RESOURCE_CATALOG.find((entry) => entry.id === resourceId)
  if (!resource?.version) {
    return null
  }

  const { minVersion, maxVersion } = resource.version

  if (minVersion && compareVersions(targetVersion, minVersion) < 0) {
    return `${resource.name} 需要 Minecraft ${minVersion} 或更高版本，当前项目为 ${targetVersion}`
  }

  if (maxVersion && compareVersions(targetVersion, maxVersion) > 0) {
    return `${resource.name} 仅支持到 Minecraft ${maxVersion}，当前项目为 ${targetVersion}`
  }

  return null
}

export function validateWorkflowGraph(
  nodes: MCNode[],
  edges: MCEdge[],
  options: WorkflowValidationOptions = {}
): WorkflowValidationResult {
  const issues: WorkflowIssue[] = []
  const targetVersion = options.targetVersion

  for (const node of nodes) {
    const config = (node.data.config ?? {}) as Record<string, unknown>

    if (!hasAnyConnection(edges, node.id)) {
      issues.push({
        severity: 'warning',
        code: 'isolated-node',
        nodeId: node.id,
        message: `${node.data.label} 尚未接入任何工作流连接`,
      })
    }

    for (const input of node.data.inputs) {
      if (!input.required || input.type === 'execute') {
        continue
      }

      if (!isRequiredInputSatisfied(input, node, edges, config)) {
        issues.push({
          severity: 'error',
          code: 'missing-required-input',
          nodeId: node.id,
          handleId: input.id,
          message: `${node.data.label} 缺少必填输入：${input.name}`,
        })
      }
    }

    const executeInput = node.data.inputs.find((input) => input.type === 'execute' && input.required)
    if (executeInput && !hasIncomingEdge(edges, node.id, executeInput.id)) {
      issues.push({
        severity: 'warning',
        code: 'disconnected-execute',
        nodeId: node.id,
        handleId: executeInput.id,
        message: `${node.data.label} 尚未接入执行流`,
      })
    }

    if (!targetVersion) {
      continue
    }

    for (const input of node.data.inputs) {
      if (input.type !== 'resource') {
        continue
      }

      const resourceId = config[input.id]
      if (typeof resourceId !== 'string' || !resourceId.trim()) {
        continue
      }

      const mismatchMessage = getResourceVersionMismatchMessage(resourceId, targetVersion)
      if (!mismatchMessage) {
        continue
      }

      issues.push({
        severity: 'warning',
        code: 'resource-version-mismatch',
        nodeId: node.id,
        handleId: input.id,
        message: `${node.data.label} 的资源参数 ${input.name} 与目标版本不兼容：${mismatchMessage}`,
      })
    }
  }

  return { issues }
}
