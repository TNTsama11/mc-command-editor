# Minecraft 指令可视化工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前项目演进为一个以 Minecraft 原生命令为核心语义、具备蓝图式逻辑骨架与 ComfyUI 式参数体验的低代码可视化工作台。

**Architecture:** 在现有 React + Zustand + React Flow 架构上，先稳定“节点库 + 画布 + 参数面板 + 编译结果”核心闭环，再逐步引入统一工作流模型、子图/函数封装、资源库、检查器与版本规则。实现上优先复用现有 `flow`、`store`、`core/compiler` 结构，避免过早重写整套编辑器。

**Tech Stack:** React 18、TypeScript、Vite、Zustand、@xyflow/react、Vitest、Playwright、Tailwind CSS

---

## 约束与原则

- 本计划不包含 `git commit`、分支或发布步骤。
- 先修可读性和核心闭环，再做高级能力。
- 所有新能力优先建立在统一工作流模型上，避免 UI 状态与编译输出强耦合。
- 测试优先覆盖核心 store、编译器与关键交互，不追求一开始全量 UI 测试。

## 文件结构与职责

### 现有关键文件

- `src/App.tsx`
  - 首页、工作台入口、编译/导出面板容器。
- `src/components/flow/FlowEditor.tsx`
  - 画布交互、连线、上下文菜单、空状态。
- `src/components/flow/CommandNode.tsx`
  - 节点本体、pin 展示。
- `src/components/flow/NodePanel.tsx`
  - 节点库分类、搜索、拖拽入口。
- `src/components/flow/NodeConfigPanel.tsx`
  - 右侧参数面板。
- `src/components/flow/NodeEditorPage.tsx`
  - 工作台三栏布局与响应式容器。
- `src/components/flow/NodeFactory.ts`
  - 节点定义、创建逻辑。
- `src/store/flowStore.ts`
  - 工作流状态、连线规则、节点更新。
- `src/core/compiler/*`
  - 图编译、拓扑、执行流与错误模型。
- `docs/USER_GUIDE.md`
  - 用户文档。

### 建议新增文件

- `src/core/workflow/types.ts`
  - 统一工作流、子图、接口、资源引用模型。
- `src/core/workflow/graphValidation.ts`
  - 工作流检查器，负责结构诊断。
- `src/core/workflow/projectSerializer.ts`
  - 项目导入导出、序列化。
- `src/core/resources/types.ts`
  - 资源模型定义。
- `src/core/resources/catalog.ts`
  - 内置资源知识库入口。
- `src/core/resources/search.ts`
  - 资源搜索与过滤。
- `src/store/projectStore.ts`
  - 扩展为项目级工作流/子图管理。
- `src/store/resourceStore.ts`
  - 资源选择、最近使用、常用项。
- `src/components/flow/FlowInspector.tsx`
  - 工作流检查器 UI。
- `src/components/flow/ResourcePicker.tsx`
  - 资源面板选择器。
- `src/components/flow/FunctionNodeEditor.tsx`
  - 子图/函数节点编辑入口。
- `src/components/flow/WorkflowProblemsPanel.tsx`
  - 问题列表与画布跳转。
- `tests/workflow/graphValidation.test.ts`
  - 工作流检查器测试。
- `tests/resources/search.test.ts`
  - 资源搜索测试。
- `tests/project/projectSerializer.test.ts`
  - 项目序列化测试。

## 里程碑概览

### Milestone 1：可读性与核心闭环稳定

目标：修复中文体验、统一首页与工作台表达、稳定节点库/画布/参数面板/编译结果主链路。

### Milestone 2：统一工作流模型与结构能力

目标：引入主图/子图统一抽象，为函数节点与封装能力打底。

### Milestone 3：资源库与双通道参数输入

目标：让资源参数从手写 ID 升级为“面板选择 + 节点输入”双通道体系。

### Milestone 4：检查器、调试与反馈联动

目标：建立工作流检查器、节点状态与结果区联动。

### Milestone 5：版本规则、项目导入导出与复用

