import { Command, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store'
import { ThemeToggle } from '@/components/common/ThemeToggle'

export function Header() {
  const { toggleSidebar } = useUIStore()

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mc-command">
            <Command className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MC Command Editor</h1>
            <p className="text-xs text-muted-foreground">Minecraft 命令可视化编辑器</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle showSystemOption />
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
