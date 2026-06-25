export interface BlockParam {
  name: string
  label: string
  placeholder?: string
  defaultValue?: string
}

export interface BlockConfig {
  name: string
  label: string
  icon: string | React.ReactNode
  pattern: RegExp
  template?: string
  handler: (match: RegExpMatchArray) => {
    type: string
    hProperties: Record<string, any>
    hName?: string
  }
}

export interface DBBlockConfig {
  id: number
  name: string
  label: string
  description: string
  icon: string
  params: BlockParam[]
  htmlTemplate: string
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
 * Parse params from block syntax: key="value" key2='value2' key3=value3
 */
function parseBlockParams(raw: string): Record<string, string> {
  const parsed: Record<string, string> = {}
  const re = /(\w+)\s*=\s*(?:["']([^"']*)["']|(\S+))/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    parsed[m[1]] = m[2] ?? m[3] ?? ''
  }
  return parsed
}

/**
 * Render a DB block's HTML template with substituted params.
 * {{paramName}} placeholders are replaced with actual values.
 */
function renderDBBlockTemplate(template: string, params: Record<string, string>): string {
  let html = template
  for (const [key, val] of Object.entries(params)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val)
  }
  html = html.replace(/\{\{[^}]+\}\}/g, '')
  return html
}

/**
 * MDX Remark Plugin — transforms [!blockname(params)] syntax into HAST nodes.
 *
 * @param dbBlocks  Extra blocks loaded from the database (user-created).
 *                  Built-in blocks are always available via blockRegistry.
 */
export function createCustomBlockPlugin(dbBlocks: DBBlockConfig[] = []) {
  return (tree: any) => {
    if (!tree) return

    const registeredBlocks = blockRegistry.getAllBlocks()

    function walk(node: any) {
      if (!node) return

      if (node.type === 'paragraph' && node.children) {
        let textContent = ''
        for (const child of node.children) {
          if (child.type === 'text') {
            textContent += child.value
          } else if (child.type === 'link') {
            textContent += (child.children || []).map((c: any) => c.value || '').join('')
          } else if (child.value) {
            textContent += child.value
          }
        }

        const text = textContent.trim()

        if (!text.includes('[!')) {
          if (node.children && Array.isArray(node.children)) node.children.forEach(walk)
          return
        }

        // 1. Check built-in (registered) blocks
        for (const block of registeredBlocks) {
          const match = text.match(block.pattern)
          if (match) {
            try {
              const blockData = block.handler(match)
              node.data = node.data || {}
              node.data.hName = blockData.hName || blockData.type || block.name
              node.data.hProperties = blockData.hProperties
              node.children = []
              return
            } catch (e) {
              console.error(`[MDX Plugin] Error handling block ${block.name}:`, e)
            }
          }
        }

        // 2. Check user DB blocks
        for (const dbBlock of dbBlocks) {
          const pattern = new RegExp(`\\[!${dbBlock.name}\\s*\\(([\\s\\S]*?)\\)\\s*\\]`)
          const match = text.match(pattern)
          if (match) {
            try {
              const params = parseBlockParams(match[1] || '')
              const html = renderDBBlockTemplate(dbBlock.htmlTemplate, params)
              node.data = node.data || {}
              node.data.hName = 'dbblock'
              node.data.hProperties = {
                blockname: dbBlock.name,
                htmlcontent: html,
              }
              node.children = []
              return
            } catch (e) {
              console.error(`[MDX Plugin] Error handling DB block ${dbBlock.name}:`, e)
            }
          }
        }
      }

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
