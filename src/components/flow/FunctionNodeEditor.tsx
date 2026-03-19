import type { PinDefinition } from '@/store/flowStore'

export const FUNCTION_NODE_EDITOR_TITLE = '函数节点编辑器'

interface FunctionNodeEditorProps {
  workflowId: string
  workflowName: string
  inputs?: PinDefinition[]
  outputs?: PinDefinition[]
  className?: string
}

export function FunctionNodeEditor({
  workflowId,
  workflowName,
  inputs = [],
  outputs = [],
  className,
}: FunctionNodeEditorProps) {
  return (
    <section className={className}>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-1 text-sm font-medium">{FUNCTION_NODE_EDITOR_TITLE}</div>
        <div className="text-xs text-muted-foreground">
          当前工作流：{workflowName}（{workflowId}）
        </div>
        <div className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <div className="mb-1 font-medium text-foreground">输入接口</div>
            {inputs.length > 0 ? (
              <div className="space-y-1">
                {inputs.map((pin) => (
                  <div key={pin.id}>{pin.name}</div>
                ))}
              </div>
            ) : (
              <div>暂未定义输入接口</div>
            )}
          </div>
          <div>
            <div className="mb-1 font-medium text-foreground">输出接口</div>
            {outputs.length > 0 ? (
              <div className="space-y-1">
                {outputs.map((pin) => (
                  <div key={pin.id}>{pin.name}</div>
                ))}
              </div>
            ) : (
              <div>暂未定义输出接口</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
