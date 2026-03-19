/**
 * FlowEditor 组件
 * React Flow 主编辑器，支持节点拖拽、连接和缩放
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  type Edge,
  MiniMap,
  type Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { cn } from '@/lib/utils'
import { useFlowStore, type CommandNodeData } from '@/store/flowStore'
import { CommandNode } from './CommandNode'
import { createNode } from './NodeFactory'

export const EMPTY_FLOW_HINTS = {
  title: '先从高频命令或 Execute 节点开始',
  items: ['圆形引脚表示执行流', '方形引脚表示数据流'],
} as const

const FUNCTION_NODE_PLACEHOLDER_MESSAGE = '函数节点封装将在后续任务中继续完善。'

export function EmptyFlowStateHint() {
  return (
    <div className="rounded-lg border border-border bg-card/90 p-4 text-center backdrop-blur">
      <div className="mb-2 text-sm font-medium">{EMPTY_FLOW_HINTS.title}</div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {EMPTY_FLOW_HINTS.items.map((item) => (
          <div key={item}>{item}</div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = {
  command: CommandNode,
}

interface FlowEditorProps {
  className?: string
}

function FlowEditorInner({ className }: FlowEditorProps) {
  const contextMenuWidth = 152
  const contextMenuHeight = 44
  const contextMenuPadding = 8

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNodeId,
    selectedEdgeId,
    connectionError,
    clearConnectionError,
    setSelectedNode,
    setSelectedEdge,
    addNode,
    removeNode,
    removeEdge,
  } = useFlowStore()

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    targetType: 'node' | 'edge'
    targetId: string
  } | null>(null)
  const [functionNodeNotice, setFunctionNodeNotice] = useState<string | null>(null)

  const { fitView, screenToFlowPosition } = useReactFlow()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<CommandNodeData>) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setSelectedEdge(null)
    setContextMenu(null)
    clearConnectionError()
  }, [clearConnectionError, setSelectedEdge, setSelectedNode])

  const onEdgeClick = useCallback(
    (_event: ReactMouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id)
    },
    [setSelectedEdge]
  )

  const handleDeleteSelection = useCallback(() => {
    if (selectedNodeId) {
      removeNode(selectedNodeId)
      setContextMenu(null)
      return
    }

    if (selectedEdgeId) {
      removeEdge(selectedEdgeId)
      setContextMenu(null)
    }
  }, [removeEdge, removeNode, selectedEdgeId, selectedNodeId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }

      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      const isTypingTarget =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isTypingTarget || (!selectedNodeId && !selectedEdgeId)) {
        return
      }

      event.preventDefault()
      handleDeleteSelection()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleDeleteSelection, selectedEdgeId, selectedNodeId])

  useEffect(() => {
    if (!functionNodeNotice) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setFunctionNodeNotice(null)
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [functionNodeNotice])

  const nodeColor = useCallback((node: Node<CommandNodeData>) => {
    const colors: Record<string, string> = {
      execute: '#3b82f6',
      give: '#22c55e',
      tp: '#f97316',
      summon: '#a855f7',
      kill: '#ef4444',
      fill: '#eab308',
      setblock: '#06b6d4',
      default: '#6b7280',
    }

    return colors[node.data?.commandType] || colors.default
  }, [])

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2 })
  }, [fitView])

  const handleWrapAsFunctionNode = useCallback(() => {
    setFunctionNodeNotice(FUNCTION_NODE_PLACEHOLDER_MESSAGE)
  }, [])

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(createNode(type, position))
    },
    [addNode, screenToFlowPosition]
  )

  const selectedNode = nodes.find((node) => node.id === selectedNodeId)

  const getContextMenuPosition = useCallback((clientX: number, clientY: number) => {
    const wrapper = reactFlowWrapper.current
    if (!wrapper) {
      return { x: clientX, y: clientY }
    }

    const rect = wrapper.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const relativeY = clientY - rect.top

    return {
      x: Math.min(
        Math.max(relativeX, contextMenuPadding),
        Math.max(rect.width - contextMenuWidth - contextMenuPadding, contextMenuPadding)
      ),
      y: Math.min(
        Math.max(relativeY, contextMenuPadding),
        Math.max(rect.height - contextMenuHeight - contextMenuPadding, contextMenuPadding)
      ),
    }
  }, [])

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: Node<CommandNodeData>) => {
      event.preventDefault()
      const position = getContextMenuPosition(event.clientX, event.clientY)
      setSelectedNode(node.id)
      setSelectedEdge(null)
      setContextMenu({
        x: position.x,
        y: position.y,
        targetType: 'node',
        targetId: node.id,
      })
    },
    [getContextMenuPosition, setSelectedEdge, setSelectedNode]
  )

  const onEdgeContextMenu = useCallback(
    (event: ReactMouseEvent, edge: Edge) => {
      event.preventDefault()
      const position = getContextMenuPosition(event.clientX, event.clientY)
      setSelectedNode(null)
      setSelectedEdge(edge.id)
      setContextMenu({
        x: position.x,
        y: position.y,
        targetType: 'edge',
        targetId: edge.id,
      })
    },
    [getContextMenuPosition, setSelectedEdge, setSelectedNode]
  )

  const handleContextDelete = useCallback(() => {
    if (!contextMenu) {
      return
    }

    if (contextMenu.targetType === 'node') {
      removeNode(contextMenu.targetId)
    } else {
      removeEdge(contextMenu.targetId)
    }

    setContextMenu(null)
  }, [contextMenu, removeEdge, removeNode])

  return (
    <div
      ref={reactFlowWrapper}
      className={cn('relative min-h-0 min-w-0', className)}
      onClick={() => setContextMenu(null)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={onEdgeClick}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={4}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        snapToGrid
        snapGrid={[16, 16]}
        className="bg-muted/30"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Panel position="top-left" className="flex gap-2">
          <button
            onClick={handleFitView}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent"
          >
            适应视图
          </button>
          <button
            type="button"
            onClick={handleWrapAsFunctionNode}
            disabled={!selectedNodeId}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            封装为函数节点
          </button>
        </Panel>
        <MiniMap
          nodeColor={nodeColor}
          maskColor="rgba(0, 0, 0, 0.8)"
          position="bottom-right"
          style={{ background: 'hsl(var(--card))' }}
        />

        {selectedNodeId && selectedNode && (
          <Panel position="top-right">
            <div className="max-w-xs rounded-lg border border-border bg-card p-3 text-xs">
              <div className="mb-1 font-medium">节点信息</div>
              <div className="text-muted-foreground">ID: {selectedNodeId}</div>
              {selectedNode.data.config && (
                <div className="mt-2 border-t border-border pt-2">
                  <div className="mb-1 font-medium">配置</div>
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {JSON.stringify(selectedNode.data.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Panel>
        )}

        {nodes.length === 0 && (
          <Panel position="top-center">
            <EmptyFlowStateHint />
          </Panel>
        )}

        {connectionError && (
          <Panel position="top-center">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive shadow-sm">
              {connectionError}
            </div>
          </Panel>
        )}

        {functionNodeNotice && (
          <Panel position="top-center">
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary shadow-sm">
              {functionNodeNotice}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {contextMenu && (
        <div
          className="absolute z-50 min-w-32 rounded-md border border-border bg-card p-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center rounded px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={handleContextDelete}
          >
            删除{contextMenu.targetType === 'node' ? '节点' : '连线'}
          </button>
        </div>
      )}
    </div>
  )
}

export function FlowEditor(props: FlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
