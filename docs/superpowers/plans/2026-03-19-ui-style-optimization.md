# UI 样式与布局优化计划

## 概述

本计划旨在优化 MC Command Editor 的界面元素与节点元素样式和布局，修复硬编码颜色、响应式设计缺失、Minecraft 风格不一致等问题。

**模式**: 非 TDD（UI 样式变更难以自动化测试）

## 问题汇总

### 高优先级
1. 硬编码颜色值 - 影响主题切换功能
2. mc-* 组件与标准组件风格不一致
3. 响应式布局问题

### 中优先级
4. 触摸设备支持
5. 代码预览语法高亮

### 低优先级
6. 像素字体优化
7. 微调间距和尺寸

---

## Phase 1: 主题系统集成（高优先级）

### Task 1.1: 创建 Minecraft 主题 CSS 变量

**文件**: `src/index.css`

**问题**: 硬编码颜色值分散在多个组件中，无法跟随主题切换。同时需要兼容亮色主题。

**方案**:
1. 在 `:root`（亮色主题）和 `.dark`（暗色主题）中分别定义 Minecraft 主题变量
2. 确保亮色主题下文字和边框有足够对比度
3. 确保所有 mc-* 组件使用 CSS 变量

**修改内容**:
```css
/* :root - 亮色主题 */
--mc-bg-dark: #f5f5f5;
--mc-bg-darker: #e8e8e8;
--mc-border: #8a8a8a;
--mc-border-light: #a0a0a0a;
--mc-text: #1a1a1a;
--mc-text-muted: #5a5a5a;
--mc-accent: #7a7a7a;
--mc-error: #dc2626;
--mc-error-light: #ef4444;
--mc-success: #16a34a;

/* .dark - 暗色主题 */
--mc-bg-dark: #1a1a1a;
--mc-bg-darker: #0d0d0d;
--mc-border: #3a3a3a;
--mc-border-light: #4a4a4a;
--mc-text: #ffffff;
--mc-text-muted: #a0a0a0;
--mc-accent: #5c5c5c;
--mc-error: #8b2c2c;
--mc-error-light: #c44a4a;
--mc-success: #2c8b2c;

/* Minecraft 命令类型颜色 - 两种主题通用 */
--mc-give: #c1272c;
--mc-tp: #2c81c1;
--mc-summon: #c1c127;
--mc-kill: #c1272c;
--mc-execute: #7c2c7c;
--mc-effect: #2c7c2c;
--mc-particle: #c17c2c;
/* ... 其他命令类型 */
```

**验证**:
- 切换主题时所有 mc-* 组件颜色正确变化
- 亮色主题下文字可读性良好（对比度 >= 4.5:1）

### Task 1.1a: 统一 Flow 相关文件的颜色定义

**文件**:
- `src/store/flowStore.ts` (第 197-205 行 getPinColor)
- `src/components/flow/FlowEditor.tsx` (节点类型颜色映射)
- `src/components/flow/ConnectionLines.tsx` (硬编码颜色)

**问题**: 这些文件中的颜色硬编码未纳入主题系统

**方案**:
1. 使用 tailwind.config.js 中已有的 mc/pin 颜色定义，或
2. 使用 CSS 变量

**修改内容**:
```ts
// flowStore.ts getPinColor 函数
export function getPinColor(type: PinDataType): string {
  const colors: Record<PinDataType, string> = {
    execute: 'var(--mc-pin-execute, #ffffff)',
    position: 'var(--mc-pin-position, #22c55e)',
    entity: 'var(--mc-pin-entity, #ef4444)',
    // ...
  }
  return colors[type]
}
```

**验证**:
- Flow 画布中的连接线颜色正确
- 节点引脚颜色正确

---

### Task 1.2: 重构 mc-button.tsx 使用 CSS 变量

**文件**: `src/components/ui/mc-button.tsx`

**问题**: 第 38-115 行使用硬编码颜色值

**方案**:
1. 替换所有 `#xxxxxx` 为 `hsl(var(--xxx))` 或 `var(--mc-xxx)`
2. 修复第 38、49、60、71、82、93、104、115 行的 CSS 语法错误
3. 重命名 sm/md/lg 尺寸避免与 Tailwind 断点冲突

**修改内容**:
```tsx
// 替换硬编码颜色
className={`... bg-[var(--mc-bg-dark)] border-[var(--mc-border)] ...`}

// 重命名尺寸
type McButtonSize = 'small' | 'medium' | 'large' // 替代 sm/md/lg
```

**验证**:
- 所有 variant 在亮/暗主题下显示正确
- 点击效果正常

---

### Task 1.3: 重构 mc-input.tsx 使用 CSS 变量

**文件**: `src/components/ui/mc-input.tsx`

