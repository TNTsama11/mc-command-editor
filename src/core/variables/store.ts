/**
 * 变量系统 - 状态管理 Store
 * 管理项目中的所有变量定义
 */

import { create } from 'zustand'
import {
  VariableDefinition,
  ScoreboardObjective,
  StorageTarget,
} from './types'

interface VariableState {
  // 所有变量定义
  variables: VariableDefinition[]

  // 记分板目标列表（用于快速查找）
  scoreboardObjectives: Map<string, ScoreboardObjective>

  // 存储命名空间列表
  storageNamespaces: Set<string>

  // 操作方法
  addVariable: (variable: VariableDefinition) => void
  updateVariable: (id: string, updates: Partial<VariableDefinition>) => void
  removeVariable: (id: string) => void
  getVariable: (id: string) => VariableDefinition | undefined
  getVariableByName: (name: string) => VariableDefinition | undefined

  // 批量操作
  setVariables: (variables: VariableDefinition[]) => void
  clearVariables: () => void

  // 导入导出
  exportToJson: () => string
  importFromJson: (json: string) => void

  // 查询方法
  getScoreboardVariables: () => VariableDefinition[]
  getStorageVariables: () => VariableDefinition[]
  getGlobalVariables: () => VariableDefinition[]
  getLocalVariables: () => VariableDefinition[]
}

export const useVariableStore = create<VariableState>((set, get) => ({
  variables: [],
  scoreboardObjectives: new Map(),
  storageNamespaces: new Set(),

  addVariable: (variable) => set((state) => {
    const newVariables = [...state.variables, variable]

    // 更新记分板目标映射
    const newObjectives = new Map(state.scoreboardObjectives)
    if (variable.type === 'score' && variable.objective) {
      newObjectives.set(variable.objective, {
        name: variable.objective,
        criterion: variable.criterion || 'dummy',
        displayName: variable.displayName,
      })
    }

    // 更新存储命名空间
    const newNamespaces = new Set(state.storageNamespaces)
    if (variable.type === 'storage' && variable.storageNamespace) {
      newNamespaces.add(variable.storageNamespace)
    }

    return {
      variables: newVariables,
      scoreboardObjectives: newObjectives,
      storageNamespaces: newNamespaces,
    }
  }),

  updateVariable: (id, updates) => set((state) => {
    const newVariables = state.variables.map(v =>
      v.id === id ? { ...v, ...updates } : v
    )
    return { variables: newVariables }
  }),

  removeVariable: (id) => set((state) => {
    const variable = state.variables.find(v => v.id === id)
    if (!variable) return state

    const newVariables = state.variables.filter(v => v.id !== id)

    // 更新记分板目标映射
    const newObjectives = new Map(state.scoreboardObjectives)
    if (variable.type === 'score' && variable.objective) {
      // 仅当没有其他变量使用同一目标时才删除
      const stillUsed = newVariables.some(v => v.objective === variable.objective)
      if (!stillUsed) {
        newObjectives.delete(variable.objective)
      }
    }

    return {
      variables: newVariables,
      scoreboardObjectives: newObjectives,
    }
  }),

  getVariable: (id) => get().variables.find(v => v.id === id),

  getVariableByName: (name) => get().variables.find(v => v.name === name),

  setVariables: (variables) => set(() => {
    // 重建映射
    const objectives = new Map<string, ScoreboardObjective>()
    const namespaces = new Set<string>()

    for (const variable of variables) {
      if (variable.type === 'score' && variable.objective) {
        objectives.set(variable.objective, {
          name: variable.objective,
          criterion: variable.criterion || 'dummy',
          displayName: variable.displayName,
        })
      }
      if (variable.type === 'storage' && variable.storageNamespace) {
        namespaces.add(variable.storageNamespace)
      }
    }

    return {
      variables,
      scoreboardObjectives: objectives,
      storageNamespaces: namespaces,
    }
  }),

  clearVariables: () => set({
    variables: [],
    scoreboardObjectives: new Map(),
    storageNamespaces: new Set(),
  }),

  exportToJson: () => {
    const state = get()
    return JSON.stringify({
      variables: state.variables,
    }, null, 2)
  },

  importFromJson: (json) => {
    try {
      const data = JSON.parse(json)
      get().setVariables(data.variables || [])
    } catch (e) {
      console.error('Failed to import variables:', e)
    }
  },

  getScoreboardVariables: () => get().variables.filter(v => v.type === 'score'),

  getStorageVariables: () => get().variables.filter(v => v.type === 'storage'),

  getGlobalVariables: () => get().variables.filter(v => v.scope === 'global'),

  getLocalVariables: () => get().variables.filter(v => v.scope === 'local'),
}))

// 生成唯一的变量 ID
export function generateVariableId(): string {
  return `var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// 生成唯一的目标名称（从变量名）
export function generateObjectiveName(varName: string): string {
  // 清理变量名，只保留字母数字和下划线
  return varName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .substring(0, 16) // Minecraft 目标名称限制
}

// 验证变量名是否有效
export function isValidVariableName(name: string): boolean {
  if (!name || name.length === 0) return false
  if (name.length > 64) return false
  // 变量名只能包含字母、数字、下划线
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

// 验证目标名称是否有效
export function isValidObjectiveName(name: string): boolean {
  if (!name || name.length === 0) return false
  if (name.length > 16) return false
  // Minecraft 目标名称规则
  return /^[a-zA-Z0-9_]+$/i.test(name)
}
