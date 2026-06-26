import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { blockRegistry } from '@/lib/mdx/block-registry'
import { customBlockComponents } from './CustomBlockRenderer'
import React from 'react'

export const MdxBlockExtension = Node.create({
  name: 'mdxBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mdx-block]',
        getAttrs: (element: HTMLElement) => ({
          code: element.getAttribute('data-mdx-block'),
        }),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mdx-block': HTMLAttributes.code }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MdxBlockView)
  },
})

function MdxBlockView(props: any) {
  const code = props.node.attrs.code || ''
  const text = code.trim()

  const registeredBlocks = blockRegistry.getAllBlocks()
  let renderedContent = null

  // Try to find a matching block
  for (const block of registeredBlocks) {
    const match = text.match(block.pattern)
    if (match) {
      try {
        const blockData = block.handler(match)
        const Component = (customBlockComponents as any)[blockData.hName || blockData.type || block.name]
        if (Component) {
          renderedContent = <Component {...blockData.hProperties} />
        }
        break
      } catch (e) {
        console.error(`[Tiptap MdxBlock] Error rendering block ${block.name}:`, e)
      }
    }
  }

  return (
    <NodeViewWrapper className="mdx-block-node my-4 relative group">
      <div className="absolute -top-3 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded font-mono">
        {code.split('(')[0].replace('[!', '')} Block
      </div>
      <div className="pointer-events-none select-none">
        {renderedContent || (
          <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-mono bg-gray-50">
            {code}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
