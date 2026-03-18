/**
 * OfflineIndicator - 离线状态指示器组件
 *
 * 当应用处于离线状态时显示提示
 */

import { memo } from 'react'
import { WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OfflineIndicatorProps {
  /** 是否离线 */
  isOffline: boolean
  /** 自定义类名 */
  className?: string
}

export const OfflineIndicator = memo(function OfflineIndicator({
  isOffline,
  className,
}: OfflineIndicatorProps) {
  if (!isOffline) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-[100]',
        'bg-amber-500 text-amber-950',
        'py-1.5 px-4 text-center text-sm font-medium',
        'animate-in slide-in-from-top duration-300',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>当前处于离线状态，部分功能可能不可用</span>
      </div>
    </div>
  )
})

export default OfflineIndicator
