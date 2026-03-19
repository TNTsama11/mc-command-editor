import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { WorkflowIssue } from '@/core/workflow/graphValidation'
import { FlowInspector } from './FlowInspector'

interface WorkflowProblemItem extends WorkflowIssue {
  testId: string
}

interface WorkflowProblemsPanelProps {
  issues: WorkflowProblemItem[]
  onSelectIssue: (issue: WorkflowProblemItem) => void
  className?: string
}

export function WorkflowProblemsPanel({
  issues,
  onSelectIssue,
  className,
}: WorkflowProblemsPanelProps) {
  if (issues.length === 0) {
    return null
  }

  return (
    <div
      data-testid="workflow-issue-panel"
      className={cn(
        'absolute bottom-4 left-4 z-40 hidden w-80 max-w-[calc(100%-2rem)] rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur md:block',
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <div className="text-sm font-medium">工作流问题</div>
      </div>

      <FlowInspector issues={issues} className="mb-3" />

      <div className="space-y-2">
        {issues.map((issue) => (
          <button
            key={issue.testId}
            type="button"
            data-testid={issue.testId}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent"
            onClick={() => onSelectIssue(issue)}
          >
            <div
              className={cn(
                'mb-1 font-medium',
                issue.severity === 'error' ? 'text-destructive' : 'text-amber-600'
              )}
            >
              {issue.severity === 'error' ? '错误' : '警告'}
            </div>
            <div className="text-muted-foreground">{issue.message}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default WorkflowProblemsPanel
