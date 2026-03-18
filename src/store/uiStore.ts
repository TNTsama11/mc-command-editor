import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface UIState {
  // 主题
  themeMode: ThemeMode
  darkMode: boolean // 计算后的实际暗色状态
  setThemeMode: (mode: ThemeMode) => void
  toggleDarkMode: () => void // 兼容旧代码，切换 light/dark
  initTheme: () => void // 初始化主题（检测系统偏好）

  // 侧边栏
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // 面板
  activePanel: 'editor' | 'preview' | 'settings' | null
  setActivePanel: (panel: UIState['activePanel']) => void
}

// 获取系统主题偏好
const getSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// 根据主题模式计算实际的暗色状态
const computeDarkMode = (mode: ThemeMode): boolean => {
  if (mode === 'system') {
    return getSystemPrefersDark()
  }
  return mode === 'dark'
}

// 应用主题到 DOM
const applyThemeToDOM = (darkMode: boolean): void => {
  if (darkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      darkMode: false,

      setThemeMode: (mode) => {
        const darkMode = computeDarkMode(mode)
        applyThemeToDOM(darkMode)
        set({ themeMode: mode, darkMode })
      },

      toggleDarkMode: () => {
        const { themeMode } = get()
        // 如果当前是 system 模式，根据当前实际状态切换到对应的固定模式
        // 如果当前是固定模式，则切换到另一个固定模式
        const currentDark = get().darkMode
        const newMode: ThemeMode = currentDark ? 'light' : 'dark'
        const newDarkMode = !currentDark
        applyThemeToDOM(newDarkMode)
        set({ themeMode: newMode, darkMode: newDarkMode })
      },

      initTheme: () => {
        const { themeMode } = get()
        const darkMode = computeDarkMode(themeMode)
        applyThemeToDOM(darkMode)
        set({ darkMode })

        // 监听系统主题变化
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          const handleChange = (e: MediaQueryListEvent) => {
            const { themeMode } = get()
            if (themeMode === 'system') {
              const newDarkMode = e.matches
              applyThemeToDOM(newDarkMode)
              set({ darkMode: newDarkMode })
            }
          }
          mediaQuery.addEventListener('change', handleChange)
        }
      },

      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activePanel: 'editor',
      setActivePanel: (panel) => set({ activePanel: panel }),
    }),
    {
      name: 'mc-editor-ui',
    }
  )
)
