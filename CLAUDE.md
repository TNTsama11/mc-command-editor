# TC_P1 - 项目配置

## 项目概要

- **技术栈**: Node.js / TypeScript
- **初始化日期**: 2026-03-16
- **Harness版本**: v3

## 开发规范

### 代码风格
- 使用 ESLint + Prettier 进行代码格式化
- 遵循 Airbnb 或项目自定义风格指南
- 文件命名：组件使用 PascalCase，工具函数使用 camelCase

### 提交规范
- 遵循 Conventional Commits 规范
- 格式：`<type>(<scope>): <description>`
- 常用类型：feat, fix, docs, style, refactor, test, chore

### 分支策略
- `main` - 主分支，受保护
- `develop` - 开发分支
- `feature/*` - 功能分支
- `fix/*` - 修复分支

## 构建命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test

# 代码检查
npm run lint
```

## Harness v3 工作流

### 常用命令
| 命令 | 用途 |
|------|------|
| `/harness-plan` | 创建/更新任务计划 |
| `/harness-work` | 执行任务实现 |
| `/harness-review` | 代码/计划审查 |
| `/harness-release` | 发布与版本管理 |

### 文件结构
```
TC_P1/
├── CLAUDE.md          # 本文件 - 项目配置
├── Plans.md           # 任务管理
├── src/               # 源代码
├── tests/             # 测试文件
├── .claude/           # Claude Code 配置
│   ├── settings.json  # 设置
│   ├── hooks.json     # 钩子配置
│   └── state/         # 状态文件
└── hooks/             # Git/Claude 钩子
```

## 注意事项

- [ ] 添加 `.env.example` 文件
- [ ] 配置 CI/CD 管道
- [ ] 设置测试覆盖率目标
