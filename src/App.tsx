import { useCallback, useEffect, useState } from 'react'
import {
  Blocks,
  Command as CommandIcon,
  FileUp,
  FolderOpen,
  Package,
  Search as SearchIcon,
  Settings,
} from 'lucide-react'

import { ThemeToggle } from '@/components/common/ThemeToggle'
import { ImportDialog } from '@/components/editor/ImportDialog'
import { ProjectSettings } from '@/components/editor/ProjectSettings'
import { SearchPanel } from '@/components/editor/SearchPanel'
import { CommandEditor } from '@/components/editor/CommandEditor'
import { NodeEditorPage } from '@/components/flow/NodeEditorPage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEditorStore, useUIStore } from '@/store'
import { useCurrentProject, useProjectStore } from '@/store/projectStore'
import type { SearchResult } from '@/store/searchStore'
import type { Command } from '@/types'

type ViewMode = 'home' | 'editor'
type EditorMode = 'classic' | 'flow'

const supportedNodeTypes = [
  'Give',
  'TP',
  'Summon',
  'Execute',
  'Fill',
  'Setblock',
  'Effect',
  'Particle',
  'PlaySound',
]

function App() {
  const { initTheme } = useUIStore()
  const { commandHistory, setCurrentCommand } = useEditorStore()
  const currentProject = useCurrentProject()
  const createProject = useProjectStore((state) => state.createProject)

  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showProjectSettings, setShowProjectSettings] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('home')
  const [editorMode, setEditorMode] = useState<EditorMode>('classic')

  useEffect(() => {
    initTheme()
  }, [initTheme])

  const ensureProject = useCallback(() => {
    if (currentProject) {
      return currentProject
    }

    return createProject('未命名项目', '新的可视化指令工作流项目')
  }, [createProject, currentProject])

  const parseCommand = useCallback((raw: string): Command => {
    return {
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: raw.split(' ')[0]?.replace('/', '') || 'unknown',
      raw,
      parsed: true,
    }
  }, [])

  const openFlowWorkbench = useCallback(() => {
    ensureProject()
    setCurrentCommand(null)
    setEditorMode('flow')
    setViewMode('editor')
  }, [ensureProject, setCurrentCommand])

  const openClassicEditorWithCommand = useCallback(
    (command: Command) => {
      ensureProject()
      setCurrentCommand(command)
      setEditorMode('classic')
      setViewMode('editor')
    },
    [ensureProject, setCurrentCommand]
  )

  const handleSelectCommand = useCallback(
    (_name: string, result: SearchResult) => {
      if (result.usage) {
        setCurrentCommand(parseCommand(result.usage))
      }
      setEditorMode('classic')
      setViewMode('editor')
      setShowSearchPanel(false)
    },
    [parseCommand, setCurrentCommand]
  )

  const handleSelectTemplate = useCallback(
    (result: SearchResult) => {
      if (result.usage) {
        setCurrentCommand(parseCommand(result.usage))
      }
      setEditorMode('classic')
      setViewMode('editor')
      setShowSearchPanel(false)
    },
    [parseCommand, setCurrentCommand]
  )

  const handleCopyCommand = useCallback((command: string) => {
    navigator.clipboard.writeText(command)
  }, [])

  const handleImportComplete = useCallback(
    (commands: string[]) => {
      if (commands[0]) {
        setCurrentCommand(parseCommand(commands[0]))
        setEditorMode('classic')
        setViewMode('editor')
      }
      setShowImportDialog(false)
    },
    [parseCommand, setCurrentCommand]
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mc-command">
              <CommandIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MC Command Editor</h1>
              <p className="text-xs text-muted-foreground">MC 命令可视化编辑器</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title="搜索命令"
              onClick={() => setShowSearchPanel((value) => !value)}
            >
              <SearchIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="项目设置"
              onClick={() => setShowProjectSettings(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <ThemeToggle showSystemOption />
          </div>
        </div>
      </header>

      <main className="container flex-1 py-6">
        {showSearchPanel && (
          <Card className="mb-6">
            <CardContent className="p-0">
              <div className="h-[400px]">
                <SearchPanel
                  onSelectCommand={handleSelectCommand}
                  onSelectTemplate={handleSelectTemplate}
                  onCopyCommand={handleCopyCommand}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'editor' && (
          <div className="mb-6">
            <Button variant="ghost" className="mb-4" onClick={() => setViewMode('home')}>
              返回首页
            </Button>
            {editorMode === 'flow' ? <NodeEditorPage /> : <CommandEditor />}
          </div>
        )}

        {viewMode === 'home' && (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>MC 命令可视化编辑器</CardTitle>
                <CardDescription>
                  面向浏览器的 Minecraft 指令工作台，聚焦图式编排、参数编辑、结果预览和快速导出。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={openFlowWorkbench}>
                    <CommandIcon className="mr-2 h-4 w-4" />
                    开始创建
                  </Button>
                  <Button variant="outline" onClick={() => setShowProjectSettings(true)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    打开项目
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                    <FileUp className="mr-2 h-4 w-4" />
                    从命令导入
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="mb-8 grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={<CommandIcon className="h-8 w-8" />}
                title="命令编辑"
                description="保留原生命令名词，用更稳定的界面完成参数编辑与结果预览。"
                badge="核心"
                onClick={openFlowWorkbench}
              />
              <FeatureCard
                icon={<Blocks className="h-8 w-8" />}
                title="逻辑编排"
                description="通过节点连接组织执行流与数据流，让命令关系更直观。"
                onClick={openFlowWorkbench}
              />
              <FeatureCard
                icon={<Package className="h-8 w-8" />}
                title="导出交付"
                description="为函数封装、数据包导出和复杂逻辑沉淀保留稳定基础。"
                onClick={openFlowWorkbench}
              />
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>当前支持的节点类型</CardTitle>
                <CardDescription>高频命令优先可用，节点库和编译能力仍在持续完善。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {supportedNodeTypes.map((type) => (
                    <Badge key={type} variant="outline" className="px-3 py-1">
                      {type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>编译结果预览</CardTitle>
                <CardDescription>在进入工作台后查看当前图生成的命令或函数输出，并尽早发现缺参和连线问题。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4 text-sm">
                  <span className="text-muted-foreground">// 点击“开始创建”进入工作台</span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">最近使用</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {commandHistory.length > 0 ? (
                  commandHistory.map((command) => (
                    <CommandHistoryItem
                      key={command.id}
                      command={command.raw}
                      time={new Date().toLocaleString()}
                      onClick={() => openClassicEditorWithCommand(command)}
                    />
                  ))
                ) : (
                  <>
                    <CommandHistoryItem
                      command="/summon zombie ~ ~ ~ {CustomName:Test}"
                      time="5 分钟前"
                      onClick={() =>
                        openClassicEditorWithCommand(parseCommand('/summon zombie ~ ~ ~ {CustomName:Test}'))
                      }
                    />
                    <CommandHistoryItem
                      command="/give @p diamond 64"
                      time="10 分钟前"
                      onClick={() => openClassicEditorWithCommand(parseCommand('/give @p diamond 64'))}
                    />
                    <CommandHistoryItem
                      command="/execute at @a run summon lightning_bolt"
                      time="1 小时前"
                      onClick={() =>
                        openClassicEditorWithCommand(parseCommand('/execute at @a run summon lightning_bolt'))
                      }
                    />
                    <CommandHistoryItem
                      command="/fill ~ ~ ~ ~10 ~10 ~10 stone"
                      time="昨天"
                      onClick={() => openClassicEditorWithCommand(parseCommand('/fill ~ ~ ~ ~10 ~10 ~10 stone'))}
                    />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="mt-auto border-t py-4">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <span>MC Command Editor v0.1.0</span>
          <div className="flex items-center gap-4">
            <a href="#" className="transition-colors hover:text-foreground">
              文档
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              GitHub
            </a>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              aria-label="项目中心"
              onClick={() => setShowProjectSettings(true)}
            >
              <Settings className="h-4 w-4" />
              项目中心
            </Button>
          </div>
        </div>
      </footer>

      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportComplete}
      />

      <Dialog open={showProjectSettings} onOpenChange={setShowProjectSettings}>
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>项目设置</DialogTitle>
            <DialogDescription>
              管理当前项目、目标版本、本地存储以及导入导出。
            </DialogDescription>
          </DialogHeader>
          <ProjectSettings />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  badge,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  onClick?: () => void
}) {
  return (
    <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={onClick}>
      <CardHeader>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-primary">{icon}</div>
          {badge && <Badge>{badge}</Badge>}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function CommandHistoryItem({
  command,
  time,
  onClick,
}: {
  command: string
  time: string
  onClick?: () => void
}) {
  return (
    <Card className="cursor-pointer transition-colors hover:bg-accent/50" onClick={onClick}>
      <CardContent className="p-4">
        <code className="block truncate font-minecraft text-sm text-primary">{command}</code>
        <span className="text-xs text-muted-foreground">{time}</span>
      </CardContent>
    </Card>
  )
}

export default App
