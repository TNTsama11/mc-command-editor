import type { Project } from '@/types'

interface SerializedProjectDocument {
  version: '1.0.0'
  exportedAt: number
  project: Project
}

export function serializeProjectDocument(project: Project): string {
  const payload: SerializedProjectDocument = {
    version: '1.0.0',
    exportedAt: Date.now(),
    project,
  }

  return JSON.stringify(payload, null, 2)
}

export function deserializeProjectDocument(json: string): Project {
  const parsed = JSON.parse(json) as Partial<SerializedProjectDocument>

  if (!parsed.project) {
    throw new Error('Invalid serialized project document')
  }

  return parsed.project
}
