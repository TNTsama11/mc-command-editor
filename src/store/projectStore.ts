/**
 * 项目状态管理 Store
 *
 * 功能:
 * - 项目创建/加载/保存
 * - 多项目管理
 * - 自动保存支持
 * - 项目导入/导出
 * - 自定义存储键
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Project, CommandBlock, Datapack } from '@/types'
import { storage, StorageConfig } from '@/utils/storage'

// ============================================================================
// 类型定义
// ============================================================================

/** 项目元数据 */
export interface ProjectMeta {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

/** 项目列表项 */
export interface ProjectListItem extends ProjectMeta {
  commandBlockCount: number
  datapackCount: number
}

/** 项目状态 */
interface ProjectState {
  // 当前项目
  currentProject: Project | null
  isDirty: boolean

  // 项目列表
  projectList: ProjectMeta[]

  // 设置
  autoSave: boolean
  autoSaveInterval: number
  storagePrefix: string

  // ===== 项目操作 =====

  /** 创建新项目 */
  createProject: (name: string, description?: string) => Project

  /** 加载项目 */
  loadProject: (id: string) => boolean

  /** 保存当前项目 */
  saveProject: () => boolean

  /** 关闭当前项目 */
  closeProject: () => void

  /** 删除项目 */
  deleteProject: (id: string) => boolean

  /** 复制项目 */
  duplicateProject: (id: string) => Project | null

  // ===== 项目数据操作 =====

  /** 更新项目信息 */
  updateProjectInfo: (updates: Partial<Pick<Project, 'name' | 'description'>>) => void

  /** 添加命令方块 */
  addCommandBlock: (block: CommandBlock) => void

  /** 更新命令方块 */
  updateCommandBlock: (id: string, updates: Partial<CommandBlock>) => void

  /** 删除命令方块 */
  removeCommandBlock: (id: string) => void

  /** 重新排序命令方块 */
  reorderCommandBlocks: (startIndex: number, endIndex: number) => void

  /** 批量更新命令方块 */
  setCommandBlocks: (blocks: CommandBlock[]) => void

  /** 添加数据包 */
  addDatapack: (datapack: Datapack) => void

  /** 更新数据包 */
  updateDatapack: (id: string, updates: Partial<Datapack>) => void

  /** 删除数据包 */
  removeDatapack: (id: string) => void

  // ===== 设置操作 =====

  /** 设置自动保存 */
  setAutoSave: (enabled: boolean) => void

  /** 设置自动保存间隔 */
  setAutoSaveInterval: (interval: number) => void

  /** 设置存储前缀 */
  setStoragePrefix: (prefix: string) => void

  // ===== 查询操作 =====

  /** 获取项目列表 */
  getProjectList: () => ProjectListItem[]

  /** 根据 ID 获取项目 */
  getProjectById: (id: string) => Project | null

  // ===== 导入/导出 =====

  /** 导出当前项目为 JSON */
  exportProject: () => string | null

  /** 导入项目 */
  importProject: (json: string) => { success: boolean; project?: Project; error?: string }

  // ===== 工具操作 =====

  /** 标记项目已修改 */
  markDirty: () => void

  /** 标记项目未修改 */
  markClean: () => void

