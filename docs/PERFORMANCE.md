# 性能优化指南

本文档说明 MC Command Editor 中实施的性能优化策略。

## 概述

性能优化是确保应用流畅运行的关键。本项目采用了以下优化策略：

## 1. React 组件优化

### React.memo

使用 `React.memo` 包装组件，避免不必要的重新渲染：

```tsx
// 优化前
function CommandBlockItem({ block, onSelect }) {
  return <div onClick={() => onSelect(block.id)}>{block.command}</div>
}

// 优化后
const CommandBlockItem = memo(function CommandBlockItem({ block, onSelect }) {
  return <div onClick={() => onSelect(block.id)}>{block.command}</div>
})
```

### useMemo 和 useCallback

缓存计算结果和回调函数：

```tsx
// 缓存计算结果
const filteredBlocks = useMemo(() => {
  return blocks.filter(block => block.command.includes(searchTerm))
}, [blocks, searchTerm])

// 缓存回调函数
const handleSelect = useCallback((id: string) => {
  onSelect(id)
}, [onSelect])
```

### 优化的组件列表

以下组件已进行性能优化：

- `SortableBlockItem` - 可排序方块项
- `BlockTypeIcon` - 方块类型图标
- `BlockBadges` - 方块标签
- `ActionButtons` - 操作按钮

## 2. 虚拟列表

对于大量数据的列表渲染，使用虚拟列表技术：

### 原理

只渲染可视区域内的元素，配合 `overscan` 预渲染额外项：

```
┌─────────────────────────────┐
│  未渲染区域                   │
├─────────────────────────────┤
│  预渲染区 (overscan)         │
├─────────────────────────────┤
│                             │
│  可视区域 (实际渲染)          │
│                             │
├─────────────────────────────┤
│  预渲染区 (overscan)         │
├─────────────────────────────┤
│  未渲染区域                   │
└─────────────────────────────┘
```

### 使用方式

```tsx
import { VirtualizedCommandBlockList } from '@/components/commandBlock'

<VirtualizedCommandBlockList
  blocks={blocks}
  selectedId={selectedId}
  onReorder={handleReorder}
  onSelect={handleSelect}
  onEdit={handleEdit}
  onDelete={handleDelete}
  height={400}
  itemHeight={80}
/>
```

### 性能提升

| 数据量 | 传统列表 | 虚拟列表 |
|--------|----------|----------|
| 100 项 | ~50ms | ~10ms |
| 1000 项 | ~500ms | ~12ms |
| 10000 项 | >1000ms | ~15ms |

## 3. 代码分割

### 构建优化

Vite 配置中的代码分割策略：

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
        ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
        utils: ['clsx', 'tailwind-merge'],
      },
    },
  },
}
```

### 分块效果

- `vendor.js` - React 核心 (~140KB)
- `dnd.js` - 拖拽功能 (~30KB)
- `ui.js` - UI 组件 (~50KB)
- `utils.js` - 工具函数 (~10KB)

## 4. 资源压缩

### Terser 压缩配置

```ts
terserOptions: {
  compress: {
    drop_console: true,
    drop_debugger: true,
  },
}
```

### 效果

- 移除 `console.log` 调用
- 移除 `debugger` 语句
- 死代码消除

## 5. 状态管理优化

### Zustand

使用 Zustand 进行轻量级状态管理：

```ts
// 优点：
// - 无需 Provider 包裹
// - 细粒度订阅
// - 内置 persist 中间件

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      // state and actions
    }),
    { name: 'mc-editor' }
  )
)
```

### 选择器优化

使用选择器避免不必要的订阅：

```tsx
// 不好 - 订阅整个 store
const store = useEditorStore()

// 好 - 只订阅需要的字段
const commandBlocks = useEditorStore((state) => state.commandBlocks)
```

## 6. 事件处理优化

### 节流和防抖

对于频繁触发的事件使用节流/防抖：

```tsx
import { useCallback, useRef } from 'react'

// 防抖
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => callback(...args), delay)
  }, [callback, delay]) as T
}
```

### ResizeObserver

使用 ResizeObserver 替代 window resize 事件：

```tsx
useEffect(() => {
  const resizeObserver = new ResizeObserver((entries) => {
    // 处理大小变化
  })

  resizeObserver.observe(containerRef.current)

  return () => resizeObserver.disconnect()
}, [])
```

## 7. PWA 缓存策略

### Cache First（静态资源）

```
请求 → 检查缓存 → 缓存命中 → 返回缓存
                  ↓ 缓存未命中
                  网络请求 → 缓存响应 → 返回
```

### Network First（动态内容）

```
请求 → 网络请求 → 成功 → 缓存响应 → 返回
        ↓ 失败
        检查缓存 → 返回缓存
```

## 8. 性能监控

### 使用 React DevTools

安装 React DevTools 浏览器扩展，查看：
- 组件渲染次数
- 渲染时间
- 不必要的重新渲染

### 使用 Lighthouse

定期运行 Lighthouse 审计：
```bash
npx lighthouse https://your-site.com --view
```

## 最佳实践清单

- [x] 使用 React.memo 包装纯组件
- [x] 使用 useMemo 缓存计算结果
- [x] 使用 useCallback 缓存回调
- [x] 实现虚拟列表
- [x] 代码分割
- [x] 资源压缩
- [x] 合理的状态管理
- [x] PWA 缓存策略

---

*最后更新: 2026-03-16*