**问题**: 第 46-47、52-53、66、77、114-121、177-184 行硬编码颜色

**方案**:
1. 边框颜色使用 `var(--mc-border)`
2. 文字颜色使用 `var(--mc-text)`
3. 错误状态使用 `var(--mc-error)` 和 `var(--mc-error-light)`
4. SVG 图标使用 `currentColor` 或主题变量

**修改内容**:
```tsx
// 替换边框样式
className={`... border-[var(--mc-border)] text-[var(--mc-text)] ...`}

// 错误状态
className={`... border-[var(--mc-error)] text-[var(--mc-error-light)] ...`}

// SVG 使用 currentColor
<svg className="text-[var(--mc-text-muted)]">...</svg>
```

**验证**:
- 输入框在亮/暗主题下显示正确
- 错误状态清晰可见

---

### Task 1.4: 重构 mc-panel.tsx 使用 CSS 变量

**文件**: `src/components/ui/mc-panel.tsx`

**问题**: 第 26-58 行所有 variant 使用硬编码颜色

**方案**:
1. 创建 variant 主题映射对象
2. 使用 CSS 变量或 Tailwind 主题颜色

**修改内容**:
```tsx
const variantStyles = {
  default: 'bg-[var(--mc-bg-dark)] border-[var(--mc-border)]',
  inset: 'bg-[var(--mc-bg-darker)] border-[var(--mc-border-light)]',
  // ...
}
```

**验证**:
- 所有 variant 在两种主题下显示正确

---

## Phase 2: 响应式布局优化（高优先级）

### Task 2.1: 优化 NodeEditorPage 响应式布局

**文件**: `src/components/flow/NodeEditorPage.tsx`

**问题**: 左侧面板宽度固定，小屏幕溢出

**方案**:
1. 添加断点响应
2. 小屏幕下面板可折叠
3. 配置面板在移动端使用抽屉式

**修改内容**:
```tsx
// 左侧面板响应式
<div className="w-64 lg:w-72 flex-shrink-0 ...">

// 配置面板移动端抽屉
<div className="hidden md:flex w-72 ...">
// 移动端使用 Sheet 组件
<Sheet open={!!selectedNodeId} onOpenChange={...}>
  <NodeConfigPanel />
</Sheet>
```

**验证**:
- 375px 宽度下不溢出
- 面板折叠功能正常

---

### Task 2.2: 优化 App.tsx 编译结果面板

**文件**: `src/App.tsx`

**问题**: 第 136 行面板宽度固定 `w-96`

**方案**:
1. 添加响应式宽度
2. 小屏幕下使用底部抽屉或模态框

**修改内容**:
```tsx
// 响应式宽度
<div className="w-80 md:w-96 lg:w-[28rem] ...">

// 移动端处理
{showCompiledPreview && (
  <div className="fixed inset-x-0 bottom-0 md:relative md:inset-auto ...">
    ...
  </div>
)}
```

**验证**:
- 375px 宽度下不遮挡主要内容
- 可正常关闭

---

### Task 2.3: 优化首页响应式网格

**文件**: `src/App.tsx`

**问题**: 第 220 行 `md:grid-cols-3` 在平板可能拥挤

**方案**:
```tsx
<div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

**验证**:
- 平板尺寸（768px）显示 2 列正常

---

## Phase 3: 触摸设备支持（中优先级）

### Task 3.1: 增大节点引脚点击区域

**文件**: `src/components/flow/CommandNode.tsx`

**问题**: 第 32-34 行 Handle 尺寸 `w-3 h-3` 过小

**方案**:
1. 增大可视尺寸
2. 使用伪元素扩大点击区域

**修改内容**:
```tsx
<Handle
  className="w-4 h-4 md:w-3 md:h-3"
  // 添加触摸友好的点击区域
  style={{ touchAction: 'none' }}
/>
```

**验证**:
- 移动设备上可正常连接引脚

---

### Task 3.2: 替换 hover 交互为点击交互

**文件**: `src/components/flow/CommandNode.tsx`

**问题**: 第 61-65 行工具提示使用 hover

**方案**:
1. 添加点击触发支持
2. 长按显示工具提示

**修改内容**:
```tsx
// 使用 Tooltip 组件支持触摸
<TooltipProvider delayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="touch-manipulation">...</button>
    </TooltipTrigger>
    <TooltipContent>...</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**验证**:
- 触摸设备上长按可显示提示

---

## Phase 4: 风格统一（中优先级）

### Task 4.1: 统一标准组件与 mc-* 组件风格

