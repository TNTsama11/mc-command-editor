/**
 * 存储工具函数
 *
 * 功能:
 * - localStorage 操作封装
 * - 支持自定义存储键
 * - 数据序列化/反序列化
 * - 存储容量检测
 * - 数据导入/导出
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 存储配置 */
export interface StorageConfig {
  /** 自定义存储键前缀 */
  prefix?: string
  /** 版本号 */
  version?: string
}

/** 存储结果 */
export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: string
}

/** 项目导出格式 */
export interface ProjectExport {
  name: string
  version: string
  exportedAt: number
  data: unknown
}

// ============================================================================
// 常量
// ============================================================================

/** 默认存储键前缀 */
const DEFAULT_PREFIX = 'mc-editor'

/** 当前版本 */
const CURRENT_VERSION = '1.0.0'

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成完整的存储键
 * @param key 原始键名
 * @param prefix 自定义前缀
 * @returns 完整的存储键
 */
export function getStorageKey(key: string, prefix: string = DEFAULT_PREFIX): string {
  return `${prefix}:${key}`
}

/**
 * 检查 localStorage 是否可用
 * @returns 是否可用
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * 获取 localStorage 已使用大小（字节）
 * @returns 已使用字节数
 */
export function getStorageUsedSize(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      if (value) {
        total += key.length + value.length
      }
    }
  }
  // 转换为字节（每个字符 2 字节）
  return total * 2
}

/**
 * 获取 localStorage 可用大小（字节）
 * @returns 可用字节数
 */
export function getStorageAvailableSize(): number {
  // localStorage 通常限制为 5MB
  const MAX_SIZE = 5 * 1024 * 1024
  return MAX_SIZE - getStorageUsedSize()
}

/**
 * 检查是否有足够空间存储数据
 * @param data 要存储的数据
 * @returns 是否有足够空间
 */
export function hasEnoughSpace(data: unknown): boolean {
  const dataSize = JSON.stringify(data).length * 2
  return dataSize <= getStorageAvailableSize()
}

// ============================================================================
// 基础存储操作
// ============================================================================

/**
 * 保存数据到 localStorage
 * @param key 存储键
 * @param data 要存储的数据
 * @param config 存储配置
 * @returns 存储结果
 */
export function saveToStorage<T>(
  key: string,
  data: T,
  config?: StorageConfig
): StorageResult<T> {
  if (!isStorageAvailable()) {
    return { success: false, error: 'localStorage 不可用' }
  }

  try {
    const fullKey = getStorageKey(key, config?.prefix)
    const serialized = JSON.stringify({
      version: config?.version || CURRENT_VERSION,
      data,
      savedAt: Date.now(),
    })

    if (!hasEnoughSpace(serialized)) {
      return { success: false, error: '存储空间不足' }
    }

    localStorage.setItem(fullKey, serialized)
    return { success: true, data }
  } catch (e) {
    return { success: false, error: `存储失败: ${String(e)}` }
  }
}

/**
 * 从 localStorage 加载数据
 * @param key 存储键
 * @param config 存储配置
 * @returns 加载结果
 */
export function loadFromStorage<T>(
  key: string,
  config?: StorageConfig
): StorageResult<T> {
  if (!isStorageAvailable()) {
    return { success: false, error: 'localStorage 不可用' }
  }

  try {
    const fullKey = getStorageKey(key, config?.prefix)
    const item = localStorage.getItem(fullKey)

    if (item === null) {
      return { success: false, error: '数据不存在' }
    }

    const parsed = JSON.parse(item)
    return { success: true, data: parsed.data as T }
  } catch (e) {
    return { success: false, error: `加载失败: ${String(e)}` }
  }
}

/**
 * 从 localStorage 删除数据
 * @param key 存储键
 * @param config 存储配置
 * @returns 是否成功
 */
export function removeFromStorage(key: string, config?: StorageConfig): boolean {
  if (!isStorageAvailable()) {
    return false
  }

  try {
    const fullKey = getStorageKey(key, config?.prefix)
    localStorage.removeItem(fullKey)
    return true
  } catch {
    return false
  }
}

/**
 * 检查存储键是否存在
 * @param key 存储键
 * @param config 存储配置
 * @returns 是否存在
 */
