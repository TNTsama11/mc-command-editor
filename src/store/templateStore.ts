/**
 * 命令模板库状态管理 Store
 *
 * 功能:
 * - 分类存储（常用/收藏/自定义等）
 * - 模板编辑器支持
 * - 模板创建/加载/保存
 * - 导入/导出功能
 * - 搜索过滤
 * - 快速插入
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// 类型定义
// ============================================================================

/** 模板分类 */
export type TemplateCategory =
  | 'common'     // 常用
  | 'favorite'   // 收藏
  | 'custom'     // 自定义
  | 'imported'   // 导入
  | 'game'       // 游戏设置
  | 'entity'     // 实体操作
  | 'block'      // 方块操作
  | 'condition'  // 条件执行
  | 'data'       // 数据操作

/** 模板分类标签 */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  common: '常用',
  favorite: '收藏',
  custom: '自定义',
  imported: '导入',
  game: '游戏设置',
  entity: '实体操作',
  block: '方块操作',
  condition: '条件执行',
  data: '数据操作',
}

/** 命令模板 */
export interface CommandTemplate {
  id: string
  name: string
  description: string
  command: string
  /** NBT 数据（可选，JSON 字符串） */
  nbt?: string
  /** 分类标签 */
  category: TemplateCategory
  /** 自定义标签 */
  tags: string[]
  /** 是否收藏 */
  isFavorite: boolean
  /** 使用次数 */
  usageCount: number
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 来源（导入时记录） */
  source?: string
  /** 版本号 */
  version: string
}

/** 模板组（用于批量导入导出） */
export interface TemplateGroup {
  name: string
  description?: string
  version: string
  exportedAt: number
  templates: CommandTemplate[]
}

/** 模板编辑器状态 */
export interface TemplateEditorState {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  templateId: string | null
  formData: Partial<CommandTemplate>
  errors: Record<string, string>
  previewCommand: string
}

/** 搜索过滤条件 */
export interface TemplateFilters {
  categories: TemplateCategory[]
  tags: string[]
  searchQuery: string
  showFavoritesOnly: boolean
  sortBy: 'name' | 'usageCount' | 'updatedAt' | 'createdAt'
  sortOrder: 'asc' | 'desc'
}

/** 模板库统计信息 */
export interface TemplateStats {
  totalTemplates: number
  byCategory: Record<TemplateCategory, number>
  favoritesCount: number
  mostUsed: CommandTemplate | null
  recentlyAdded: CommandTemplate | null
}

/** 模板库状态 */
interface TemplateState {
  // 模板列表
  templates: CommandTemplate[]

  // 编辑器状态
  editor: TemplateEditorState

  // 过滤条件
  filters: TemplateFilters

  // 选中的模板
  selectedTemplateId: string | null
  selectedTemplateIds: string[]

  // 统计信息
  stats: TemplateStats

  // ===== 模板操作 =====

