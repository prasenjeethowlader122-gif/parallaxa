import { visit } from 'unist-util-visit'
import { Root, Paragraph, Text } from 'mdast'

export interface BlockConfig {
  name: string
  pattern: RegExp
  handler: (match: RegExpMatchArray, url?: string) => {
    type: string
    hProperties: Record<string, any>
  }
}

export class BlockRegistry {
  private blocks: Map<string, BlockConfig> = new Map()

  register(config: BlockConfig) {
    this.blocks.set(config.name, config)
  }

  getBlock(name: string) {
    return this.blocks.get(name)
  }

  getAllBlocks() {
    return Array.from(this.blocks.values())
  }
}

export const blockRegistry = new BlockRegistry()

export function createCustomBlockPlugin() {
  return (tree: Root) => {
    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      // We only want to transform paragraphs that contain ONLY a single text node
      // matching one of our custom block patterns.
      if (!node.children || node.children.length !== 1) return

      const textNode = node.children[0] as Text
      if (!textNode || textNode.type !== 'text') return

      const text = textNode.value

      for (const block of blockRegistry.getAllBlocks()) {
        const match = text.match(block.pattern)
        if (match) {
          const url = match[1] || ''
          const blockData = block.handler(match, url)

          // Transform the paragraph node into a custom block node
          // We use the block name for hName so it can be picked up by the custom components map.
          node.data = {
            hName: block.name,
            hProperties: blockData.hProperties,
          }
          // Clear children as this is now a leaf node representing an embed.
          node.children = []

          break
        }
      }
    })
  }
}