export function hasStorageKey(key: string, config?: StorageConfig): boolean {
  if (!isStorageAvailable()) {
    return false
  }

  const fullKey = getStorageKey(key, config?.prefix)
  return localStorage.getItem(fullKey) !== null
}

/**
 * 获取所有指定前缀的键
 * @param prefix 键前缀
 * @returns 键列表
 */
export function getStorageKeysByPrefix(prefix: string = DEFAULT_PREFIX): string[] {
  if (!isStorageAvailable()) {
    return []
  }

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(`${prefix}:`)) {
      keys.push(key.substring(prefix.length + 1))
    }
  }
  return keys
}

/**
 * 清除所有指定前缀的数据
 * @param prefix 键前缀
 */
export function clearStorageByPrefix(prefix: string = DEFAULT_PREFIX): void {
  if (!isStorageAvailable()) {
    return
  }

  const keys = getStorageKeysByPrefix(prefix)
  keys.forEach((key) => {
    const fullKey = getStorageKey(key, prefix)
    localStorage.removeItem(fullKey)
  })
}

// ============================================================================
// 导入/导出
// ============================================================================

/**
 * 导出数据为 JSON 字符串
 * @param key 存储键
 * @param config 存储配置
 * @returns JSON 字符串或 null
 */
export function exportToJSON(key: string, config?: StorageConfig): string | null {
  const result = loadFromStorage<unknown>(key, config)
  if (!result.success || !result.data) {
    return null
  }

  const exportData: ProjectExport = {
    name: key,
    version: config?.version || CURRENT_VERSION,
    exportedAt: Date.now(),
    data: result.data,
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * 从 JSON 字符串导入数据
 * @param json JSON 字符串
 * @param key 目标存储键
 * @param config 存储配置
 * @returns 导入结果
 */
export function importFromJSON<T>(
  json: string,
  key: string,
  config?: StorageConfig
): StorageResult<T> {
  try {
    const parsed = JSON.parse(json) as ProjectExport

    if (!parsed.data) {
      return { success: false, error: '无效的导入数据格式' }
    }

    const result = saveToStorage<T>(key, parsed.data as T, config)
    return result
  } catch (e) {
    return { success: false, error: `导入失败: ${String(e)}` }
  }
}

/**
 * 下载导出文件
 * @param data 要导出的数据
 * @param filename 文件名
 */
export function downloadExportFile(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 读取上传的文件
 * @param file 文件对象
 * @returns Promise 包含文件内容
 */
export function readImportFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    reader.readAsText(file)
  })
}

// ============================================================================
// 批量操作
// ============================================================================

/**
 * 批量保存数据
 * @param items 键值对数组
 * @param config 存储配置
 * @returns 成功数量
 */
export function batchSaveToStorage<T>(
  items: Array<{ key: string; data: T }>,
  config?: StorageConfig
): number {
  let successCount = 0
  items.forEach((item) => {
    const result = saveToStorage(item.key, item.data, config)
    if (result.success) {
      successCount++
    }
  })
  return successCount
}

/**
 * 批量加载数据
 * @param keys 键列表
 * @param config 存储配置
 * @returns 键值对映射
 */
export function batchLoadFromStorage<T>(
  keys: string[],
  config?: StorageConfig
): Record<string, T> {
  const result: Record<string, T> = {}
  keys.forEach((key) => {
    const loadResult = loadFromStorage<T>(key, config)
    if (loadResult.success && loadResult.data) {
      result[key] = loadResult.data
    }
  })
  return result
}

// ============================================================================
// 默认导出
// ============================================================================

export const storage = {
  // 基础操作
  save: saveToStorage,
  load: loadFromStorage,
  remove: removeFromStorage,
  has: hasStorageKey,

  // 工具函数
  getKey: getStorageKey,
  isAvailable: isStorageAvailable,
  getUsedSize: getStorageUsedSize,
  getAvailableSize: getStorageAvailableSize,
  hasEnoughSpace,

  // 批量操作
  getKeysByPrefix: getStorageKeysByPrefix,
  clearByPrefix: clearStorageByPrefix,
  batchSave: batchSaveToStorage,
  batchLoad: batchLoadFromStorage,

  // 导入/导出
  exportToJSON,
  importFromJSON,
  downloadFile: downloadExportFile,
  readFile: readImportFile,
}
