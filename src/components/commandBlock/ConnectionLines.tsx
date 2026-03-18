/**
 * 命令方块连接线组件
 *
 * 使用 SVG 绘制命令方块之间的连接线，显示执行顺序
 * 支持普通连接（实线）和条件连接（虚线）
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// 类型定义
// ============================================================================

/** 节点位置信息 */
export interface ConnectionNode {
  id: string
  x: number
  y: number
}

/** 连接关系 */
export interface Connection {
  /** 起始节点 ID */
  from: string
  /** 目标节点 ID */
  to: string
  /** 是否为条件连接 */
  conditional: boolean
}

/** ConnectionLines 组件 Props */
export interface ConnectionLinesProps {
  /** 节点位置数组 */
  nodes: ConnectionNode[]
  /** 连接关系数组 */
  connections: Connection[]
  /** 额外的 className */
  className?: string
  /** SVG 容器的宽度 */
  width?: number | string
  /** SVG 容器的高度 */
  height?: number | string
}

// ============================================================================
// 常量定义
// ============================================================================

/** 线条宽度 */
const STROKE_WIDTH = 2

/** 箭头大小 */
const ARROW_SIZE = 6

/** 条件连接颜色（橙色） */
const CONDITIONAL_COLOR = '#f97316'

/** 普通连接颜色 */
const NORMAL_COLOR = 'hsl(var(--primary))'

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成带箭头的路径
 * @param x1 起点X坐标
 * @param y1 起点Y坐标
 * @param x2 终点X坐标
 * @param y2 终点Y坐标
 * @param curveOffset 曲线偏移量，用于创建贝塞尔曲线
 */
function generatePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curveOffset: number = 0
): string {
  // 使用贝塞尔曲线使连接线更美观
  const controlY1 = y1 + curveOffset
  const controlY2 = y2 - curveOffset

  return `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`
}

/**
 * 计算两点之间的角度
 */
function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1)
}

/**
 * 生成任意方向的箭头路径
 */
function generateDirectedArrow(
  x: number,
  y: number,
  size: number,
  angle: number
): string {
  const halfSize = size / 2

  // 箭头的三个顶点（相对于尖端）
  const tipX = 0
  const tipY = 0
  const leftX = -halfSize
  const leftY = -size
  const rightX = halfSize
  const rightY = -size

  // 旋转矩阵
  const cos = Math.cos(angle - Math.PI / 2) // 调整角度使箭头指向正确方向
  const sin = Math.sin(angle - Math.PI / 2)

  // 旋转并平移
  const rotateX = (px: number, py: number) => x + px * cos - py * sin
  const rotateY = (px: number, py: number) => y + px * sin + py * cos

  return `M ${rotateX(tipX, tipY)} ${rotateY(tipX, tipY)} ` +
         `L ${rotateX(leftX, leftY)} ${rotateY(leftX, leftY)} ` +
         `L ${rotateX(rightX, rightY)} ${rotateY(rightX, rightY)} Z`
}

// ============================================================================
// 子组件
// ============================================================================

/** 单条连接线组件 */
interface ConnectionLineProps {
  from: ConnectionNode
  to: ConnectionNode
  conditional: boolean
  index: number
}

