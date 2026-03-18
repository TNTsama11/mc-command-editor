import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUIStore, type ThemeMode } from '@/store/uiStore'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  /** 是否显示完整的主题选择器（包含系统主题选项） */
  showSystemOption?: boolean
  /** 紧凑模式，只显示图标按钮 */
  compact?: boolean
  /** 自定义类名 */
  className?: string
}

const themeOptions: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { mode: 'light', label: '浅色', icon: <Sun className="h-4 w-4" /> },
  { mode: 'dark', label: '深色', icon: <Moon className="h-4 w-4" /> },
  { mode: 'system', label: '跟随系统', icon: <Monitor className="h-4 w-4" /> },
]

export function ThemeToggle({
  showSystemOption = true,
  compact = false,
  className,
}: ThemeToggleProps) {
  const { themeMode, darkMode, setThemeMode, toggleDarkMode } = useUIStore()

  // 简单模式：点击直接切换 light/dark
  if (!showSystemOption || compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        className={className}
        title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
      >
        {darkMode ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    )
  }

  // 完整模式：显示弹出菜单选择主题
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          title="切换主题"
        >
          {darkMode ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-2">
        <div className="space-y-1">
          {themeOptions.map((option) => (
            <button
              key={option.mode}
              onClick={() => setThemeMode(option.mode)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                themeMode === option.mode && 'bg-accent text-accent-foreground'
              )}
            >
              {option.icon}
              <span>{option.label}</span>
              {themeMode === option.mode && (
                <span className="ml-auto text-primary">*</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// 简单版本，只有图标切换
export function ThemeToggleSimple({ className }: { className?: string }) {
  const { darkMode, toggleDarkMode } = useUIStore()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleDarkMode}
      className={className}
      title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
    >
      {darkMode ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  )
}
