import { useEffect, useMemo } from 'react'

import { Input } from '@/components/ui/input'
import type { ResourceKind } from '@/core/resources/types'
import { cn } from '@/lib/utils'
import { useResourceStore } from '@/store/resourceStore'

interface ResourcePickerProps {
  fieldKey: string
  kind?: ResourceKind
  value: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function ResourcePicker({
  fieldKey,
  kind,
  value,
  placeholder,
  disabled = false,
  onChange,
}: ResourcePickerProps) {
  const query = useResourceStore((state) => state.query)
  const setQuery = useResourceStore((state) => state.setQuery)
  const setKind = useResourceStore((state) => state.setKind)
  const selectResource = useResourceStore((state) => state.selectResource)
  const getResults = useResourceStore((state) => state.getResults)
  const getRecentResources = useResourceStore((state) => state.getRecentResources)

  useEffect(() => {
    setKind(kind)
    setQuery(value)

    return () => {
      setKind(undefined)
      setQuery('')
    }
  }, [kind, setKind, setQuery, value])

  const recentResources = useMemo(() => getRecentResources(kind), [getRecentResources, kind, query])
  const suggestions = useMemo(() => {
    const results = getResults()
    return (query.trim() ? results : recentResources.length > 0 ? recentResources : results).slice(0, 6)
  }, [getResults, query, recentResources])

  const handleSelect = (resourceId: string) => {
    selectResource(resourceId)
    setQuery(resourceId)
    onChange(resourceId)
  }

  return (
    <div className="space-y-1.5">
      <Input
        type="text"
        value={value}
        placeholder={placeholder ?? 'minecraft:...'}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value
          setQuery(nextValue)
          onChange(nextValue)
        }}
        className={cn('h-8 font-mono text-xs', disabled && 'cursor-not-allowed opacity-60')}
      />
      {suggestions.length > 0 && !disabled && (
        <div
          className="rounded-md border border-border bg-muted/40 p-2"
          data-testid={`resource-suggestions-${fieldKey}`}
        >
          <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>候选资源</span>
            {kind && <span>{kind}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((entry) => (
              <button
                key={entry.id}
                type="button"
                data-testid={`resource-option-${fieldKey}-${entry.id.replace(/[:]/g, '-')}`}
                className="rounded border border-border bg-background px-2 py-1 text-[11px] transition-colors hover:border-primary/50 hover:bg-accent"
                onClick={() => handleSelect(entry.id)}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResourcePicker
