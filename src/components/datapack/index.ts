/**
 * 数据包组件模块
 *
 * 提供 Minecraft 数据包的预览和管理界面
 *
 * @example
 * ```tsx
 * import { DatapackManager } from '@/components/datapack'
 *
 * function MyPage() {
 *   return (
 *     <DatapackManager
 *       onDatapackChange={(datapack) => console.log('Updated:', datapack)}
 *       onExportComplete={(blob, filename) => console.log('Exported:', filename)}
 *     />
 *   )
 * }
 * ```
 */

export { DatapackManager, type DatapackManagerProps } from './DatapackManager'
export { default } from './DatapackManager'
