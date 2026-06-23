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
    console.log(`✓ Registered block: ${config.name}`)
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
      if (!node.children || node.children.length === 0) return

      const textNode = node.children[0] as Text
      if (!textNode || textNode.type !== 'text') return

      const text = textNode.value

      // Try to match any registered block
      for (const block of blockRegistry.getAllBlocks()) {
        const match = text.match(block.pattern)
        if (!match) continue

        const url = match[1] || ''
        const blockData = block.handler(match, url)

        const customNode = {
          type: block.name,
          url,
          children: [],
          data: {
            hName: 'div',
            hProperties: blockData.hProperties,
          },
        }

        if (parent && typeof index === 'number') {
          parent.children[index] = customNode
        }
        break // Exit after first match
      }
    })
  }
}
