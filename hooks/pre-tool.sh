#!/bin/bash
# Harness v3 Pre-Tool Hook
# 薄いシム → core/src/index.ts

set -e

# Harness core 路径（如果存在）
HARNESS_CORE="${CLAUDE_PLUGIN_ROOT:-$HOME/.claude/plugins/cache/claude-code-harness-marketplace/claude-code-harness/3.3.1}/core/src/index.ts"

# 日志
LOG_FILE=".claude/logs/pre-tool-$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# 记录调用
echo "[$(date -Iseconds)] pre-tool: $1" >> "$LOG_FILE" 2>/dev/null || true

# 如果 core 存在且有 node，执行 TypeScript
if [[ -f "$HARNESS_CORE" ]] && command -v node &>/dev/null; then
    # npx tsx "$HARNESS_CORE" pre-tool "$@" 2>/dev/null || true
    : # 暂时跳过，等待 core 实现
fi

# 默认：通过
exit 0