**文件**:
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`

**问题**: 标准 UI 组件使用圆角现代风格，与 Minecraft 像素风格冲突

**方案**:
1. 创建项目默认使用 mc-* 风格
2. 添加 `modern` variant 供特殊场景使用
3. 或者在全局样式中覆盖默认样式

**修改内容**:
```tsx
// button.tsx 添加 Minecraft 默认风格
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "rounded-none border-2 border-[var(--mc-border)] ...",
      mc: "/* 现有的 mc 风格 */",
      modern: "rounded-lg /* 原来的现代风格 */",
    }
  }
})
```

**验证**:
- 所有按钮统一使用像素风格
- 特殊场景可使用 modern 风格

---

### Task 4.2: 添加编译结果语法高亮

**文件**: `src/App.tsx`

**问题**: 第 167 行代码预览无语法高亮

**方案**:
1. 使用轻量级语法高亮库（如 prism-react-renderer）
2. 或使用简单的正则匹配着色

**修改内容**:
```tsx
// 安装依赖
// npm install prism-react-renderer

import { Highlight, themes } from 'prism-react-renderer'

<Highlight theme={themes.vsDark} code={compilationResult} language="mcfunction">
  {({ className, style, tokens, getLineProps, getTokenProps }) => (
    <pre style={style}>
      {tokens.map((line, i) => (
        <div {...getLineProps({ line, key: i })}>
          {line.map((token, key) => (
            <span {...getTokenProps({ token, key })} />
          ))}
        </div>
      ))}
    </pre>
  )}
</Highlight>
```

**验证**:
- 命令关键字高亮显示
- 注释颜色区分

---

## Phase 5: 细节优化（低优先级）

### Task 5.1: 优化像素字体

**文件**: `src/index.css`

**问题**: 第 81-84 行使用 'Courier New' 非真正像素字体

**方案**:
1. 添加 Google Fonts 的 VT323 或 Press Start 2P
2. 或使用本地 woff2 字体文件

**修改内容**:
```css
@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

.font-minecraft {
  font-family: 'VT323', 'Courier New', monospace;
}
```

**验证**:
- 字体正确加载
- Minecraft 风格一致

---

### Task 5.2: 优化面板间距和尺寸

**文件**:
- `src/components/flow/NodeConfigPanel.tsx`
- `src/components/flow/VariablePanel.tsx`

**问题**: 间距不统一

**方案**:
1. 统一使用 `space-y-2` 替代 `space-y-3`
2. 统一 padding 为 `p-3`

**验证**:
- 视觉上间距一致

---

## 执行顺序

1. **Phase 1** (预计 2 小时) - 主题系统集成
   - Task 1.1 → 1.2 → 1.3 → 1.4

2. **Phase 2** (预计 1.5 小时) - 响应式布局
   - Task 2.1 → 2.2 → 2.3

3. **Phase 3** (预计 1 小时) - 触摸支持
   - Task 3.1 → 3.2

4. **Phase 4** (预计 1.5 小时) - 风格统一
   - Task 4.1 → 4.2

5. **Phase 5** (预计 0.5 小时) - 细节优化
   - Task 5.1 → 5.2

**总计**: 约 6.5 小时

---

## 风险和注意事项

1. **主题切换兼容性**: 修改 CSS 变量可能影响现有功能，需要全面测试
2. **响应式断点**: 测试 320px-1920px 范围内的所有断点
3. **性能**: 语法高亮库会增加包大小，考虑按需加载
4. **向后兼容**: mc-* 组件尺寸重命名需要更新所有使用处

---

## 验收标准

### 必须通过
- [ ] 所有硬编码颜色值迁移到 CSS 变量（包括 flowStore/FlowEditor/ConnectionLines）
- [ ] 主题切换时所有组件颜色正确变化
- [ ] 亮色主题下 mc-* 组件可读性良好（对比度 >= 4.5:1）
- [ ] 375px 屏幕宽度下布局不溢出
- [ ] 触摸设备上可正常操作节点和引脚
- [ ] 所有按钮使用统一的像素风格
- [ ] 编译结果有语法高亮

### 建议通过
- [ ] flowStore/FlowEditor/ConnectionLines 颜色统一使用 CSS 变量
- [ ] McSelect 下拉箭头在两种主题下均可见
- [ ] mc-button size 属性保持向后兼容（sm/md/lg 仍可用）
- [ ] 语法高亮支持懒加载
- [ ] 字体加载使用 font-display: swap
- [ ] 768px 平板断点测试通过
- [ ] 320px 最小屏幕宽度测试通过

### 测试命令
```bash
# 启动开发服务器测试主题切换
npm run dev

# 检查硬编码颜色（应该大幅减少）
grep -rn "#[0-9a-fA-F]" src/components/ui/mc-*.tsx | wc -l

# 构建验证无错误
npm run build
```

---

*计划创建时间: 2026-03-19*
*使用 skill: superpowers:writing-plans*
*审查状态: 已通过（含修订）*
