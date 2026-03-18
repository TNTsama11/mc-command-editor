/**
 * usePWA - PWA 状态管理 Hook
 *
 * 提供 PWA 相关功能：
 * - 安装提示
 * - 更新检测
 * - 离线状态
 * - 缓存管理
 */

import { useState, useEffect, useCallback } from 'react'

// ============================================================================
// 类型定义
// ============================================================================

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PWAStatus {
  /** 是否支持 PWA */
  isSupported: boolean
  /** 是否已安装 */
  isInstalled: boolean
  /** 是否可以安装 */
  canInstall: boolean
  /** 是否有更新 */
  hasUpdate: boolean
  /** 是否离线 */
  isOffline: boolean
  /** 安装提示事件 */
  installPrompt: BeforeInstallPromptEvent | null
}

export interface UsePWAReturn extends PWAStatus {
  /** 触发安装提示 */
  install: () => Promise<boolean>
  /** 应用更新 */
  applyUpdate: () => void
  /** 清理缓存 */
  clearCache: () => Promise<void>
  /** 获取缓存大小 */
  getCacheSize: () => Promise<number>
}

// ============================================================================
// Hook 实现
// ============================================================================

export function usePWA(): UsePWAReturn {
  // 状态
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isInstalled, setIsInstalled] = useState(false)

  // 检测是否已安装
  useEffect(() => {
    // 检查是否以 standalone 模式运行
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    // 检查 iOS Safari
    const isIOSStandalone = ('standalone' in window.navigator) &&
      (window.navigator as Navigator & { standalone: boolean }).standalone

    setIsInstalled(isStandalone || !!isIOSStandalone)
  }, [])

  // 监听安装提示事件
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // 监听应用安装成功事件
  useEffect(() => {
    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // 监听 Service Worker 更新
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true)
              }
            })
          }
        })
      })

      // 监听控制权变化
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }, [])

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 触发安装
  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      return false
    }

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setInstallPrompt(null)
        return true
      }

      return false
    } catch (error) {
      console.error('安装失败:', error)
      return false
    }
  }, [installPrompt])

  // 应用更新
  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }
  }, [])

  // 清理缓存
  const clearCache = useCallback(async (): Promise<void> => {
    if ('serviceWorker' in navigator && 'MessageChannel' in window) {
      return new Promise((resolve, reject) => {
        const channel = new MessageChannel()

        channel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve()
          } else {
            reject(new Error('清理缓存失败'))
          }
        }

        navigator.serviceWorker.controller?.postMessage(
          { type: 'CLEAR_CACHE' },
          [channel.port2]
        )
      })
    }

    // 降级：直接清理 caches
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }
  }, [])

  // 获取缓存大小
  const getCacheSize = useCallback(async (): Promise<number> => {
    if ('serviceWorker' in navigator && 'MessageChannel' in window) {
      return new Promise((resolve) => {
        const channel = new MessageChannel()

        channel.port1.onmessage = (event) => {
          resolve(event.data.size || 0)
        }

        navigator.serviceWorker.controller?.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [channel.port2]
        )
      })
    }

    // 降级：直接计算
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      let totalSize = 0

      for (const name of cacheNames) {
        const cache = await caches.open(name)
        const keys = await cache.keys()

        for (const request of keys) {
          const response = await cache.match(request)
          if (response) {
            const blob = await response.clone().blob()
            totalSize += blob.size
          }
        }
      }

      return totalSize
    }

    return 0
  }, [])

  return {
    isSupported: 'serviceWorker' in navigator,
    isInstalled,
    canInstall: !!installPrompt,
    hasUpdate,
    isOffline,
    installPrompt,
    install,
    applyUpdate,
    clearCache,
    getCacheSize,
  }
}

export default usePWA
