/**
 * 项目设置组件
 *
 * 功能:
 * - 项目信息编辑
 * - 项目保存/加载
 * - 项目导入/导出
 * - 存储设置
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Save,
  FolderOpen,
  Download,
  Upload,
  Trash2,
  Copy,
  Settings,
  Clock,
  Database,
  AlertCircle,
  Check,
  FileJson,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useProjectStore,
  useCurrentProject,
  useIsDirty,
  useProjectList,
  useProjectSettings,
} from '@/store/projectStore'
import { storage } from '@/utils/storage'
import type { ProjectMeta } from '@/store/projectStore'

// ============================================================================
// 子组件
// ============================================================================

/** 项目信息编辑卡片 */
function ProjectInfoCard() {
  const currentProject = useCurrentProject()
  const isDirty = useIsDirty()
  const { updateProjectInfo, saveProject } = useProjectStore()

  const [name, setName] = useState(currentProject?.name || '')
  const [description, setDescription] = useState(currentProject?.description || '')

  // 同步项目数据到本地状态
  useEffect(() => {
    if (currentProject) {
      setName(currentProject.name)
      setDescription(currentProject.description || '')
    }
  }, [currentProject])

  const handleSaveInfo = useCallback(() => {
    updateProjectInfo({ name, description: description || undefined })
    saveProject()
  }, [name, description, updateProjectInfo, saveProject])

  if (!currentProject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
          <CardDescription>当前没有打开的项目</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>项目信息</CardTitle>
            <CardDescription>编辑当前项目的基本信息</CardDescription>
          </div>
          {isDirty && <Badge variant="secondary">未保存</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-name">项目名称</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入项目名称"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-description">项目描述</Label>
          <Input
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入项目描述（可选）"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          <div>创建时间: {new Date(currentProject.createdAt).toLocaleString()}</div>
          <div>更新时间: {new Date(currentProject.updatedAt).toLocaleString()}</div>
          <div>命令方块数: {currentProject.commandBlocks.length}</div>
          <div>数据包数: {currentProject.datapacks.length}</div>
        </div>

        <Button onClick={handleSaveInfo} disabled={!isDirty}>
          <Save className="h-4 w-4 mr-2" />
          保存项目
        </Button>
      </CardContent>
    </Card>
  )
}

/** 项目列表卡片 */
function ProjectListCard({
  onSelectProject,
}: {
  onSelectProject: (id: string) => void
}) {
  const projectList = useProjectList()
  const { loadProject, deleteProject, duplicateProject, currentProject } = useProjectStore()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectMeta | null>(null)

  const handleDelete = useCallback(() => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id)
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }, [projectToDelete, deleteProject])

  const confirmDelete = useCallback((project: ProjectMeta) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }, [])

  const handleDuplicate = useCallback(
    (id: string) => {
      const newProject = duplicateProject(id)
      if (newProject) {
        loadProject(newProject.id)
      }
    },
    [duplicateProject, loadProject]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>项目列表</CardTitle>
        <CardDescription>管理和切换已保存的项目</CardDescription>
      </CardHeader>
      <CardContent>
        {projectList.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无保存的项目
          </div>
        ) : (
          <div className="space-y-2">
            {projectList.map((project) => (
              <div
                key={project.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  currentProject?.id === project.id
                    ? 'bg-accent border-primary'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => loadProject(project.id)}
                >
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    更新于 {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(project.id)}
                    title="复制项目"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(project)}
                    title="删除项目"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除项目 "{projectToDelete?.name}" 吗？此操作无法撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

/** 存储设置卡片 */
function StorageSettingsCard() {
  const settings = useProjectSettings()
  const { setAutoSave, setAutoSaveInterval, setStoragePrefix } = useProjectStore()
  const [prefix, setPrefix] = useState(settings.storagePrefix)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const handleSavePrefix = useCallback(() => {
    setStoragePrefix(prefix)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }, [prefix, setStoragePrefix])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          存储设置
        </CardTitle>
        <CardDescription>配置项目的存储方式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>自动保存</Label>
            <p className="text-sm text-muted-foreground">
              自动保存项目更改
            </p>
          </div>
          <Switch checked={settings.autoSave} onCheckedChange={setAutoSave} />
        </div>

        {settings.autoSave && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              自动保存间隔（秒）
            </Label>
            <Input
              type="number"
              value={settings.autoSaveInterval / 1000}
              onChange={(e) => setAutoSaveInterval(Number(e.target.value) * 1000)}
              min={10}
              max={300}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>存储键前缀</Label>
          <div className="flex gap-2">
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="mc-editor"
            />
            <Button onClick={handleSavePrefix}>
              {saveStatus === 'saved' ? (
                <Check className="h-4 w-4" />
              ) : (
                '保存'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            用于区分不同应用的数据存储
          </p>
        </div>

        <div className="text-sm text-muted-foreground">
          <div>已用存储空间: {(storage.getUsedSize() / 1024).toFixed(2)} KB</div>
          <div>可用存储空间: {(storage.getAvailableSize() / 1024 / 1024).toFixed(2)} MB</div>
        </div>
      </CardContent>
    </Card>
  )
}

/** 导入导出卡片 */
function ImportExportCard() {
  const { exportProject, importProject, createProject, loadProject } = useProjectStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleExport = useCallback(() => {
    const json = exportProject()
    if (json) {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `project_${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }, [exportProject])

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const result = importProject(text)

        if (result.success) {
          setImportStatus({ type: 'success', message: '项目导入成功' })
          if (result.project) {
            loadProject(result.project.id)
          }
        } else {
          setImportStatus({ type: 'error', message: result.error || '导入失败' })
        }
      } catch (e) {
        setImportStatus({ type: 'error', message: `导入失败: ${String(e)}` })
      }

      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // 3秒后清除状态
      setTimeout(() => setImportStatus({ type: null, message: '' }), 3000)
    },
    [importProject, loadProject]
  )

  const handleCreateNew = useCallback(() => {
    const project = createProject('新建项目')
    loadProject(project.id)
  }, [createProject, loadProject])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          导入/导出
        </CardTitle>
        <CardDescription>导入或导出项目配置文件</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleCreateNew} variant="outline">
            <FolderOpen className="h-4 w-4 mr-2" />
            新建项目
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出项目
          </Button>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            导入项目
          </Button>
        </div>

        {importStatus.type && (
          <div
            className={`flex items-center gap-2 text-sm ${
              importStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {importStatus.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {importStatus.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export function ProjectSettings() {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h2 className="text-2xl font-bold">项目设置</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <ProjectInfoCard />
          <StorageSettingsCard />
        </div>

        <div className="space-y-6">
          <ImportExportCard />
          <ProjectListCard onSelectProject={() => {}} />
        </div>
      </div>
    </div>
  )
}

export default ProjectSettings