目标：支持项目级版本信息、工作流交换、函数节点交换与模板雏形。

---

### Task 1：收敛首页与工作台文案

**Files:**
- Modify: `src/App.tsx`
- Modify: `docs/USER_GUIDE.md`
- Test: `e2e/app.spec.ts`

- [ ] **Step 1: 写出首页与工作台的目标文案清单**

将以下内容整理为待替换清单：
- 首页一句话定位
- 3 个核心价值点
- 空画布提示
- 编译结果面板标题与说明

- [ ] **Step 2: 先补一个端到端可见性测试**

在 `e2e/app.spec.ts` 增加断言，确保首页能看到：
- “MC 命令可视化编辑器”
- “开始创建”
- “当前支持的节点类型”

Run: `npm run test:e2e -- e2e/app.spec.ts`
Expected: 先记录当前通过/失败状态

- [ ] **Step 3: 最小修改 `src/App.tsx` 文案**

重点更新：
- 首页标题与副标题
- FeatureCard 描述
- 空状态说明
- 编译结果区文案

- [ ] **Step 4: 同步更新 `docs/USER_GUIDE.md` 的产品定位段**

保持与首页一致，不扩写新功能。

- [ ] **Step 5: 运行验证**

Run:
- `npm run typecheck`
- `npm run test:e2e -- e2e/app.spec.ts`

Expected:
- TypeScript 通过
- 首页文案相关断言通过

---

### Task 2：重组节点库分类与高频节点可见性

**Files:**
- Modify: `src/components/flow/NodePanel.tsx`
- Modify: `src/components/flow/NodeFactory.ts`
- Test: `e2e/editor.spec.ts`

- [ ] **Step 1: 为节点库新分类写失败用例**

在 `e2e/editor.spec.ts` 增加断言，验证左侧节点库存在以下分组或关键词：
- 基础命令
- 方块与世界
- 条件与执行
- 常量与输入

Run: `npm run test:e2e -- e2e/editor.spec.ts`
Expected: 当前失败或部分失败

- [ ] **Step 2: 调整 `NodePanel.tsx` 分类结构**

把当前分类改为设计稿中的功能导向分组，不改节点底层类型名。

- [ ] **Step 3: 增加高频节点置顶区**

优先展示：
- `give`
- `summon`
- `tp`
- `setblock`
- `fill`
- `effect`
- `execute`

- [ ] **Step 4: 保持搜索逻辑兼容新分类**

确保搜索既能按节点 ID，也能按标签或说明命中。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test:e2e -- e2e/editor.spec.ts`
- `npm run typecheck`

Expected:
- 节点库分类可见
- 高频节点仍能拖拽/双击添加

---

### Task 3：强化画布中的执行流与数据流语义

**Files:**
- Modify: `src/components/flow/CommandNode.tsx`
- Modify: `src/components/flow/FlowEditor.tsx`
- Modify: `src/store/flowStore.ts`
- Test: `tests/setup/integration.test.ts`

- [ ] **Step 1: 为 pin 语义写最小验证**

增加集成测试或组件测试，验证：
- 执行 pin 与数据 pin 的形状或 class 有明确区别
- 类型不兼容连接会被拒绝

Run: `npm run test -- tests/setup/integration.test.ts`
Expected: 当前部分失败

- [ ] **Step 2: 调整 `CommandNode.tsx` pin 展示**

确保：
- 执行流 pin 和数据流 pin 有稳定视觉差异
- 悬停能显示类型

- [ ] **Step 3: 调整 `FlowEditor.tsx` 空状态提示**

增加：
- 推荐起点
- 执行流/数据流一句话说明

- [ ] **Step 4: 调整 `flowStore.ts` 的连接反馈**

在拒绝连接时保留可供 UI 展示的原因，不只 `console.warn`。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test -- tests/setup/integration.test.ts`
- `npm run typecheck`

Expected:
- 连接规则测试通过
- 画布空状态符合设计稿

---

### Task 4：重构参数面板为分区式编辑中心

**Files:**
- Modify: `src/components/flow/NodeConfigPanel.tsx`
- Modify: `src/components/ui/input.tsx`
- Test: `e2e/editor.spec.ts`

- [ ] **Step 1: 为参数面板分区写可见性断言**

在 `e2e/editor.spec.ts` 中增加断言，选中节点后能看到：
- 节点标题
- 常用参数区域
- 高级参数入口
- 节点状态或提示区域

Run: `npm run test:e2e -- e2e/editor.spec.ts`
Expected: 当前失败

- [ ] **Step 2: 重组 `NodeConfigPanel.tsx` 布局**

至少拆成：
- 节点头部
- 常用参数
- 高级参数
- 输入来源摘要
- 节点诊断

- [ ] **Step 3: 保留现有命令参数逻辑，先不引入新命令**

只调整呈现结构，不在这一步扩节点能力。

- [ ] **Step 4: 为高频节点补示例与默认值说明**

优先：
- `give`
- `summon`
- `tp`
- `setblock`

- [ ] **Step 5: 运行验证**

Run:
- `npm run test:e2e -- e2e/editor.spec.ts`
- `npm run typecheck`

Expected:
- 参数面板结构清晰可见
- 现有节点编辑不回归

---

### Task 5：建立统一工作流模型

**Files:**
- Create: `src/core/workflow/types.ts`
- Modify: `src/store/flowStore.ts`
- Modify: `src/store/projectStore.ts`
- Test: `tests/project/projectSerializer.test.ts`

- [ ] **Step 1: 写失败测试，约束工作流基础结构**

在 `tests/project/projectSerializer.test.ts` 中定义最小结构断言：
- 一个项目包含主工作流
- 工作流包含节点、边、接口、元信息
- 可容纳子图列表

Run: `npm run test -- tests/project/projectSerializer.test.ts`
Expected: FAIL，缺少模型实现

- [ ] **Step 2: 新建 `src/core/workflow/types.ts`**

定义：
- `ProjectDocument`
- `WorkflowDocument`
- `WorkflowInterface`
- `NodeValueSource`

- [ ] **Step 3: 调整 `projectStore.ts` 承载项目级状态**

至少纳入：
- 当前项目元信息
- 主工作流 ID
- 工作流映射表

- [ ] **Step 4: 保持 `flowStore.ts` 仍能服务当前编辑器**

先做桥接，不立刻重写所有 store。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test -- tests/project/projectSerializer.test.ts`
- `npm run typecheck`

Expected:
- 统一工作流模型可编译
- 后续子图和函数节点可在此模型上生长

---

### Task 6：实现子图封装的最小骨架

**Files:**
- Create: `src/components/flow/FunctionNodeEditor.tsx`
- Modify: `src/components/flow/FlowEditor.tsx`
- Modify: `src/components/flow/NodeFactory.ts`
- Modify: `src/store/projectStore.ts`
- Test: `tests/setup/integration.test.ts`

- [ ] **Step 1: 为函数节点最小模型写失败测试**

断言：
- 工作流可以引用另一个工作流作为函数节点
- 函数节点具备输入输出接口定义

Run: `npm run test -- tests/setup/integration.test.ts`
Expected: FAIL

- [ ] **Step 2: 在 `NodeFactory.ts` 增加函数节点类型骨架**

先支持：
- 标签
- 描述
- workflowId
- inputs / outputs

- [ ] **Step 3: 在 `FlowEditor.tsx` 预留“封装为函数节点”入口**

当前版本先允许通过选中节点触发占位动作，不强做完整 UI。

- [ ] **Step 4: 新建 `FunctionNodeEditor.tsx` 作为内部编辑容器**

先完成最小壳层和路由/状态入口。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test -- tests/setup/integration.test.ts`
- `npm run typecheck`

Expected:
- 函数节点模型存在
- 后续可继续补全“选中节点封装”流程

---

### Task 7：建立资源库与资源搜索最小实现