function ConnectionLine({ from, to, conditional, index }: ConnectionLineProps) {
  // 计算连接线路径
  const { path, arrowPath } = useMemo(() => {
    // 计算起点和终点（从节点底部到下一个节点顶部）
    const startX = from.x
    const startY = from.y
    const endX = to.x
    const endY = to.y

    // 计算曲线偏移量
    const distance = Math.abs(endY - startY)
    const curveOffset = Math.min(distance * 0.3, 50)

    // 生成路径
    const path = generatePath(startX, startY, endX, endY, curveOffset)

    // 计算箭头方向（从最后一个控制点到终点）
    const angle = calculateAngle(startX, startY + curveOffset, endX, endY)
    const arrowPath = generateDirectedArrow(endX, endY, ARROW_SIZE, angle)

    return { path, arrowPath }
  }, [from, to])

  // 线条和箭头颜色
  const color = conditional ? CONDITIONAL_COLOR : NORMAL_COLOR
  // 条件连接使用虚线
  const strokeDasharray = conditional ? '8 4' : 'none'

  return (
    <g className="connection-line" data-index={index}>
      {/* 连接线 */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
        className="transition-all duration-200"
      />
      {/* 箭头 */}
      <path
        d={arrowPath}
        fill={color}
        className="transition-all duration-200"
      />
      {/* 条件标记（仅条件连接显示） */}
      {conditional && (
        <g className="conditional-marker">
          {/* 条件圆圈背景 */}
          <circle
            cx={(from.x + to.x) / 2}
            cy={(from.y + to.y) / 2}
            r={12}
            fill="hsl(var(--background))"
            stroke={CONDITIONAL_COLOR}
            strokeWidth={1.5}
          />
          {/* 条件符号 - 使用 IF 表示条件判断 */}
          <text
            x={(from.x + to.x) / 2}
            y={(from.y + to.y) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={CONDITIONAL_COLOR}
            fontSize="10"
            fontWeight="bold"
          >
            IF
          </text>
        </g>
      )}
    </g>
  )
}

// ============================================================================
// 主组件
// ============================================================================

/**
 * 命令方块连接线组件
 *
 * 功能：
 * - 根据节点位置和连接关系绘制 SVG 连接线
 * - 支持普通连接（实线）和条件连接（虚线 + 条件标记）
 * - 自动计算箭头方向
 */
export function ConnectionLines({
  nodes,
  connections,
  className,
  width = '100%',
  height = '100%',
}: ConnectionLinesProps) {
  // 创建节点 ID 到节点的映射，便于快速查找
  const nodeMap = useMemo(() => {
    const map = new Map<string, ConnectionNode>()
    nodes.forEach(node => map.set(node.id, node))
    return map
  }, [nodes])

  // 过滤并排序有效的连接
  const validConnections = useMemo(() => {
    return connections
      .map((conn, index) => {
        const fromNode = nodeMap.get(conn.from)
        const toNode = nodeMap.get(conn.to)

        if (!fromNode || !toNode) {
          console.warn(`连接线: 找不到节点 - from: ${conn.from}, to: ${conn.to}`)
          return null
        }

        return {
          ...conn,
          fromNode,
          toNode,
          index,
        }
      })
      .filter((conn): conn is NonNullable<typeof conn> => conn !== null)
  }, [connections, nodeMap])

  // 计算 SVG 视图框
  const viewBox = useMemo(() => {
    if (nodes.length === 0) {
      return '0 0 0 0'
    }

    const padding = 20
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)

    const minX = Math.min(...xs) - padding
    const minY = Math.min(...ys) - padding
    const maxX = Math.max(...xs) + padding
    const maxY = Math.max(...ys) + padding

    const width = maxX - minX
    const height = maxY - minY

    return `${minX} ${minY} ${width} ${height}`
  }, [nodes])

  // 如果没有有效连接，不渲染任何内容
  if (validConnections.length === 0) {
    return null
  }

  return (
    <svg
      className={cn(
        'absolute inset-0 pointer-events-none',
        'overflow-visible',
        className
      )}
      width={width}
      height={height}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      aria-label="命令方块连接线"
      role="img"
    >
      <defs>
        {/* 箭头标记定义（备用，用于 marker-end） */}
        <marker
          id="arrowhead"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          refX={ARROW_SIZE}
          refY={ARROW_SIZE / 2}
          orient="auto"
        >
          <polygon
            points={`0 0, ${ARROW_SIZE} ${ARROW_SIZE / 2}, 0 ${ARROW_SIZE}`}
            fill={NORMAL_COLOR}
          />
        </marker>
        {/* 条件连接箭头标记 */}
        <marker
          id="arrowhead-conditional"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          refX={ARROW_SIZE}
          refY={ARROW_SIZE / 2}
          orient="auto"
        >
          <polygon
            points={`0 0, ${ARROW_SIZE} ${ARROW_SIZE / 2}, 0 ${ARROW_SIZE}`}
            fill={CONDITIONAL_COLOR}
          />
        </marker>
      </defs>

      {/* 渲染所有连接线 */}
      <g className="connections">
        {validConnections.map((conn) => (
          <ConnectionLine
            key={`${conn.from}-${conn.to}-${conn.index}`}
            from={conn.fromNode}
            to={conn.toNode}
            conditional={conn.conditional}
            index={conn.index}
          />
        ))}
      </g>
    </svg>
  )
}

export default ConnectionLines