  /** 刷新项目列表 */
  refreshProjectList: () => void
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 生成唯一ID */
function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/** 获取存储配置 */
function getStorageConfig(prefix: string): StorageConfig {
  return {
    prefix,
    version: '1.0.0',
  }
}

/** 创建空项目 */
function createEmptyProject(name: string, description?: string): Project {
  const now = Date.now()
  return {
    id: generateId(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    commandBlocks: [],
    datapacks: [],
  }
}

/** 项目元数据转列表项 */
function metaToListItem(meta: ProjectMeta, project: Project | null): ProjectListItem {
  return {
    ...meta,
    commandBlockCount: project?.commandBlocks.length ?? 0,
    datapackCount: project?.datapacks.length ?? 0,
  }
}

// ============================================================================
// 项目 Store
// ============================================================================

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentProject: null,
      isDirty: false,
      projectList: [],
      autoSave: true,
      autoSaveInterval: 30000, // 30秒
      storagePrefix: 'mc-editor',

      // ===== 项目操作 =====

      createProject: (name, description) => {
        const project = createEmptyProject(name, description)
        const meta: ProjectMeta = {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }

        // 保存项目数据
        const config = getStorageConfig(get().storagePrefix)
        storage.save(`project:${project.id}`, project, config)

        // 更新项目列表
        set((state) => ({
          currentProject: project,
          isDirty: false,
          projectList: [meta, ...state.projectList],
        }))

        return project
      },

      loadProject: (id) => {
        const config = getStorageConfig(get().storagePrefix)
        const result = storage.load<Project>(`project:${id}`, config)

        if (result.success && result.data) {
          set({ currentProject: result.data, isDirty: false })
          return true
        }

        return false
      },

      saveProject: () => {
        const { currentProject, storagePrefix } = get()
        if (!currentProject) return false

        const config = getStorageConfig(storagePrefix)
        const updatedProject = {
          ...currentProject,
          updatedAt: Date.now(),
        }

        const result = storage.save(`project:${currentProject.id}`, updatedProject, config)

        if (result.success) {
          // 更新项目列表中的元数据
          set((state) => ({
            currentProject: updatedProject,
            isDirty: false,
            projectList: state.projectList.map((meta) =>
              meta.id === currentProject.id
                ? {
                    ...meta,
                    name: updatedProject.name,
                    description: updatedProject.description,
                    updatedAt: updatedProject.updatedAt,
                  }
                : meta
            ),
          }))
          return true
        }

        return false
      },

      closeProject: () => {
        // 保存当前项目
        get().saveProject()
        set({ currentProject: null, isDirty: false })
      },

      deleteProject: (id) => {
        const { currentProject, storagePrefix } = get()

        // 如果删除的是当前项目，先关闭
        if (currentProject?.id === id) {
          set({ currentProject: null, isDirty: false })
        }

        // 从存储中删除
        const config = getStorageConfig(storagePrefix)
        storage.remove(`project:${id}`, config)

        // 更新项目列表
        set((state) => ({
          projectList: state.projectList.filter((meta) => meta.id !== id),
        }))

        return true
      },

      duplicateProject: (id) => {
        const { storagePrefix, projectList } = get()
        const config = getStorageConfig(storagePrefix)

        // 加载原项目
        const result = storage.load<Project>(`project:${id}`, config)
        if (!result.success || !result.data) return null

        const original = result.data
        const now = Date.now()

        // 创建副本
        const duplicate: Project = {
          ...original,
          id: generateId(),
          name: `${original.name} (副本)`,
          createdAt: now,
          updatedAt: now,
        }

        // 保存副本
        storage.save(`project:${duplicate.id}`, duplicate, config)

        // 更新项目列表
        const meta: ProjectMeta = {
          id: duplicate.id,
          name: duplicate.name,
          description: duplicate.description,
          createdAt: duplicate.createdAt,
          updatedAt: duplicate.updatedAt,
        }

        set((state) => ({
          projectList: [meta, ...state.projectList],
        }))

        return duplicate
      },

      // ===== 项目数据操作 =====

      updateProjectInfo: (updates) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              ...updates,
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      addCommandBlock: (block) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              commandBlocks: [...state.currentProject.commandBlocks, block],
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      updateCommandBlock: (id, updates) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              commandBlocks: state.currentProject.commandBlocks.map((block) =>
                block.id === id ? { ...block, ...updates } : block
              ),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      removeCommandBlock: (id) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              commandBlocks: state.currentProject.commandBlocks.filter(
                (block) => block.id !== id
              ),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      reorderCommandBlocks: (startIndex, endIndex) => {
        set((state) => {
          if (!state.currentProject) return state
          const blocks = [...state.currentProject.commandBlocks]
          const [removed] = blocks.splice(startIndex, 1)
          blocks.splice(endIndex, 0, removed)
          return {
            currentProject: {
              ...state.currentProject,
              commandBlocks: blocks,
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      setCommandBlocks: (blocks) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              commandBlocks: blocks,
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      addDatapack: (datapack) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              datapacks: [...state.currentProject.datapacks, datapack],
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      updateDatapack: (id, updates) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              datapacks: state.currentProject.datapacks.map((dp) =>
                dp.id === id ? { ...dp, ...updates } : dp
              ),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      removeDatapack: (id) => {
        set((state) => {
          if (!state.currentProject) return state
          return {
            currentProject: {
              ...state.currentProject,
              datapacks: state.currentProject.datapacks.filter((dp) => dp.id !== id),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      // ===== 设置操作 =====

      setAutoSave: (enabled) => set({ autoSave: enabled }),

      setAutoSaveInterval: (interval) => set({ autoSaveInterval: interval }),

      setStoragePrefix: (prefix) => {
        set({ storagePrefix: prefix })
        // 刷新项目列表
        get().refreshProjectList()
      },

      // ===== 查询操作 =====

      getProjectList: () => {
        const { projectList, storagePrefix } = get()
        const config = getStorageConfig(storagePrefix)

        return projectList.map((meta) => {
          const result = storage.load<Project>(`project:${meta.id}`, config)
          return metaToListItem(meta, result.success ? result.data ?? null : null)
        })
      },

      getProjectById: (id) => {
        const config = getStorageConfig(get().storagePrefix)
        const result = storage.load<Project>(`project:${id}`, config)
        return result.success ? result.data ?? null : null
      },

      // ===== 导入/导出 =====

      exportProject: () => {
        const { currentProject } = get()
        if (!currentProject) return null

        return JSON.stringify(
          {
            name: currentProject.name,
            version: '1.0.0',
            exportedAt: Date.now(),
            data: currentProject,
          },
          null,
          2
        )
      },

      importProject: (json) => {
        try {
          const parsed = JSON.parse(json)

          if (!parsed.data) {
            return { success: false, error: '无效的项目数据格式' }
          }

          const importedProject = parsed.data as Project
          const now = Date.now()

          // 生成新 ID
          const project: Project = {
            ...importedProject,
            id: generateId(),
            name: importedProject.name || '导入的项目',
            createdAt: now,
            updatedAt: now,
          }

          // 保存到存储
          const config = getStorageConfig(get().storagePrefix)
          storage.save(`project:${project.id}`, project, config)

          // 更新项目列表
          const meta: ProjectMeta = {
            id: project.id,
            name: project.name,
            description: project.description,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          }

          set((state) => ({
            currentProject: project,
            isDirty: false,
            projectList: [meta, ...state.projectList],
          }))

          return { success: true, project }
        } catch (e) {
          return { success: false, error: `导入失败: ${String(e)}` }
        }
      },

      // ===== 工具操作 =====

      markDirty: () => set({ isDirty: true }),

      markClean: () => set({ isDirty: false }),

      refreshProjectList: () => {
        const { storagePrefix } = get()
        const config = getStorageConfig(storagePrefix)
        const projectKeys = storage.getKeysByPrefix(storagePrefix).filter(
          (key) => key.startsWith('project:')
        )

        const metas: ProjectMeta[] = []
        projectKeys.forEach((key) => {
          const id = key.substring('project:'.length)
          const result = storage.load<Project>(key, config)
          if (result.success && result.data) {
            metas.push({
              id: result.data.id,
              name: result.data.name,
              description: result.data.description,
              createdAt: result.data.createdAt,
              updatedAt: result.data.updatedAt,
            })
          }
        })

        // 按更新时间排序
        metas.sort((a, b) => b.updatedAt - a.updatedAt)
        set({ projectList: metas })
      },
    }),
    {
      name: 'mc-editor-project-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projectList: state.projectList,
        autoSave: state.autoSave,
        autoSaveInterval: state.autoSaveInterval,
        storagePrefix: state.storagePrefix,
      }),
    }
  )
)

// ============================================================================
// 导出 Hooks
// ============================================================================

/** 获取当前项目 */
export function useCurrentProject() {
  return useProjectStore((state) => state.currentProject)
}

/** 获取项目是否已修改 */
export function useIsDirty() {
  return useProjectStore((state) => state.isDirty)
}

/** 获取项目列表 */
export function useProjectList() {
  return useProjectStore((state) => state.projectList)
}

/** 获取项目操作方法 */
export function useProjectActions() {
  const store = useProjectStore

  return {
    createProject: store.getState().createProject,
    loadProject: store.getState().loadProject,
    saveProject: store.getState().saveProject,
    closeProject: store.getState().closeProject,
    deleteProject: store.getState().deleteProject,
    duplicateProject: store.getState().duplicateProject,
    importProject: store.getState().importProject,
    exportProject: store.getState().exportProject,
  }
}

/** 获取项目设置 */
export function useProjectSettings() {
  return useProjectStore((state) => ({
    autoSave: state.autoSave,
    autoSaveInterval: state.autoSaveInterval,
    storagePrefix: state.storagePrefix,
  }))
}

/** 获取项目数据操作方法 */
export function useProjectDataActions() {
  const store = useProjectStore

  return {
    updateProjectInfo: store.getState().updateProjectInfo,
    addCommandBlock: store.getState().addCommandBlock,
    updateCommandBlock: store.getState().updateCommandBlock,
    removeCommandBlock: store.getState().removeCommandBlock,
    reorderCommandBlocks: store.getState().reorderCommandBlocks,
    setCommandBlocks: store.getState().setCommandBlocks,
    addDatapack: store.getState().addDatapack,
    updateDatapack: store.getState().updateDatapack,
    removeDatapack: store.getState().removeDatapack,
  }
}