**Files:**
- Create: `src/core/resources/types.ts`
- Create: `src/core/resources/catalog.ts`
- Create: `src/core/resources/search.ts`
- Test: `tests/resources/search.test.ts`

- [ ] **Step 1: 写资源搜索失败测试**

测试至少覆盖：
- 按 ID 搜索
- 按显示名搜索
- 按类型过滤

Run: `npm run test -- tests/resources/search.test.ts`
Expected: FAIL

- [ ] **Step 2: 定义资源模型**

在 `types.ts` 中定义：
- `ResourceKind`
- `ResourceEntry`
- `ResourceVersionRule`

- [ ] **Step 3: 在 `catalog.ts` 中提供最小资源集合**

首批包含：
- 物品
- 方块
- 实体类型
- 效果

- [ ] **Step 4: 在 `search.ts` 实现最小搜索函数**

仅支持：
- 关键词匹配
- 类型筛选
- 简单排序

- [ ] **Step 5: 运行验证**

Run:
- `npm run test -- tests/resources/search.test.ts`
- `npm run typecheck`

Expected:
- 基础资源搜索通过

---

### Task 8：把资源选择接入参数面板

**Files:**
- Create: `src/components/flow/ResourcePicker.tsx`
- Modify: `src/components/flow/NodeConfigPanel.tsx`
- Modify: `src/store/resourceStore.ts`
- Test: `e2e/editor.spec.ts`

- [ ] **Step 1: 为 `give` 节点资源选择写失败测试**

在 `e2e/editor.spec.ts` 中增加流程：
- 添加 `give`
- 打开参数面板
- 选择一个物品资源
- 验证节点摘要或编译结果变化

Run: `npm run test:e2e -- e2e/editor.spec.ts`
Expected: FAIL

- [ ] **Step 2: 新建 `ResourcePicker.tsx`**

支持：
- 搜索
- 类型过滤
- 选择结果回填

- [ ] **Step 3: 新建 `resourceStore.ts`**

管理：
- 当前搜索条件
- 最近使用
- 常用项

- [ ] **Step 4: 将 `NodeConfigPanel.tsx` 的资源类参数切到选择器**

优先覆盖：
- 物品
- 方块
- 实体类型
- 效果

- [ ] **Step 5: 运行验证**

Run:
- `npm run test:e2e -- e2e/editor.spec.ts`
- `npm run typecheck`

Expected:
- 不再只能手填资源 ID

---

### Task 9：实现工作流检查器

**Files:**
- Create: `src/core/workflow/graphValidation.ts`
- Create: `src/components/flow/FlowInspector.tsx`
- Create: `src/components/flow/WorkflowProblemsPanel.tsx`
- Modify: `src/core/compiler/errors.ts`
- Test: `tests/workflow/graphValidation.test.ts`

- [ ] **Step 1: 写工作流检查器失败测试**

覆盖以下场景：
- 孤立节点
- 未接入主流程
- 缺失必填参数
- 非法连接

Run: `npm run test -- tests/workflow/graphValidation.test.ts`
Expected: FAIL

- [ ] **Step 2: 在 `graphValidation.ts` 实现结构诊断**

输出统一问题模型：
- level
- message
- nodeId / edgeId
- code

- [ ] **Step 3: 在 `FlowInspector.tsx` 中展示问题汇总**

先支持列表展示与计数。

- [ ] **Step 4: 在 `WorkflowProblemsPanel.tsx` 中支持点击跳转**

点击问题项后聚焦到对应节点。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test -- tests/workflow/graphValidation.test.ts`
- `npm run typecheck`

Expected:
- 结构问题能在编译前发现

---

### Task 10：让结果区与节点诊断联动

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/flow/FlowEditor.tsx`
- Modify: `src/components/flow/CommandNode.tsx`
- Test: `e2e/editor.spec.ts`

- [ ] **Step 1: 为问题跳转写失败测试**

流程：
- 构造一个缺参节点
- 打开结果/问题面板
- 点击问题项
- 验证节点被聚焦或高亮

Run: `npm run test:e2e -- e2e/editor.spec.ts`
Expected: FAIL

