import { describe, expect, it } from 'vitest'

import { RESOURCE_CATALOG } from '@/core/resources/catalog'
import { searchResources } from '@/core/resources/search'

describe('resource search', () => {
  it('支持按资源 ID 搜索', () => {
    const results = searchResources('diamond', RESOURCE_CATALOG)

    expect(results.map((entry) => entry.id)).toContain('minecraft:diamond')
  })

  it('支持按显示名搜索', () => {
    const results = searchResources('僵尸', RESOURCE_CATALOG)

    expect(results.map((entry) => entry.id)).toContain('minecraft:zombie')
  })

  it('支持按资源类型过滤', () => {
    const results = searchResources('speed', RESOURCE_CATALOG, {
      kind: 'effect',
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('minecraft:speed')
  })
})
