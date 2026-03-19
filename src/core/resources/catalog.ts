import type { ResourceEntry } from './types'

export const RESOURCE_CATALOG: ResourceEntry[] = [
  {
    id: 'minecraft:diamond',
    name: '钻石',
    kind: 'item',
    aliases: ['diamond'],
  },
  {
    id: 'minecraft:diamond_sword',
    name: '钻石剑',
    kind: 'item',
    aliases: ['diamond sword'],
  },
  {
    id: 'minecraft:mace',
    name: '重锤',
    kind: 'item',
    aliases: ['mace'],
    version: {
      minVersion: '1.21',
    },
  },
  {
    id: 'minecraft:stone',
    name: '石头',
    kind: 'block',
    aliases: ['stone'],
  },
  {
    id: 'minecraft:grass_block',
    name: '草方块',
    kind: 'block',
    aliases: ['grass block'],
  },
  {
    id: 'minecraft:zombie',
    name: '僵尸',
    kind: 'entity_type',
    aliases: ['zombie'],
  },
  {
    id: 'minecraft:villager',
    name: '村民',
    kind: 'entity_type',
    aliases: ['villager'],
  },
  {
    id: 'minecraft:speed',
    name: '速度',
    kind: 'effect',
    aliases: ['speed'],
  },
  {
    id: 'minecraft:strength',
    name: '力量',
    kind: 'effect',
    aliases: ['strength'],
  },
]
