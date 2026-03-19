export type ResourceKind = 'item' | 'block' | 'entity_type' | 'effect'

export interface ResourceVersionRule {
  minVersion?: string
  maxVersion?: string
}

export interface ResourceEntry {
  id: string
  name: string
  kind: ResourceKind
  aliases?: string[]
  version?: ResourceVersionRule
}

export interface ResourceSearchOptions {
  kind?: ResourceKind
}