  /** 添加模板 */
  addTemplate: (template: Omit<CommandTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => string

  /** 批量添加模板 */
  addTemplates: (templates: Array<Omit<CommandTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>>) => string[]

  /** 更新模板 */
  updateTemplate: (id: string, updates: Partial<CommandTemplate>) => void

  /** 删除模板 */
  removeTemplate: (id: string) => void

  /** 批量删除模板 */
  removeTemplates: (ids: string[]) => void

  /** 复制模板 */
  duplicateTemplate: (id: string) => string | null

  /** 切换收藏状态 */
  toggleFavorite: (id: string) => void

  /** 增加使用次数 */
  incrementUsage: (id: string) => void

  // ===== 查询操作 =====

  /** 根据 ID 获取模板 */
  getTemplateById: (id: string) => CommandTemplate | undefined

  /** 获取收藏的模板 */
  getFavoriteTemplates: () => CommandTemplate[]

  /** 获取常用模板（按使用次数排序） */
  getCommonTemplates: (limit?: number) => CommandTemplate[]

  /** 获取最近使用的模板 */
  getRecentTemplates: (limit?: number) => CommandTemplate[]

  /** 获取按分类的模板 */
  getTemplatesByCategory: (category: TemplateCategory) => CommandTemplate[]

  /** 搜索模板 */
  searchTemplates: (query: string) => CommandTemplate[]

  /** 获取过滤后的模板 */
  getFilteredTemplates: () => CommandTemplate[]

  /** 获取所有标签 */
  getAllTags: () => string[]

  // ===== 导入/导出 =====

  /** 导出模板为 JSON */
  exportTemplates: (ids?: string[]) => string

  /** 导入模板 */
  importTemplates: (json: string, source?: string) => { success: boolean; imported: number; errors: string[] }

  // ===== 编辑器操作 =====

  /** 打开编辑器 */
  openEditor: (mode: 'create' | 'edit' | 'view', templateId?: string) => void

  /** 关闭编辑器 */
  closeEditor: () => void

  /** 更新编辑器表单 */
  updateEditorForm: (data: Partial<CommandTemplate>) => void

  /** 设置编辑器错误 */
  setEditorError: (field: string, error: string | null) => void

  /** 清除编辑器错误 */
  clearEditorErrors: () => void

  /** 保存编辑器内容 */
  saveEditor: () => boolean

  /** 验证模板数据 */
  validateTemplate: (template: Partial<CommandTemplate>) => Record<string, string>

  // ===== 过滤操作 =====

  /** 设置过滤条件 */
  setFilters: (filters: Partial<TemplateFilters>) => void

  /** 重置过滤条件 */
  resetFilters: () => void

  /** 设置搜索查询 */
  setSearchQuery: (query: string) => void

  // ===== 选择操作 =====

  /** 选择模板 */
  selectTemplate: (id: string | null) => void

  /** 多选模板 */
  toggleSelectTemplate: (id: string) => void

  /** 全选/取消全选 */
  selectAll: (select: boolean) => void

  /** 清除选择 */
  clearSelection: () => void

  // ===== 快速插入 =====

  /** 获取快速插入模板 */
  getQuickInsertTemplates: () => CommandTemplate[]

  // ===== 统计操作 =====

  /** 更新统计信息 */
  updateStats: () => void

  // ===== 工具操作 =====

  /** 清空所有模板 */
  clearAllTemplates: () => void

  /** 重置为默认模板 */
  resetToDefaults: () => void
}

// ============================================================================
// 默认值
// ============================================================================

/** 默认过滤条件 */
const DEFAULT_FILTERS: TemplateFilters = {
  categories: [],
  tags: [],
  searchQuery: '',
  showFavoritesOnly: false,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
}

/** 默认编辑器状态 */
const DEFAULT_EDITOR_STATE: TemplateEditorState = {
  isOpen: false,
  mode: 'create',
  templateId: null,
  formData: {},
  errors: {},
  previewCommand: '',
}

/** 默认模板 */
const DEFAULT_TEMPLATES: CommandTemplate[] = [
  {
    id: 'tpl_give_diamond',
    name: '给予钻石',
    description: '给予玩家一组钻石',
    command: '/give @p minecraft:diamond 64',
    category: 'common',
    tags: ['物品', '基础'],
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_tp_spawn',
    name: '传送到出生点',
    description: '将玩家传送到世界出生点',
    command: '/tp @p 0 64 0',
    category: 'common',
    tags: ['传送', '基础'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_fill_stone',
    name: '填充石块区域',
    description: '用石块填充指定区域',
    command: '/fill ~ ~ ~ ~10 ~10 ~10 minecraft:stone',
    category: 'block',
    tags: ['方块', '填充'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_summon_zombie',
    name: '召唤僵尸',
    description: '在当前位置召唤一个僵尸',
    command: '/summon minecraft:zombie ~ ~ ~',
    category: 'entity',
    tags: ['实体', '召唤'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_execute_as',
    name: '以所有玩家身份执行',
    description: '以所有玩家身份执行命令',
    command: '/execute as @a at @s run ',
    category: 'condition',
    tags: ['条件', '执行'],
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_gamemode_creative',
    name: '切换创造模式',
    description: '将玩家切换到创造模式',
    command: '/gamemode creative @p',
    category: 'game',
    tags: ['游戏模式', '设置'],
    isFavorite: true,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_time_set_day',
    name: '设置为白天',
    description: '将时间设置为中午',
    command: '/time set day',
    category: 'game',
    tags: ['时间', '设置'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_effect_speed',
    name: '速度效果',
    description: '给予玩家速度效果',
    command: '/effect give @p minecraft:speed 60 1',
    category: 'entity',
    tags: ['效果', '药水'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_kill_all_mobs',
    name: '清除所有怪物',
    description: '杀死所有敌对生物',
    command: '/kill @e[type=!player]',
    category: 'entity',
    tags: ['实体', '清除'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_clone_structure',
    name: '克隆结构',
    description: '克隆一个区域到另一个位置',
    command: '/clone ~ ~ ~ ~10 ~10 ~10 ~20 ~ ~',
    category: 'block',
    tags: ['方块', '克隆'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_tellraw_message',
    name: '发送富文本消息',
    description: '向玩家发送带格式的消息',
    command: '/tellraw @p {"text":"Hello!","color":"gold","bold":true}',
    category: 'common',
    tags: ['消息', '文本'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
  {
    id: 'tpl_scoreboard_create',
    name: '创建计分板',
    description: '创建一个新的计分板目标',
    command: '/scoreboard objectives add myObjective dummy "My Score"',
    category: 'data',
    tags: ['计分板', '数据'],
    isFavorite: false,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  },
]

// ============================================================================
// 辅助函数
// ============================================================================

/** 生成唯一ID */
function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** 验证 JSON 字符串 */
function isValidJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// 模板库 Store
// ============================================================================

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      // 初始状态
      templates: DEFAULT_TEMPLATES,
      editor: DEFAULT_EDITOR_STATE,
      filters: DEFAULT_FILTERS,
      selectedTemplateId: null,
      selectedTemplateIds: [],
      stats: {
        totalTemplates: 0,
        byCategory: {} as Record<TemplateCategory, number>,
        favoritesCount: 0,
        mostUsed: null,
        recentlyAdded: null,
      },

      // ===== 模板操作 =====

      addTemplate: (templateData) => {
        const now = Date.now()
        const id = generateId()
        const newTemplate: CommandTemplate = {
          ...templateData,
          id,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          templates: [newTemplate, ...state.templates],
        }))

        get().updateStats()
        return id
      },

      addTemplates: (templatesData) => {
        const now = Date.now()
        const ids: string[] = []

        const newTemplates = templatesData.map((data) => {
          const id = generateId()
          ids.push(id)
          return {
            ...data,
            id,
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
          } as CommandTemplate
        })

        set((state) => ({
          templates: [...newTemplates, ...state.templates],
        }))

        get().updateStats()
        return ids
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        }))

        get().updateStats()
      },

      removeTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
          selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
          selectedTemplateIds: state.selectedTemplateIds.filter((tid) => tid !== id),
        }))

        get().updateStats()
      },

