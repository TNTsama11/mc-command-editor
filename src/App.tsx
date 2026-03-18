import { useEffect, useState, useCallback } from 'react'
import { Command as CommandIcon, Blocks, Package, Settings, Search as SearchIcon, FileUp, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUIStore, useEditorStore } from '@/store'
import { SearchPanel } from '@/components/editor/SearchPanel'
import { CommandEditor } from '@/components/editor/CommandEditor'
import { ImportDialog } from '@/components/editor/ImportDialog'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import type { SearchResult } from '@/store/searchStore'
import type { Command } from '@/types'

type ViewMode = 'home' | 'editor'

function App() {
  const { initTheme } = useUIStore()
  const { commandHistory, setCurrentCommand } = useEditorStore()
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('home')
  const [showImportDialog, setShowImportDialog] = useState(false)

  // 初始化主题（包含系统主题检测）
  useEffect(() => {
    initTheme()
  }, [initTheme])

  // 处理新建命令
  const handleNewCommand = useCallback(() => {
    setCurrentCommand(null)
    setViewMode('editor')
  }, [setCurrentCommand])

  // 处理打开项目
  const handleOpenProject = useCallback(() => {
    // TODO: 实现打开项目功能
    console.log('打开项目')
  }, [])

  // 处理从命令导入
  const handleImportCommand = useCallback(() => {
    setShowImportDialog(true)
  }, [])

  // 将字符串转换为 Command 对象
  const parseCommand = useCallback((cmdString: string): Command => {
    return {
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: cmdString.split(' ')[0]?.replace('/', '') || 'unknown',
      raw: cmdString,
      parsed: true,
    }
  }, [])

  // 处理搜索命令选择
  const handleSelectCommand = useCallback((_name: string, result: SearchResult) => {
    console.log('Selected command:', result)
    if (result.usage) {
      setCurrentCommand(parseCommand(result.usage))
    }
    setViewMode('editor')
    setShowSearchPanel(false)
  }, [setCurrentCommand, parseCommand])

  // 处理模板选择
  const handleSelectTemplate = useCallback((result: SearchResult) => {
    console.log('Selected template:', result)
    if (result.usage) {
      setCurrentCommand(parseCommand(result.usage))
    }
    setViewMode('editor')
    setShowSearchPanel(false)
  }, [setCurrentCommand, parseCommand])

  // 处理命令复制
  const handleCopyCommand = useCallback((command: string) => {
    navigator.clipboard.writeText(command)
    console.log('Copied command:', command)
  }, [])

  // 返回首页
  const handleBackToHome = useCallback(() => {
    setViewMode('home')
  }, [])

  // 处理导入完成
  const handleImportComplete = useCallback((commands: string[]) => {
    console.log('Imported commands:', commands)
    if (commands.length > 0) {
      setCurrentCommand(parseCommand(commands[0]))
      setViewMode('editor')
    }
    setShowImportDialog(false)
  }, [setCurrentCommand, parseCommand])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mc-command">
              <CommandIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MC Command Editor</h1>
              <p className="text-xs text-muted-foreground">Minecraft 命令可视化编辑器</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearchPanel(!showSearchPanel)}
              title="搜索命令"
            >
              <SearchIcon className="h-5 w-5" />
            </Button>
            <ThemeToggle showSystemOption />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 flex-1">
        {/* Search Panel */}
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

        {/* 编辑器模式 */}
        {viewMode === 'editor' && (
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBackToHome} className="mb-4">
              ← 返回首页
            </Button>
            <CommandEditor />
          </div>
        )}

        {/* 首页模式 */}
        {viewMode === 'home' && (
          <>
            {/* Feature Cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <FeatureCard
                icon={<CommandIcon className="h-8 w-8" />}
                title="命令编辑"
                description="可视化编辑 Minecraft 命令，支持自动补全和语法检查"
                badge="核心功能"
                onClick={handleNewCommand}
              />
              <FeatureCard
                icon={<Blocks className="h-8 w-8" />}
                title="命令方块链"
                description="拖拽式编辑命令方块链，支持条件判断和循环"
                onClick={handleNewCommand}
              />
              <FeatureCard
                icon={<Package className="h-8 w-8" />}
                title="数据包生成"
                description="一键导出数据包，支持函数文件和标签"
                onClick={handleNewCommand}
              />
            </div>

            {/* Quick Start */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>快速开始</CardTitle>
                <CardDescription>选择一个选项开始创建你的命令</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleNewCommand}>
                    <CommandIcon className="h-4 w-4 mr-2" />
                    新建命令
                  </Button>
                  <Button variant="outline" onClick={handleOpenProject}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    打开项目
                  </Button>
                  <Button variant="outline" onClick={handleImportCommand}>
                    <FileUp className="h-4 w-4 mr-2" />
                    从命令导入
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview Area */}
            <Card>
              <CardHeader>
                <CardTitle>命令预览</CardTitle>
                <CardDescription>实时预览生成的命令</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4 font-minecraft text-sm">
                  <span className="text-muted-foreground">// 点击"新建命令"开始编辑</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Commands */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">最近使用</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {commandHistory.length > 0 ? (
                  commandHistory.map((cmd) => (
                    <CommandHistoryItem
                      key={cmd.id}
                      command={cmd.raw}
                      time={new Date().toLocaleString()}
                      onClick={() => {
                        setCurrentCommand(cmd)
                        setViewMode('editor')
                      }}
                    />
                  ))
                ) : (
                  <>
                    <CommandHistoryItem
                      command="/summon zombie ~ ~ ~ {CustomName:Test}"
                      time="5 分钟前"
                      onClick={handleNewCommand}
                    />
                    <CommandHistoryItem
                      command="/give @p diamond 64"
                      time="10 分钟前"
                      onClick={handleNewCommand}
                    />
                    <CommandHistoryItem
                      command="/execute at @a run summon lightning_bolt"
                      time="1 小时前"
                      onClick={handleNewCommand}
                    />
                    <CommandHistoryItem
                      command="/fill ~ ~ ~ ~10 ~10 ~10 stone"
                      time="昨天"
                      onClick={handleNewCommand}
                    />
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-auto">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <span>MC Command Editor v0.1.0</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">文档</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <Button variant="ghost" size="sm" className="gap-1">
              <Settings className="h-4 w-4" />
              设置
            </Button>
          </div>
        </div>
      </footer>

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportComplete}
      />
    </div>
  )
}

function FeatureCard({ icon, title, description, badge, onClick }: {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  onClick?: () => void
}) {
  return (
    <Card
      className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="text-primary">{icon}</div>
          {badge && <Badge>{badge}</Badge>}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function CommandHistoryItem({ command, time, onClick }: { command: string; time: string; onClick?: () => void }) {
  return (
    <Card
      className="hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <code className="text-sm font-minecraft text-primary block truncate">{command}</code>
        <span className="text-xs text-muted-foreground">{time}</span>
      </CardContent>
    </Card>
  )
}

export default App
