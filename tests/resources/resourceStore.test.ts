import { beforeEach, describe, expect, it } from 'vitest'

import { useResourceStore } from '@/store/resourceStore'

describe('resource store', () => {
  beforeEach(() => {
    useResourceStore.getState().reset()
  })

  it('记录最近使用的资源，并按最近顺序去重', () => {
    const store = useResourceStore.getState()

    store.selectResource('minecraft:diamond')
    store.selectResource('minecraft:stone')
    store.selectResource('minecraft:diamond')

    expect(useResourceStore.getState().recentResourceIds).toEqual([
      'minecraft:diamond',
      'minecraft:stone',
    ])
  })
})
