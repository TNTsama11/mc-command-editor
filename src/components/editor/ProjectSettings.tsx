import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Database,
  Download,
  FileJson,
  FolderOpen,
  Save,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useCurrentProject, useIsDirty, useProjectList, useProjectSettings, useProjectStore } from '@/store/projectStore'
import { storage } from '@/utils/storage'

const VERSION_OPTIONS = ['1.21', '1.20.6', '1.20.4', '1.20.1']

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function ProjectInfoCard() {
  const project = useCurrentProject()
  const isDirty = useIsDirty()
  const updateProjectInfo = useProjectStore((state) => state.updateProjectInfo)
  const saveProject = useProjectStore((state) => state.saveProject)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetVersion, setTargetVersion] = useState('1.21')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!project) {
      setName('')
      setDescription('')
      setTargetVersion('1.21')
      return
    }

    setName(project.name)
    setDescription(project.description || '')
    setTargetVersion(project.targetVersion || '1.21')
  }, [project])

  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSaved(false), 2000)
    return () => window.clearTimeout(timer)
  }, [saved])

  const handleSave = useCallback(() => {
    if (!project) return

    updateProjectInfo({
      name: name.trim() || '未命名项目',
      description: description.trim() || undefined,
      targetVersion,
    })
    saveProject()
    setSaved(true)
  }, [description, name, project, saveProject, targetVersion, updateProjectInfo])

  if (!project) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
          <CardDescription>当前还没有打开项目。</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>项目信息</CardTitle>
            <CardDescription>管理项目名称、描述和目标 Minecraft 版本。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && <Badge variant="secondary">未保存</Badge>}
            {saved && (
              <Badge className="gap-1">
                <Check className="h-3.5 w-3.5" />
                已保存
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="project-name">项目名称</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="输入项目名称"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-description">项目描述</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="简要说明这张工作流图要解决的问题"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-version">目标版本</Label>
          <Select value={targetVersion} onValueChange={setTargetVersion}>
            <SelectTrigger id="project-version">
              <SelectValue placeholder="选择版本" />
            </SelectTrigger>
            <SelectContent>
              {VERSION_OPTIONS.map((version) => (
                <SelectItem key={version} value={version}>
                  Minecraft {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">创建时间</p>
            <p className="mt-1 text-sm font-medium">{formatDate(project.createdAt)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">最后更新</p>
            <p className="mt-1 text-sm font-medium">{formatDate(project.updatedAt)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">命令方块数量</p>
            <p className="mt-1 text-sm font-medium">{project.commandBlocks.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">数据包数量</p>
            <p className="mt-1 text-sm font-medium">{project.datapacks.length}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            保存项目信息
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectListCard() {
  const currentProject = useCurrentProject()
  const projectList = useProjectList()
  const getProjectList = useProjectStore((state) => state.getProjectList)
  const loadProject = useProjectStore((state) => state.loadProject)
  const duplicateProject = useProjectStore((state) => state.duplicateProject)
  const deleteProject = useProjectStore((state) => state.deleteProject)
  const refreshProjectList = useProjectStore((state) => state.refreshProjectList)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    refreshProjectList()
  }, [refreshProjectList])

  const items = useMemo(() => getProjectList(), [getProjectList, projectList])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>项目列表</CardTitle>
          <CardDescription>切换、复制或删除本地项目。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              还没有可用项目，先创建一个项目再继续。
            </div>
          ) : (
            items.map((item) => {
              const isCurrent = item.id === currentProject?.id

              return (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {isCurrent && <Badge>当前项目</Badge>}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>命令方块 {item.commandBlockCount}</span>
                        <span>数据包 {item.datapackCount}</span>
                        <span>更新于 {formatDate(item.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadProject(item.id)}
                        className="gap-1"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        打开
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => duplicateProject(item.id)}
                        className="gap-1"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        复制
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(item.id)}
                        className="gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除项目</DialogTitle>
            <DialogDescription>
              删除后无法恢复，本地保存的工作流与数据包配置也会一并移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) {
                  deleteProject(deleteId)
                  setDeleteId(null)
                }
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StorageSettingsCard() {
  const { autoSave, autoSaveInterval, storagePrefix } = useProjectSettings()
  const setAutoSave = useProjectStore((state) => state.setAutoSave)
  const setAutoSaveInterval = useProjectStore((state) => state.setAutoSaveInterval)
  const setStoragePrefix = useProjectStore((state) => state.setStoragePrefix)

  const [prefixInput, setPrefixInput] = useState(storagePrefix)

  useEffect(() => {
    setPrefixInput(storagePrefix)
  }, [storagePrefix])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          存储设置
        </CardTitle>
        <CardDescription>管理自动保存、本地存储前缀和空间占用。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4" />
              自动保存
            </div>
            <p className="text-sm text-muted-foreground">开启后会按设定间隔自动保存当前项目。</p>
          </div>
          <Switch checked={autoSave} onCheckedChange={setAutoSave} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="autosave-interval">自动保存间隔（毫秒）</Label>
          <Input
            id="autosave-interval"
            type="number"
            min={5000}
            step={1000}
            value={autoSaveInterval}
            onChange={(event) => setAutoSaveInterval(Number(event.target.value) || 30000)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storage-prefix">存储前缀</Label>
          <div className="flex gap-2">
            <Input
              id="storage-prefix"
              value={prefixInput}
              onChange={(event) => setPrefixInput(event.target.value)}
              placeholder="mc-editor"
            />
            <Button
              variant="outline"
              onClick={() => setStoragePrefix(prefixInput.trim() || 'mc-editor')}
            >
              应用
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              已用空间
            </div>
            <p className="mt-2 text-lg font-semibold">{formatBytes(storage.getUsedSize())}</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              剩余空间
            </div>
            <p className="mt-2 text-lg font-semibold">{formatBytes(storage.getAvailableSize())}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ImportExportCard() {
  const currentProject = useCurrentProject()
  const createProject = useProjectStore((state) => state.createProject)
  const exportProject = useProjectStore((state) => state.exportProject)
  const importProject = useProjectStore((state) => state.importProject)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleExport = useCallback(() => {
    if (!currentProject) return

    const json = exportProject()
    if (!json) {
      setStatus({ type: 'error', message: '当前没有可导出的项目。' })
      return
    }

    storage.downloadFile(JSON.parse(json), `${currentProject.name || 'project'}.json`)
    setStatus({ type: 'success', message: '项目导出成功。' })
  }, [currentProject, exportProject])

  const handleImport = useCallback(async (file: File) => {
    try {
      const content = await storage.readFile(file)
      const result = importProject(content)

      if (result.success) {
        setStatus({ type: 'success', message: `已导入项目：${result.project?.name || '未命名项目'}` })
        return
      }

      setStatus({ type: 'error', message: result.error || '项目导入失败。' })
    } catch (error) {
      setStatus({ type: 'error', message: `读取文件失败：${String(error)}` })
    }
  }, [importProject])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          导入与导出
        </CardTitle>
        <CardDescription>创建新项目，或在本地导入导出 JSON 文件。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div
            className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {status.type === 'success' ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => createProject('未命名项目', '新的可视化指令工作流项目')}
          >
            <FolderOpen className="h-4 w-4" />
            新建项目
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={!currentProject}
          >
            <Download className="h-4 w-4" />
            导出项目
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            导入项目
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (file) {
              await handleImport(file)
              event.target.value = ''
            }
          }}
        />
      </CardContent>
    </Card>
  )
}

export function ProjectSettings() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <ProjectInfoCard />
        <ProjectListCard />
      </div>
      <div className="space-y-6">
        <StorageSettingsCard />
        <ImportExportCard />
      </div>
    </div>
  )
}

export default ProjectSettings
