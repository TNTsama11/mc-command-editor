import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { WorkflowIssue } from '@/core/workflow/graphValidation'

interface FlowInspectorProps {
  issues: WorkflowIssue[]
  className?: string
}

export function FlowInspector({ issues, className }: FlowInspectorProps) {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length
  const warningCount = issues.length - errorCount

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2 text-xs',
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <span className="font-medium">工作流检查</span>
      <span className="text-muted-foreground">
        共 {issues.length} 项，错误 {errorCount}，警告 {warningCount}
      </span>
    </div>
  )
}

export default FlowInspector