- [ ] **Step 2: 在 `CommandNode.tsx` 增加节点状态标识**

至少支持：
- 警告
- 错误
- 未接入

- [ ] **Step 3: 在 `App.tsx` 中把编译结果区升级为“结果 + 问题”容器**

保留现有输出预览，同时接入问题列表。

- [ ] **Step 4: 在 `FlowEditor.tsx` 中支持外部聚焦请求**

可通过 store 或 prop 触发节点定位。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test:e2e -- e2e/editor.spec.ts`
- `npm run typecheck`

Expected:
- 结果区不只是文本输出

---

### Task 11：引入项目级版本信息与基础兼容提示

**Files:**
- Modify: `src/store/projectStore.ts`
- Modify: `src/components/editor/ProjectSettings.tsx`
- Modify: `src/core/resources/types.ts`
- Modify: `src/core/workflow/graphValidation.ts`
- Test: `tests/project/projectSerializer.test.ts`

- [ ] **Step 1: 为项目版本字段写失败测试**

断言项目序列化后包含目标版本字段。

Run: `npm run test -- tests/project/projectSerializer.test.ts`
Expected: FAIL

- [ ] **Step 2: 在 `projectStore.ts` 中增加目标版本字段**

先支持字符串版本，不急于做复杂版本区间。

- [ ] **Step 3: 在 `ProjectSettings.tsx` 中增加版本设置入口**

先做下拉或文本选择。

- [ ] **Step 4: 在检查器中加入基础版本提示**

例如资源或节点缺少版本支持时产生 warning。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test -- tests/project/projectSerializer.test.ts`
- `npm run typecheck`

Expected:
- 版本信息成为项目模型一部分

---

### Task 12：打通项目与函数节点导入导出

**Files:**
- Create: `src/core/workflow/projectSerializer.ts`
- Modify: `src/store/projectStore.ts`
- Modify: `src/components/editor/ImportDialog.tsx`
- Test: `tests/project/projectSerializer.test.ts`

- [ ] **Step 1: 写导入导出失败测试**

覆盖：
- 完整项目序列化/反序列化
- 函数节点工作流序列化/反序列化

Run: `npm run test -- tests/project/projectSerializer.test.ts`
Expected: FAIL

- [ ] **Step 2: 实现 `projectSerializer.ts`**

最小支持：
- 项目 JSON 导出
- 项目 JSON 导入
- 子图工作流导出

- [ ] **Step 3: 调整 `ImportDialog.tsx`**

接入项目导入流程，不先做复杂模板市场。

- [ ] **Step 4: 在 `projectStore.ts` 中提供加载/导出 API**

保持 UI 调用简单。

- [ ] **Step 5: 运行验证**

Run:
- `npm run test -- tests/project/projectSerializer.test.ts`
- `npm run typecheck`

Expected:
- 项目与函数节点具备异步交换基础

---

## 验证清单

- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:e2e -- e2e/app.spec.ts`
- [ ] `npm run test:e2e -- e2e/editor.spec.ts`

## 风险与注意事项

- `src/components/flow/*` 仍在快速演进，改动前先确认用户未在同文件做并行修改。
- 子图/函数节点能力必须建立在统一工作流模型上，不要直接在现有 `flowStore` 中堆临时字段。
- 资源库先做最小集合，不要一开始试图覆盖 Minecraft 全量资源。
- 版本兼容第一轮只做建模和基础提示，不要先做过深规则引擎。
- 调试能力第一轮重点放在“发现问题并跳转修复”，不要先做运行时模拟。

## 交付标准

完成本计划后，应至少满足以下结果：

1. 首页与工作台表达清晰，无明显中文体验问题。
2. 节点库、画布、参数面板、结果区形成稳定核心闭环。
3. 工作流具备统一项目模型，可容纳主图与子图。
4. 资源参数不再只能手写 ID。
5. 工作流问题可以在编译前被检查并定位。
6. 自定义函数节点与项目导入导出具备最小骨架。
