export interface StorageConfig {
  prefix?: string
  version?: string
}

export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ProjectExport {
  name: string
  version: string
  exportedAt: number
  data: unknown
}

const DEFAULT_PREFIX = 'mc-editor'
const CURRENT_VERSION = '1.0.0'
const LOCAL_STORAGE_LIMIT = 5 * 1024 * 1024

function getLocalStorage() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null
  }

  return window.localStorage
}

function estimateSizeInBytes(value: string) {
  return value.length * 2
}

export function getStorageKey(key: string, prefix: string = DEFAULT_PREFIX): string {
  return `${prefix}:${key}`
}

export function isStorageAvailable(): boolean {
  const target = getLocalStorage()
  if (!target) return false

  try {
    const probeKey = '__mc_editor_storage_probe__'
    target.setItem(probeKey, probeKey)
    target.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

export function getStorageUsedSize(): number {
  const target = getLocalStorage()
  if (!target) return 0

  let total = 0
  for (let index = 0; index < target.length; index += 1) {
    const key = target.key(index)
    if (!key) continue

    const value = target.getItem(key)
    total += estimateSizeInBytes(key)
    total += estimateSizeInBytes(value || '')
  }

  return total
}

export function getStorageAvailableSize(): number {
  return Math.max(0, LOCAL_STORAGE_LIMIT - getStorageUsedSize())
}

export function hasEnoughSpace(data: unknown): boolean {
  return estimateSizeInBytes(JSON.stringify(data)) <= getStorageAvailableSize()
}

export function saveToStorage<T>(
  key: string,
  data: T,
  config?: StorageConfig
): StorageResult<T> {
  const target = getLocalStorage()
  if (!target || !isStorageAvailable()) {
    return { success: false, error: 'localStorage 当前不可用。' }
  }

  try {
    const payload = {
      version: config?.version || CURRENT_VERSION,
      savedAt: Date.now(),
      data,
    }

    if (!hasEnoughSpace(payload)) {
      return { success: false, error: '本地存储空间不足。' }
    }

    target.setItem(getStorageKey(key, config?.prefix), JSON.stringify(payload))
    return { success: true, data }
  } catch (error) {
    return { success: false, error: `保存失败: ${String(error)}` }
  }
}

export function loadFromStorage<T>(key: string, config?: StorageConfig): StorageResult<T> {
  const target = getLocalStorage()
  if (!target || !isStorageAvailable()) {
    return { success: false, error: 'localStorage 当前不可用。' }
  }

  try {
    const raw = target.getItem(getStorageKey(key, config?.prefix))
    if (raw === null) {
      return { success: false, error: '未找到对应的存储数据。' }
    }

    const parsed = JSON.parse(raw) as { data?: T }
    return { success: true, data: parsed.data as T }
  } catch (error) {
    return { success: false, error: `读取失败: ${String(error)}` }
  }
}

export function removeFromStorage(key: string, config?: StorageConfig): boolean {
  const target = getLocalStorage()
  if (!target || !isStorageAvailable()) {
    return false
  }

  try {
    target.removeItem(getStorageKey(key, config?.prefix))
    return true
  } catch {
    return false
  }
}

export function hasStorageKey(key: string, config?: StorageConfig): boolean {
  const target = getLocalStorage()
  if (!target || !isStorageAvailable()) {
    return false
  }

  return target.getItem(getStorageKey(key, config?.prefix)) !== null
}

export function getStorageKeysByPrefix(prefix: string = DEFAULT_PREFIX): string[] {
  const target = getLocalStorage()
  if (!target || !isStorageAvailable()) {
    return []
  }

  const prefixWithDelimiter = `${prefix}:`
  const keys: string[] = []

  for (let index = 0; index < target.length; index += 1) {
    const key = target.key(index)
    if (key?.startsWith(prefixWithDelimiter)) {
      keys.push(key.slice(prefixWithDelimiter.length))
    }
  }

  return keys
}

export function clearStorageByPrefix(prefix: string = DEFAULT_PREFIX): void {
  const target = getLocalStorage()
  if (!target || !isStorageAvailable()) {
    return
  }

  getStorageKeysByPrefix(prefix).forEach((key) => {
    target.removeItem(getStorageKey(key, prefix))
  })
}

export function exportToJSON(key: string, config?: StorageConfig): string | null {
  const result = loadFromStorage<unknown>(key, config)
  if (!result.success) {
    return null
  }

  const payload: ProjectExport = {
    name: key,
    version: config?.version || CURRENT_VERSION,
    exportedAt: Date.now(),
    data: result.data,
  }

  return JSON.stringify(payload, null, 2)
}

export function importFromJSON<T>(
  json: string,
  key: string,
  config?: StorageConfig
): StorageResult<T> {
  try {
    const parsed = JSON.parse(json) as Partial<ProjectExport>
    if (!('data' in parsed)) {
      return { success: false, error: '导入文件格式无效。' }
    }

    return saveToStorage(key, parsed.data as T, config)
  } catch (error) {
    return { success: false, error: `导入失败: ${String(error)}` }
  }
}

export function downloadExportFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function readImportFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取导入文件失败。'))
    reader.readAsText(file, 'utf-8')
  })
}

export function batchSaveToStorage<T>(
  items: Array<{ key: string; data: T }>,
  config?: StorageConfig
): number {
  return items.reduce((count, item) => {
    const result = saveToStorage(item.key, item.data, config)
    return result.success ? count + 1 : count
  }, 0)
}

export function batchLoadFromStorage<T>(
  keys: string[],
  config?: StorageConfig
): Record<string, T> {
  return keys.reduce<Record<string, T>>((result, key) => {
    const loaded = loadFromStorage<T>(key, config)
    if (loaded.success && loaded.data !== undefined) {
      result[key] = loaded.data
    }
    return result
  }, {})
}

export const storage = {
  save: saveToStorage,
  load: loadFromStorage,
  remove: removeFromStorage,
  has: hasStorageKey,
  getKey: getStorageKey,
  isAvailable: isStorageAvailable,
  getUsedSize: getStorageUsedSize,
  getAvailableSize: getStorageAvailableSize,
  hasEnoughSpace,
  getKeysByPrefix: getStorageKeysByPrefix,
  clearByPrefix: clearStorageByPrefix,
  batchSave: batchSaveToStorage,
  batchLoad: batchLoadFromStorage,
  exportToJSON,
  importFromJSON,
  downloadFile: downloadExportFile,
  readFile: readImportFile,
}
