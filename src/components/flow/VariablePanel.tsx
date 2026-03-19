/**
 * 变量管理面板
 * 显示和管理项目中的所有变量
 */

import { useState } from 'react'
import {
  useVariableStore,
  generateVariableId,
  generateObjectiveName,
  isValidVariableName,
  isValidObjectiveName,
  VariableDefinition,
  VariableType,
  VariableDataType,
  VariableScope,
} from '@/core/variables'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Edit2, Check, X, Database, Hash, FileJson } from 'lucide-react'

// 变量类型图标
const VARIABLE_TYPE_ICONS: Record<VariableType, React.ReactNode> = {
  score: <Hash className="w-4 h-4" />,
  storage: <Database className="w-4 h-4" />,
  entity: <FileJson className="w-4 h-4" />,
  block: <FileJson className="w-4 h-4" />,
}

// 变量类型颜色
const VARIABLE_TYPE_COLORS: Record<VariableType, string> = {
  score: 'text-blue-500',
  storage: 'text-purple-500',
  entity: 'text-red-500',
  block: 'text-green-500',
}

interface VariablePanelProps {
  className?: string
}

export function VariablePanel({ className }: VariablePanelProps) {
  const {
    variables,
    addVariable,
    updateVariable,
    removeVariable,
  } = useVariableStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newVar, setNewVar] = useState<Partial<VariableDefinition>>({
    type: 'score',
    dataType: 'int',
    scope: 'global',
  })

  // 开始编辑
  const handleEdit = (id: string) => {
    const variable = variables.find((v) => v.id === id)
    if (variable) {
      setEditingId(id)
      setNewVar({ ...variable })
    }
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingId && newVar.name && isValidVariableName(newVar.name)) {
      updateVariable(editingId, newVar)
      setEditingId(null)
      setNewVar({
        type: 'score',
        dataType: 'int',
        scope: 'global',
      })
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null)
    setNewVar({
      type: 'score',
      dataType: 'int',
      scope: 'global',
    })
  }

  // 添加新变量
  const handleAddVariable = () => {
    if (newVar.name && isValidVariableName(newVar.name)) {
      const variable: VariableDefinition = {
        id: generateVariableId(),
        name: newVar.name,
        type: newVar.type || 'score',
        dataType: newVar.dataType || 'int',
        scope: newVar.scope || 'global',
        description: newVar.description,
        defaultValue: newVar.defaultValue,
        objective: newVar.type === 'score'
          ? newVar.objective || generateObjectiveName(newVar.name)
          : undefined,
        criterion: newVar.criterion || 'dummy',
        displayName: newVar.displayName,
        storageNamespace: newVar.type === 'storage'
          ? newVar.storageNamespace || 'minecraft:global'
          : undefined,
        storagePath: newVar.storagePath,
      }
      addVariable(variable)
      setShowNewForm(false)
      setNewVar({
        type: 'score',
        dataType: 'int',
        scope: 'global',
      })
    }
  }

  // 删除变量
  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个变量吗？')) {
      removeVariable(id)
    }
  }

  return (
    <div className={cn('flex h-full flex-col bg-card', className)}>
      {/* 标题栏 */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-medium">变量管理</h2>
        <button
          onClick={() => setShowNewForm(true)}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="添加变量"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 新建变量表单 */}
      {showNewForm && (
        <div className="p-3 border-b border-border bg-muted/50">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="变量名"
              value={newVar.name || ''}
              onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
              className="w-full px-2 py-1 text-sm bg-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="flex gap-2">
              <select
                value={newVar.type}
                onChange={(e) => setNewVar({ ...newVar, type: e.target.value as VariableType })}
                className="flex-1 px-2 py-1 text-sm bg-background rounded border border-border"
              >
                <option value="score">记分板</option>
                <option value="storage">存储</option>
              </select>

              <select
                value={newVar.scope}
                onChange={(e) => setNewVar({ ...newVar, scope: e.target.value as VariableScope })}
                className="flex-1 px-2 py-1 text-sm bg-background rounded border border-border"
              >
                <option value="global">全局</option>
                <option value="local">局部</option>
                <option value="temp">临时</option>
              </select>
            </div>

            {newVar.type === 'score' && (
              <input
                type="text"
                placeholder="目标名称 (留空自动生成)"
                value={newVar.objective || ''}
                onChange={(e) => setNewVar({ ...newVar, objective: e.target.value })}
                className="w-full px-2 py-1 text-sm bg-background rounded border border-border"
              />
            )}

            {newVar.type === 'storage' && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="命名空间 (例: mypack:data)"
                  value={newVar.storageNamespace || ''}
                  onChange={(e) => setNewVar({ ...newVar, storageNamespace: e.target.value })}
                  className="w-full px-2 py-1 text-sm bg-background rounded border border-border"
                />
                <input
                  type="text"
                  placeholder="数据路径 (例: player.score)"
                  value={newVar.storagePath || ''}
                  onChange={(e) => setNewVar({ ...newVar, storagePath: e.target.value })}
                  className="w-full px-2 py-1 text-sm bg-background rounded border border-border"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddVariable}
                disabled={!newVar.name || !isValidVariableName(newVar.name || '')}
                className="flex-1 px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="flex-1 px-2 py-1 text-sm bg-muted rounded hover:bg-muted/80"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 变量列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {variables.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            暂无变量
            <div className="text-xs mt-1">点击 + 添加新变量</div>
          </div>
        ) : (
          variables.map((variable) => (
            <div
              key={variable.id}
              className="p-2 bg-muted/50 rounded-md border border-border"
            >
              {editingId === variable.id ? (
                // 编辑模式
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newVar.name || ''}
                    onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
                    className="w-full px-2 py-1 text-sm bg-background rounded border border-border"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 hover:bg-accent rounded"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 hover:bg-accent rounded"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ) : (
                // 显示模式
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={VARIABLE_TYPE_COLORS[variable.type]}>
                        {VARIABLE_TYPE_ICONS[variable.type]}
                      </span>
                      <span className="font-medium text-sm truncate">{variable.name}</span>
                      <span className="text-xs text-muted-foreground px-1 bg-muted rounded">
                        {variable.scope}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {variable.type === 'score' && variable.objective && (
                        <span>目标: {variable.objective}</span>
                      )}
                      {variable.type === 'storage' && variable.storageNamespace && (
                        <span>{variable.storageNamespace}:{variable.storagePath || ''}</span>
                      )}
                    </div>
                    {variable.description && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {variable.description}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(variable.id)}
                      className="p-1 hover:bg-accent rounded opacity-50 hover:opacity-100"
                      title="编辑"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(variable.id)}
                      className="p-1 hover:bg-accent rounded opacity-50 hover:opacity-100 text-red-500"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 统计 */}
      <div className="p-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>记分板: {variables.filter((v) => v.type === 'score').length}</span>
          <span>存储: {variables.filter((v) => v.type === 'storage').length}</span>
        </div>
      </div>
    </div>
  )
}
