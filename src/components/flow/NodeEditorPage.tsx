/**
 * 节点编辑器页面
 * 集成 FlowEditor、NodePanel 和 VariablePanel 的完整页面
 */

import { useEffect, useMemo, useState } from 'react'
import { Blocks, Database, PanelLeft, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createWorkflowDocumentSnapshot, useFlowStore } from '@/store/flowStore'
import { useCurrentProject, useProjectStore } from '@/store/projectStore'
import { FlowEditor } from './FlowEditor'
import { WorkflowProblemsPanel } from './WorkflowProblemsPanel'
import { NodePanel } from './NodePanel'
import { VariablePanel } from './VariablePanel'
import { NodeConfigPanel } from './NodeConfigPanel'

type LeftPanel = 'nodes' | 'variables'
const DEFAULT_TARGET_VERSION = '1.21'

interface NodeEditorPageProps {
  className?: string
}

export function NodeEditorPage({ className }: NodeEditorPageProps) {
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('nodes')
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const currentProject = useCurrentProject()
  const setWorkflowDocument = useProjectStore((state) => state.setWorkflowDocument)
  const {
    nodes,
    edges,
    selectedNodeId,
    workflowIssues,
    setNodes,
    setEdges,
    setSelectedNode,
    validateGraph,
  } = useFlowStore()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')

    const syncPanelState = (event?: MediaQueryList | MediaQueryListEvent) => {
      setLeftPanelOpen((event ?? mediaQuery).matches)
    }

    syncPanelState()
    mediaQuery.addEventListener('change', syncPanelState)

    return () => {
      mediaQuery.removeEventListener('change', syncPanelState)
    }
  }, [])

  useEffect(() => {
    validateGraph(currentProject?.targetVersion ?? DEFAULT_TARGET_VERSION)
  }, [currentProject?.targetVersion, edges, nodes, validateGraph])

  useEffect(() => {
    const workflow = currentProject?.workflows[currentProject.mainWorkflowId]
    if (!workflow) {
      return
    }

    setNodes(
      workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type as 'command',
        position: node.position,
        data: node.data as never,
      }))
    )
    setEdges(
      workflow.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        animated: edge.animated,
        data: edge.data as never,
      }))
    )
  }, [currentProject?.id, currentProject?.mainWorkflowId, currentProject?.workflows, setEdges, setNodes])

  useEffect(() => {
    if (!currentProject) {
      return
    }

    const snapshot = createWorkflowDocumentSnapshot({
      id: currentProject.mainWorkflowId,
      name: currentProject.workflows[currentProject.mainWorkflowId]?.name ?? '主工作流',
      kind: currentProject.workflows[currentProject.mainWorkflowId]?.metadata.kind ?? 'main',
      description: currentProject.workflows[currentProject.mainWorkflowId]?.metadata.description,
    })

    const previous = currentProject.workflows[currentProject.mainWorkflowId]
    const hasSameNodes = JSON.stringify(previous?.nodes ?? []) === JSON.stringify(snapshot.nodes)
    const hasSameEdges = JSON.stringify(previous?.edges ?? []) === JSON.stringify(snapshot.edges)

    if (hasSameNodes && hasSameEdges) {
      return
    }

    setWorkflowDocument(currentProject.mainWorkflowId, {
      ...snapshot,
      interface: previous?.interface ?? snapshot.interface,
      metadata: {
        ...snapshot.metadata,
        createdAt: previous?.metadata.createdAt ?? snapshot.metadata.createdAt,
      },
    })
  }, [currentProject, edges, nodes, setWorkflowDocument])

  const groupedIssues = useMemo(() => {
    return workflowIssues.map((issue) => ({
      ...issue,
      testId: `workflow-issue-item-${issue.nodeId}${issue.handleId ? `-${issue.handleId}` : ''}`,
    }))
  }, [workflowIssues])

  return (
    <div className={cn('relative flex h-full min-h-0', className)}>
      <div
        data-testid="desktop-node-panel-container"
        className={cn(
          'hidden flex-shrink-0 flex-col border-r border-border transition-all duration-200 md:flex',
          'w-64 lg:w-72',
          !leftPanelOpen && 'w-0 overflow-hidden border-r-0'
        )}
      >
        <PanelTabs leftPanel={leftPanel} onSelect={setLeftPanel} />

        <div className="flex-1 overflow-hidden">
          {leftPanel === 'nodes' ? (
            <NodePanel className="h-full" />
          ) : (
            <VariablePanel className="h-full" />
          )}
        </div>
      </div>

      {leftPanelOpen && (
        <div
          data-testid="mobile-node-panel-container"
          className="absolute inset-y-0 left-0 z-30 w-72 max-w-[80vw] border-r border-border bg-card shadow-xl md:hidden"
        >
          <div className="flex h-full flex-col">
            <PanelTabs leftPanel={leftPanel} onSelect={setLeftPanel} />
            <div className="flex-1 overflow-hidden">
              {leftPanel === 'nodes' ? (
                <NodePanel className="h-full" />
              ) : (
                <VariablePanel className="h-full" />
              )}
            </div>
          </div>
        </div>
      )}

      {leftPanelOpen && (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/30 md:hidden"
          aria-label="关闭节点面板"
          onClick={() => setLeftPanelOpen(false)}
        />
      )}

      <div className="relative min-h-0 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-2 z-40"
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          title={leftPanelOpen ? '收起面板' : '展开面板'}
        >
          {leftPanelOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
        <FlowEditor className="h-full" />

        <WorkflowProblemsPanel
          issues={groupedIssues}
          onSelectIssue={(issue) => setSelectedNode(issue.nodeId)}
        />
      </div>

      {selectedNodeId && (
        <div
          data-testid="desktop-node-config-container"
          className={cn(
            'hidden flex-shrink-0 border-l border-border bg-card md:flex',
            'w-72 lg:w-80'
          )}
        >
          <NodeConfigPanel />
        </div>
      )}

      {selectedNodeId && (
        <div
          data-testid="mobile-node-config-container"
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[60vh] overflow-auto border-t border-border bg-card shadow-lg md:hidden',
            'animate-in slide-in-from-bottom duration-200'
          )}
        >
          <div className="flex items-center justify-between border-b border-border p-2">
            <span className="text-sm font-medium">节点配置</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedNode(null)}
            >
              关闭
            </Button>
          </div>
          <NodeConfigPanel />
        </div>
      )}
    </div>
  )
}

interface PanelTabsProps {
  leftPanel: LeftPanel
  onSelect: (panel: LeftPanel) => void
}

function PanelTabs({ leftPanel, onSelect }: PanelTabsProps) {
  return (
    <div className="flex border-b border-border">
      <button
        type="button"
        onClick={() => onSelect('nodes')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1 px-3 py-2 text-sm transition-colors',
          leftPanel === 'nodes'
            ? 'border-b-2 border-primary bg-primary/10 text-primary'
            : 'hover:bg-muted'
        )}
      >
        <Blocks className="h-4 w-4" />
        节点
      </button>
      <button
        type="button"
        onClick={() => onSelect('variables')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1 px-3 py-2 text-sm transition-colors',
          leftPanel === 'variables'
            ? 'border-b-2 border-primary bg-primary/10 text-primary'
            : 'hover:bg-muted'
        )}
      >
        <Database className="h-4 w-4" />
        变量
      </button>
    </div>
  )
}
