import { create } from 'zustand'
import { Command } from '@/types'

interface EditorState {
  // 当前命令
  currentCommand: Command | null
  setCurrentCommand: (command: Command | null) => void

  // 命令历史
  commandHistory: Command[]
  addToHistory: (command: Command) => void
  clearHistory: () => void

  // 命令方块链
  commandBlocks: CommandBlock[]
  addCommandBlock: (block: CommandBlock) => void
  updateCommandBlock: (id: string, updates: Partial<CommandBlock>) => void
  removeCommandBlock: (id: string) => void
  reorderCommandBlocks: (startIndex: number, endIndex: number) => void

  // 选中的方块
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
}

interface CommandBlock {
  id: string
  type: 'impulse' | 'chain' | 'repeat'
  conditional: boolean
  command: string
  auto: boolean
}

export const useEditorStore = create<EditorState>((set) => ({
  currentCommand: null,
  setCurrentCommand: (command) => set({ currentCommand: command }),

  commandHistory: [],
  addToHistory: (command) => set((state) => ({
    commandHistory: [command, ...state.commandHistory.slice(0, 50)]
  })),
  clearHistory: () => set({ commandHistory: [] }),

  commandBlocks: [],
  addCommandBlock: (block) => set((state) => ({
    commandBlocks: [...state.commandBlocks, block],
  })),
  updateCommandBlock: (id, updates) => set((state) => ({
    commandBlocks: state.commandBlocks.map((block) =>
      block.id === id ? { ...block, ...updates } : block
    ),
  })),
  removeCommandBlock: (id) => set((state) => ({
    commandBlocks: state.commandBlocks.filter((block) => block.id !== id),
  })),
  reorderCommandBlocks: (startIndex, endIndex) => set((state) => {
    const newBlocks = [...state.commandBlocks]
    const [removed] = newBlocks.splice(startIndex, 1)
    newBlocks.splice(endIndex, 0, removed)
    return { commandBlocks: newBlocks }
  }),

  selectedBlockId: null,
  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
}))
