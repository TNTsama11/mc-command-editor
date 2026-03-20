import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  createEmptyWorkflowDocument,
  type WorkflowDocument,
  type WorkflowPortDocument,
} from '@/core/workflow/types'
import { deserializeProjectDocument, serializeProjectDocument } from '@/core/workflow/projectSerializer'
import type { CommandBlock, Datapack, Project } from '@/types'
import { type StorageConfig, storage } from '@/utils/storage'

const PROJECT_STORE_NAME = 'mc-editor-project-store'
const DEFAULT_STORAGE_PREFIX = 'mc-editor'
const DEFAULT_TARGET_VERSION = '1.21'
const DEFAULT_AUTO_SAVE_INTERVAL = 30000
const MAIN_WORKFLOW_ID = 'main'

export interface ProjectMeta {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
}

export interface ProjectListItem extends ProjectMeta {
  commandBlockCount: number
  datapackCount: number
}

interface ProjectImportResult {
  success: boolean
  project?: Project
  error?: string
}

interface CreateFunctionWorkflowOptions {
  name: string
  description?: string
  inputs?: WorkflowPortDocument[]
  outputs?: WorkflowPortDocument[]
}

interface ProjectState {
  currentProject: Project | null
  isDirty: boolean
  projectList: ProjectMeta[]
  autoSave: boolean
  autoSaveInterval: number
  storagePrefix: string

  createProject: (name: string, description?: string) => Project
  loadProject: (id: string) => boolean
  saveProject: () => boolean
  closeProject: () => void
  deleteProject: (id: string) => boolean
  duplicateProject: (id: string) => Project | null

  updateProjectInfo: (
    updates: Partial<Pick<Project, 'name' | 'description' | 'targetVersion'>>
  ) => void
  setWorkflowDocument: (workflowId: string, workflow: WorkflowDocument) => void
  createFunctionWorkflow: (options: CreateFunctionWorkflowOptions) => WorkflowDocument
  addCommandBlock: (block: CommandBlock) => void
  updateCommandBlock: (id: string, updates: Partial<CommandBlock>) => void
  removeCommandBlock: (id: string) => void
  reorderCommandBlocks: (startIndex: number, endIndex: number) => void
  setCommandBlocks: (blocks: CommandBlock[]) => void
  addDatapack: (datapack: Datapack) => void
  updateDatapack: (id: string, updates: Partial<Datapack>) => void
  removeDatapack: (id: string) => void

  setAutoSave: (enabled: boolean) => void
  setAutoSaveInterval: (interval: number) => void
  setStoragePrefix: (prefix: string) => void

  getProjectList: () => ProjectListItem[]
  getProjectById: (id: string) => Project | null
  getFunctionWorkflows: () => WorkflowDocument[]
  exportProject: () => string | null
  importProject: (json: string) => ProjectImportResult

  markDirty: () => void
  markClean: () => void
  refreshProjectList: () => void
}

function generateProjectId() {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function generateWorkflowId() {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function getStorageConfig(prefix: string): StorageConfig {
  return {
    prefix,
    version: '1.0.0',
  }
}

function getProjectStorageKey(id: string) {
  return `project:${id}`
}

function buildProjectMeta(project: Project): ProjectMeta {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

function createEmptyProject(name: string, description?: string): Project {
  const now = Date.now()

  return {
    id: generateProjectId(),
    name,
    description,
    targetVersion: DEFAULT_TARGET_VERSION,
    createdAt: now,
    updatedAt: now,
    mainWorkflowId: MAIN_WORKFLOW_ID,
    workflows: {
      [MAIN_WORKFLOW_ID]: createEmptyWorkflowDocument(MAIN_WORKFLOW_ID),
    },
    commandBlocks: [],
    datapacks: [],
  }
}

function ensureProjectWorkflowModel(project: Project): Project {
  const mainWorkflowId = project.mainWorkflowId || MAIN_WORKFLOW_ID
  const hasWorkflows = Boolean(project.workflows && Object.keys(project.workflows).length > 0)

  return {
    ...project,
    targetVersion: project.targetVersion || DEFAULT_TARGET_VERSION,
    mainWorkflowId,
    workflows: hasWorkflows
      ? project.workflows
      : {
          [mainWorkflowId]: createEmptyWorkflowDocument(mainWorkflowId),
        },
  }
}

function readProjectFromStorage(id: string, prefix: string) {
  const result = storage.load<Project>(getProjectStorageKey(id), getStorageConfig(prefix))
  if (!result.success || !result.data) {
    return null
  }

  return ensureProjectWorkflowModel(result.data)
}

function writeProjectToStorage(project: Project, prefix: string) {
  return storage.save(getProjectStorageKey(project.id), project, getStorageConfig(prefix))
}

function toProjectListItem(meta: ProjectMeta, project: Project | null): ProjectListItem {
  return {
    ...meta,
    commandBlockCount: project?.commandBlocks.length ?? 0,
    datapackCount: project?.datapacks.length ?? 0,
  }
}

function parseImportedProject(json: string): Project {
  try {
    return ensureProjectWorkflowModel(deserializeProjectDocument(json))
  } catch {
    const legacy = JSON.parse(json) as { data?: Project; project?: Project }
    const rawProject = legacy.project || legacy.data
    if (!rawProject) {
      throw new Error('导入文件格式无效')
    }

    return ensureProjectWorkflowModel(rawProject)
  }
}

function requireCurrentProject(project: Project | null): Project {
  if (!project) {
    throw new Error('当前没有已打开的项目')
  }

  return project
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      isDirty: false,
      projectList: [],
      autoSave: true,
      autoSaveInterval: DEFAULT_AUTO_SAVE_INTERVAL,
      storagePrefix: DEFAULT_STORAGE_PREFIX,

      createProject: (name, description) => {
        const project = createEmptyProject(name, description)
        writeProjectToStorage(project, get().storagePrefix)

        set((state) => ({
          currentProject: project,
          isDirty: false,
          projectList: [buildProjectMeta(project), ...state.projectList],
        }))

        return project
      },

      loadProject: (id) => {
        const project = readProjectFromStorage(id, get().storagePrefix)
        if (!project) return false

        set({
          currentProject: project,
          isDirty: false,
        })

        return true
      },

      saveProject: () => {
        const { currentProject, storagePrefix } = get()
        if (!currentProject) return false

        const updatedProject: Project = {
          ...currentProject,
          updatedAt: Date.now(),
        }

        const result = writeProjectToStorage(updatedProject, storagePrefix)
        if (!result.success) {
          return false
        }

        set((state) => ({
          currentProject: updatedProject,
          isDirty: false,
          projectList: state.projectList.map((meta) =>
            meta.id === updatedProject.id ? buildProjectMeta(updatedProject) : meta
          ),
        }))

        return true
      },

      closeProject: () => {
        get().saveProject()
        set({
          currentProject: null,
          isDirty: false,
        })
      },

      deleteProject: (id) => {
        const { currentProject, storagePrefix } = get()
        storage.remove(getProjectStorageKey(id), getStorageConfig(storagePrefix))

        set((state) => ({
          currentProject: currentProject?.id === id ? null : state.currentProject,
          isDirty: currentProject?.id === id ? false : state.isDirty,
          projectList: state.projectList.filter((meta) => meta.id !== id),
        }))

        return true
      },

      duplicateProject: (id) => {
        const original = readProjectFromStorage(id, get().storagePrefix)
        if (!original) return null

        const now = Date.now()
        const duplicate: Project = {
          ...original,
          id: generateProjectId(),
          name: `${original.name}（副本）`,
          createdAt: now,
          updatedAt: now,
        }

        writeProjectToStorage(duplicate, get().storagePrefix)

        set((state) => ({
          projectList: [buildProjectMeta(duplicate), ...state.projectList],
        }))

        return duplicate
      },

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

      setWorkflowDocument: (workflowId, workflow) => {
        set((state) => {
          if (!state.currentProject) return state

          return {
            currentProject: {
              ...state.currentProject,
              workflows: {
                ...state.currentProject.workflows,
                [workflowId]: workflow,
              },
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      createFunctionWorkflow: (options) => {
        const currentProject = requireCurrentProject(get().currentProject)
        const workflowId = generateWorkflowId()
        const workflow = createEmptyWorkflowDocument(workflowId, options.name, 'function')

        workflow.interface = {
          inputs: options.inputs ?? [],
          outputs: options.outputs ?? [],
        }
        workflow.metadata.description = options.description

        set({
          currentProject: {
            ...currentProject,
            workflows: {
              ...currentProject.workflows,
              [workflowId]: workflow,
            },
            updatedAt: Date.now(),
          },
          isDirty: true,
        })

        return workflow
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
              commandBlocks: state.currentProject.commandBlocks.filter((block) => block.id !== id),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      reorderCommandBlocks: (startIndex, endIndex) => {
        set((state) => {
          if (!state.currentProject) return state

          const nextBlocks = [...state.currentProject.commandBlocks]
          const [moved] = nextBlocks.splice(startIndex, 1)
          if (!moved) {
            return state
          }

          nextBlocks.splice(endIndex, 0, moved)

          return {
            currentProject: {
              ...state.currentProject,
              commandBlocks: nextBlocks,
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
              datapacks: state.currentProject.datapacks.map((datapack) =>
                datapack.id === id ? { ...datapack, ...updates } : datapack
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
              datapacks: state.currentProject.datapacks.filter((datapack) => datapack.id !== id),
              updatedAt: Date.now(),
            },
            isDirty: true,
          }
        })
      },

      setAutoSave: (enabled) => set({ autoSave: enabled }),

      setAutoSaveInterval: (interval) =>
        set({ autoSaveInterval: interval > 0 ? interval : DEFAULT_AUTO_SAVE_INTERVAL }),

      setStoragePrefix: (prefix) => {
        const nextPrefix = prefix.trim() || DEFAULT_STORAGE_PREFIX
        set({ storagePrefix: nextPrefix })
        get().refreshProjectList()
      },

      getProjectList: () => {
        const { projectList, storagePrefix } = get()

        return projectList.map((meta) => {
          const project = readProjectFromStorage(meta.id, storagePrefix)
          return toProjectListItem(meta, project)
        })
      },

      getProjectById: (id) => readProjectFromStorage(id, get().storagePrefix),

      getFunctionWorkflows: () => {
        const project = get().currentProject
        if (!project) {
          return []
        }

        return Object.values(project.workflows).filter((workflow) => workflow.metadata.kind === 'function')
      },

      exportProject: () => {
        const { currentProject } = get()
        if (!currentProject) return null

        return serializeProjectDocument(currentProject)
      },

      importProject: (json) => {
        try {
          const imported = parseImportedProject(json)
          const now = Date.now()
          const project: Project = {
            ...imported,
            id: generateProjectId(),
            name: imported.name || '导入的项目',
            createdAt: now,
            updatedAt: now,
          }

          writeProjectToStorage(project, get().storagePrefix)

          set((state) => ({
            currentProject: project,
            isDirty: false,
            projectList: [buildProjectMeta(project), ...state.projectList],
          }))

          return { success: true, project }
        } catch (error) {
          return { success: false, error: `导入失败: ${String(error)}` }
        }
      },

      markDirty: () => set({ isDirty: true }),
      markClean: () => set({ isDirty: false }),

      refreshProjectList: () => {
        const prefix = get().storagePrefix
        const metas = storage
          .getKeysByPrefix(prefix)
          .filter((key) => key.startsWith('project:'))
          .map((key) => storage.load<Project>(key, getStorageConfig(prefix)))
          .flatMap((result) =>
            result.success && result.data ? [buildProjectMeta(ensureProjectWorkflowModel(result.data))] : []
          )
          .sort((left, right) => right.updatedAt - left.updatedAt)

        set({ projectList: metas })
      },
    }),
    {
      name: PROJECT_STORE_NAME,
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

export function useCurrentProject() {
  return useProjectStore((state) => state.currentProject)
}

export function useIsDirty() {
  return useProjectStore((state) => state.isDirty)
}

export function useProjectList() {
  return useProjectStore((state) => state.projectList)
}

export function useFunctionWorkflows() {
  return useProjectStore((state) =>
    state.currentProject
      ? Object.values(state.currentProject.workflows).filter((workflow) => workflow.metadata.kind === 'function')
      : []
  )
}

export function useProjectActions() {
  return useProjectStore((state) => ({
    createProject: state.createProject,
    loadProject: state.loadProject,
    saveProject: state.saveProject,
    closeProject: state.closeProject,
    deleteProject: state.deleteProject,
    duplicateProject: state.duplicateProject,
    importProject: state.importProject,
    exportProject: state.exportProject,
  }))
}

export function useProjectSettings() {
  return useProjectStore((state) => ({
    autoSave: state.autoSave,
    autoSaveInterval: state.autoSaveInterval,
    storagePrefix: state.storagePrefix,
  }))
}

export function useProjectDataActions() {
  return useProjectStore((state) => ({
    updateProjectInfo: state.updateProjectInfo,
    setWorkflowDocument: state.setWorkflowDocument,
    createFunctionWorkflow: state.createFunctionWorkflow,
    addCommandBlock: state.addCommandBlock,
    updateCommandBlock: state.updateCommandBlock,
    removeCommandBlock: state.removeCommandBlock,
    reorderCommandBlocks: state.reorderCommandBlocks,
    setCommandBlocks: state.setCommandBlocks,
    addDatapack: state.addDatapack,
    updateDatapack: state.updateDatapack,
    removeDatapack: state.removeDatapack,
  }))
}
