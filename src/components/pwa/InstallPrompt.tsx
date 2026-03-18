/**
 * InstallPrompt - PWA 安装提示组件
 *
 * 提示用户将应用添加到主屏幕
 */

import { memo, useCallback } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface InstallPromptProps {
  /** 是否显示 */
  visible: boolean
  /** 安装回调 */
  onInstall: () => void
  /** 关闭提示回调 */
  onDismiss: () => void
  /** 自定义类名 */
  className?: string
}

export const InstallPrompt = memo(function InstallPrompt({
  visible,
  onInstall,
  onDismiss,
  className,
}: InstallPromptProps) {
  const handleInstall = useCallback(() => {
    onInstall()
  }, [onInstall])

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  if (!visible) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80',
        'bg-card border rounded-lg shadow-lg p-4 z-50',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
      role="dialog"
      aria-labelledby="install-prompt-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 id="install-prompt-title" className="text-sm font-medium">
            安装应用
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            将 MC Command Editor 添加到主屏幕，获得更好的体验和离线支持
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
          aria-label="关闭提示"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
        >
          暂不需要
        </Button>
        <Button
          size="sm"
          onClick={handleInstall}
          className="gap-1"
        >
          <Download className="w-4 h-4" />
          安装
        </Button>
      </div>
    </div>
  )
})

export default InstallPrompt
