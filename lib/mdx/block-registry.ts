export interface BlockConfig {
  name: string
  label: string
  icon: string | React.ReactNode
  pattern: RegExp
  template?: string
  handler: (match: RegExpMatchArray) => {
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

/**
 * MDX Remark Plugin to transform custom block syntax into HAST-compatible nodes.
 * Syntax: [!blockname(url="...")]
 */
export function createCustomBlockPlugin() {
  return (tree: any) => {
    if (!tree) return

    const registeredBlocks = blockRegistry.getAllBlocks()

    function walk(node: any) {
      if (!node) return

      if (node.type === 'paragraph' && node.children) {
        // Collect text content from all children (text nodes and link nodes)
        let textContent = ''
        for (const child of node.children) {
          if (child.type === 'text') {
            textContent += child.value
          } else if (child.type === 'link') {
            // Include link text, as remark-gfm might have already linked the URL
            textContent += (child.children || []).map((c: any) => c.value || '').join('')
          } else if (child.value) {
            textContent += child.value
          }
        }

        const text = textContent.trim()

        if (text.includes('[!') && text.includes(')]')) {
          for (const block of registeredBlocks) {
            const match = text.match(block.pattern)
            if (match) {
              try {
                const blockData = block.handler(match)

                // Transform the paragraph node into a custom block node
                // node.data is recognized by remark-rehype to set HAST properties
                node.data = node.data || {}
                node.data.hName = blockData.type || block.name
                node.data.hProperties = blockData.hProperties

                // Clear children so it becomes a leaf node for the custom renderer
                node.children = []

                return // Stop processing this paragraph
              } catch (e) {
                console.error(`[MDX Plugin] Error handling block ${block.name}:`, e)
              }
            }
          }
        }
      }

      // Continue walking children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(walk)
      }
    }

    try {
      walk(tree)
    } catch (e) {
      console.error('[MDX Plugin] Critical error during tree walk:', e)
    }
  }
}
