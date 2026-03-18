import { cn } from "@/lib/utils"

// Minecraft 图标名称类型
export type McIconName = string

interface McIconProps {
  name: McIconName
  size?: "sm" | "md"
  className?: string
}

/**
 * Minecraft 图标组件
 * 使用 mcicon CSS 精灵图
 *
 * @example
 * <McIcon name="command-block" />
 * <McIcon name="redstone" size="sm" />
 */
export function McIcon({ name, size = "md", className }: McIconProps) {
  const iconName = name.startsWith("icon-minecraft-")
    ? name
    : `icon-minecraft-${name}`

  return (
    <i
      className={cn(
        size === "md" ? "icon-minecraft" : "icon-minecraft-sm",
        iconName,
        className
      )}
      aria-hidden="true"
    />
  )
}

// 常用图标名称常量
export const MC_ICONS = {
  // 方块
  COMMAND_BLOCK: "command-block",
  REPEATING_COMMAND_BLOCK: "repeating-command-block",
  CHAIN_COMMAND_BLOCK: "chain-command-block",
  REDSTONE_BLOCK: "redstone-block",
  REDSTONE_TORCH: "redstone-torch",
  REDSTONE_LAMP: "redstone-lamp",

  // 物品
  DIAMOND: "diamond",
  GOLD_INGOT: "gold-ingot",
  IRON_INGOT: "iron-ingot",
  EMERALD: "emerald",

  // 工具
  DIAMOND_PICKAXE: "diamond-pickaxe",
  DIAMOND_SWORD: "diamond-sword",

  // 实体
  CHEST: "chest",
  ENDER_CHEST: "ender-chest",
  CRAFTING_TABLE: "crafting-table",
  FURNACE: "furnace",
  ANVIL: "anvil",

  // 自然
  GRASS_BLOCK: "grass-block",
  STONE: "stone",
  DIRT: "dirt",
  OAK_LOG: "oak-log",
} as const
