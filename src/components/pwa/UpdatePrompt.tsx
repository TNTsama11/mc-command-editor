/**
 * UpdatePrompt - PWA 更新提示组件
 *
 * 当检测到新版本时显示更新提示
 */

import { memo, useCallback } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface UpdatePromptProps {
  /** 是否显示 */
  visible: boolean
  /** 应用更新回调 */
  onUpdate: () => void
  /** 关闭提示回调 */
  onDismiss: () => void
  /** 自定义类名 */
  className?: string
}

export const UpdatePrompt = memo(function UpdatePrompt({
  visible,
  onUpdate,
  onDismiss,
  className,
}: UpdatePromptProps) {
  const handleUpdate = useCallback(() => {
    onUpdate()
  }, [onUpdate])

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
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Download className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">发现新版本</h4>
          <p className="text-xs text-muted-foreground mt-1">
            有新版本可用，建议更新以获得最新功能和修复
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
          稍后提醒
        </Button>
        <Button
          size="sm"
          onClick={handleUpdate}
        >
          立即更新
        </Button>
      </div>
    </div>
  )
})

export default UpdatePrompt