      removeTemplates: (ids) => {
        const idSet = new Set(ids)
        set((state) => ({
          templates: state.templates.filter((t) => !idSet.has(t.id)),
          selectedTemplateId: idSet.has(state.selectedTemplateId ?? '') ? null : state.selectedTemplateId,
          selectedTemplateIds: state.selectedTemplateIds.filter((tid) => !idSet.has(tid)),
        }))

        get().updateStats()
      },

      duplicateTemplate: (id) => {
        const template = get().templates.find((t) => t.id === id)
        if (!template) return null

        const now = Date.now()
        const newId = generateId()
        const duplicated: CommandTemplate = {
          ...template,
          id: newId,
          name: `${template.name} (副本)`,
          isFavorite: false,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
          category: 'custom',
        }

        set((state) => ({
          templates: [duplicated, ...state.templates],
        }))

        get().updateStats()
        return newId
      },

      toggleFavorite: (id) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, isFavorite: !t.isFavorite, updatedAt: Date.now() } : t
          ),
        }))

        get().updateStats()
      },

      incrementUsage: (id) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, usageCount: t.usageCount + 1, updatedAt: Date.now() } : t
          ),
        }))
      },

      // ===== 查询操作 =====

      getTemplateById: (id) => {
        return get().templates.find((t) => t.id === id)
      },

      getFavoriteTemplates: () => {
        return get().templates.filter((t) => t.isFavorite)
      },

      getCommonTemplates: (limit = 10) => {
        return [...get().templates]
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit)
      },

      getRecentTemplates: (limit = 10) => {
        return [...get().templates]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, limit)
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter((t) => t.category === category)
      },

      searchTemplates: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.command.toLowerCase().includes(lowerQuery) ||
            t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        )
      },

      getFilteredTemplates: () => {
        const { templates, filters } = get()
        let result = [...templates]

        // 分类过滤
        if (filters.categories.length > 0) {
          result = result.filter((t) => filters.categories.includes(t.category))
        }

        // 仅显示收藏
        if (filters.showFavoritesOnly) {
          result = result.filter((t) => t.isFavorite)
        }

        // 标签过滤
        if (filters.tags.length > 0) {
          result = result.filter((t) => t.tags.some((tag) => filters.tags.includes(tag)))
        }

        // 搜索过滤
        if (filters.searchQuery.trim()) {
          const lowerQuery = filters.searchQuery.toLowerCase()
          result = result.filter(
            (t) =>
              t.name.toLowerCase().includes(lowerQuery) ||
              t.description.toLowerCase().includes(lowerQuery) ||
              t.command.toLowerCase().includes(lowerQuery) ||
              t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
          )
        }

        // 排序
        result.sort((a, b) => {
          let comparison = 0
          switch (filters.sortBy) {
            case 'name':
              comparison = a.name.localeCompare(b.name)
              break
            case 'usageCount':
              comparison = a.usageCount - b.usageCount
              break
            case 'createdAt':
              comparison = a.createdAt - b.createdAt
              break
            case 'updatedAt':
            default:
              comparison = a.updatedAt - b.updatedAt
              break
          }
          return filters.sortOrder === 'desc' ? -comparison : comparison
        })

        return result
      },

      getAllTags: () => {
        const tagSet = new Set<string>()
        get().templates.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)))
        return Array.from(tagSet).sort()
      },

      // ===== 导入/导出 =====

      exportTemplates: (ids) => {
        const templates = ids
          ? get().templates.filter((t) => ids.includes(t.id))
          : get().templates

        const group: TemplateGroup = {
          name: 'MC Command Templates',
          version: '1.0.0',
          exportedAt: Date.now(),
          templates,
        }

        return JSON.stringify(group, null, 2)
      },

      importTemplates: (json, source) => {
        const errors: string[] = []

        try {
          const data = JSON.parse(json)

          // 支持两种格式：TemplateGroup 或 CommandTemplate[]
          let templates: CommandTemplate[]

          if (Array.isArray(data)) {
            templates = data
          } else if (data.templates && Array.isArray(data.templates)) {
            templates = data.templates
          } else {
            return { success: false, imported: 0, errors: ['无效的模板数据格式'] }
          }

          const validTemplates: Array<Omit<CommandTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>> = []

          templates.forEach((t, index) => {
            if (!t.name || !t.command) {
              errors.push(`模板 ${index + 1}: 缺少名称或命令`)
              return
            }

            validTemplates.push({
              name: t.name,
              description: t.description || '',
              command: t.command,
              nbt: t.nbt,
              category: 'imported',
              tags: t.tags || [],
              isFavorite: false,
              source: source || 'import',
              version: t.version || '1.0.0',
            })
          })

          if (validTemplates.length > 0) {
            get().addTemplates(validTemplates)
          }

          return { success: true, imported: validTemplates.length, errors }
        } catch (e) {
          return { success: false, imported: 0, errors: ['JSON 解析失败: ' + String(e)] }
        }
      },

      // ===== 编辑器操作 =====

      openEditor: (mode, templateId) => {
        const template = templateId ? get().getTemplateById(templateId) : undefined

        set({
          editor: {
            isOpen: true,
            mode,
            templateId: templateId ?? null,
            formData: template ? { ...template } : { category: 'custom', tags: [], isFavorite: false, version: '1.0.0' },
            errors: {},
            previewCommand: template?.command || '',
          },
        })
      },

      closeEditor: () => {
        set({
          editor: DEFAULT_EDITOR_STATE,
        })
      },

      updateEditorForm: (data) => {
        set((state) => ({
          editor: {
            ...state.editor,
            formData: { ...state.editor.formData, ...data },
            previewCommand: data.command ?? state.editor.previewCommand,
          },
        }))
      },

      setEditorError: (field, error) => {
        set((state) => {
          const newErrors = { ...state.editor.errors }
          if (error) {
            newErrors[field] = error
          } else {
            delete newErrors[field]
          }
          return {
            editor: { ...state.editor, errors: newErrors },
          }
        })
      },

      clearEditorErrors: () => {
        set((state) => ({
          editor: { ...state.editor, errors: {} },
        }))
      },

      saveEditor: () => {
        const { editor } = get()
        const errors = get().validateTemplate(editor.formData)

        if (Object.keys(errors).length > 0) {
          set((state) => ({
            editor: { ...state.editor, errors },
          }))
          return false
        }

        const formData = editor.formData as CommandTemplate

        if (editor.mode === 'edit' && editor.templateId) {
          get().updateTemplate(editor.templateId, formData)
        } else if (editor.mode === 'create') {
          get().addTemplate(formData)
        }

        get().closeEditor()
        return true
      },

      validateTemplate: (template) => {
        const errors: Record<string, string> = {}

        if (!template.name?.trim()) {
          errors.name = '模板名称不能为空'
        }

        if (!template.command?.trim()) {
          errors.command = '命令不能为空'
        } else if (!template.command.startsWith('/')) {
          errors.command = '命令必须以 / 开头'
        }

        if (template.nbt && !isValidJson(template.nbt)) {
          errors.nbt = 'NBT 必须是有效的 JSON 格式'
        }

        return errors
      },

      // ===== 过滤操作 =====

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }))
      },

      resetFilters: () => {
        set({ filters: DEFAULT_FILTERS })
      },

      setSearchQuery: (query) => {
        set((state) => ({
          filters: { ...state.filters, searchQuery: query },
        }))
      },

      // ===== 选择操作 =====

      selectTemplate: (id) => {
        set({ selectedTemplateId: id })
      },

      toggleSelectTemplate: (id) => {
        set((state) => {
          const isSelected = state.selectedTemplateIds.includes(id)
          return {
            selectedTemplateIds: isSelected
              ? state.selectedTemplateIds.filter((tid) => tid !== id)
              : [...state.selectedTemplateIds, id],
          }
        })
      },

      selectAll: (select) => {
        if (select) {
          const filteredTemplates = get().getFilteredTemplates()
          set({ selectedTemplateIds: filteredTemplates.map((t) => t.id) })
        } else {
          set({ selectedTemplateIds: [] })
        }
      },

      clearSelection: () => {
        set({ selectedTemplateIds: [], selectedTemplateId: null })
      },

      // ===== 快速插入 =====

      getQuickInsertTemplates: () => {
        // 返回收藏的 + 使用次数最多的前 10 个
        const { templates } = get()
        const favorites = templates.filter((t) => t.isFavorite)
        const topUsed = [...templates]
          .filter((t) => !t.isFavorite)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 10 - favorites.length)

        return [...favorites, ...topUsed]
      },

      // ===== 统计操作 =====

      updateStats: () => {
        const { templates } = get()

        const byCategory: Record<TemplateCategory, number> = {
          common: 0,
          favorite: 0,
          custom: 0,
          imported: 0,
          game: 0,
          entity: 0,
          block: 0,
          condition: 0,
          data: 0,
        }

        templates.forEach((t) => {
          byCategory[t.category]++
        })

        const favoritesCount = templates.filter((t) => t.isFavorite).length

        const sortedByUsage = [...templates].sort((a, b) => b.usageCount - a.usageCount)
        const mostUsed = sortedByUsage[0] && sortedByUsage[0].usageCount > 0 ? sortedByUsage[0] : null

        const sortedByCreated = [...templates].sort((a, b) => b.createdAt - a.createdAt)
        const recentlyAdded = sortedByCreated[0] || null

        set({
          stats: {
            totalTemplates: templates.length,
            byCategory,
            favoritesCount,
            mostUsed,
            recentlyAdded,
          },
        })
      },

      // ===== 工具操作 =====

      clearAllTemplates: () => {
        set({
          templates: [],
          selectedTemplateId: null,
          selectedTemplateIds: [],
        })
        get().updateStats()
      },

      resetToDefaults: () => {
        set({
          templates: DEFAULT_TEMPLATES,
          selectedTemplateId: null,
          selectedTemplateIds: [],
        })
        get().updateStats()
      },
    }),
    {
      name: 'mc-editor-templates',
      partialize: (state) => ({
        templates: state.templates,
        filters: state.filters,
      }),
    }
  )
)

// ============================================================================
// 导出 Hooks
// ============================================================================

/** 获取模板操作 */
export function useTemplateActions() {
  const store = useTemplateStore

  return {
    addTemplate: store.getState().addTemplate,
    updateTemplate: store.getState().updateTemplate,
    removeTemplate: store.getState().removeTemplate,
    duplicateTemplate: store.getState().duplicateTemplate,
    toggleFavorite: store.getState().toggleFavorite,
    incrementUsage: store.getState().incrementUsage,
    exportTemplates: store.getState().exportTemplates,
    importTemplates: store.getState().importTemplates,
  }
}

/** 获取模板编辑器状态 */
export function useTemplateEditor() {
  return useTemplateStore((state) => state.editor)
}

/** 获取模板过滤器 */
export function useTemplateFilters() {
  return useTemplateStore((state) => state.filters)
}

/** 获取模板统计 */
export function useTemplateStats() {
  return useTemplateStore((state) => state.stats)
}

/** 获取选中的模板 */
export function useSelectedTemplates() {
  const ids = useTemplateStore((state) => state.selectedTemplateIds)
  const templates = useTemplateStore((state) => state.templates)
  return templates.filter((t) => ids.includes(t.id))
}
