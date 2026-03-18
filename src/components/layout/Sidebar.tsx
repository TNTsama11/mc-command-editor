import {
  Command,
  Blocks,
  Package,
  FileText,
  History,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store'

const navItems = [
  { icon: Command, label: '命令编辑', id: 'editor', active: true },
  { icon: Blocks, label: '命令方块链', id: 'blocks' },
  { icon: Package, label: '数据包', id: 'datapack' },
  { icon: FileText, label: '函数文件', id: 'functions' },
  { icon: History, label: '历史记录', id: 'history' },
]

export function Sidebar() {
  const { sidebarOpen } = useUIStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-card transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors w-full text-left',
              item.active
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-4 left-0 right-0 px-2">
        <button className="flex items-center gap-3 rounded-md px-3 py-2 text-sm w-full hover:bg-accent">
          <Settings className="h-5 w-5 shrink-0" />
          {sidebarOpen && <span>设置</span>}
        </button>
      </div>
    </aside>
  )
}
