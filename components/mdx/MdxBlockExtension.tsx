import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { blockRegistry, parseBlockParams } from '@/lib/mdx/block-registry'
import { customBlockComponents } from './CustomBlockRenderer'
import React, { useState, useMemo } from 'react'
import { Pencil, Trash2, X, Check, ExternalLink } from 'lucide-react'

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
  const { node, updateAttributes, deleteNode } = props
  const code = node.attrs.code || ''
  const [isEditing, setIsEditing] = useState(false)

  // Extract block name and params
  const blockName = useMemo(() => {
    const match = code.match(/\[!([a-zA-Z0-9_-]+)/)
    return match ? match[1] : ''
  }, [code])

  const currentParams = useMemo(() => {
    const paramStringMatch = code.match(/\(([\s\S]*?)\)/)
    return parseBlockParams(paramStringMatch ? paramStringMatch[1] : '')
  }, [code])

  const [editParams, setEditParams] = useState<Record<string, string>>(currentParams)

  const registeredBlocks = blockRegistry.getAllBlocks()
  let renderedContent = null
  let blockTitle = blockName

  // Try to find a matching block
  for (const block of registeredBlocks) {
    const match = code.trim().match(block.pattern)
    if (match) {
      blockTitle = block.label || blockName
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

  const handleSave = () => {
    const paramString = Object.entries(editParams)
      .map(([key, val]) => `${key}="${val.replace(/"/g, '&quot;')}"`)
      .join(' ')
    const newCode = `[!${blockName}(${paramString})]`
    updateAttributes({ code: newCode })
    setIsEditing(false)
  }

  const handleParamChange = (key: string, value: string) => {
    setEditParams(prev => ({ ...prev, [key]: value }))
  }

  return (
    <NodeViewWrapper className="mdx-block-node my-6 relative group border border-transparent hover:border-gray-200 rounded-2xl transition-all duration-200">
      {/* Label and Actions */}
      <div className="absolute -top-3 left-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
        <div className="bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {blockTitle}
        </div>

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full p-0.5 shadow-lg ml-1">
          <button
            onClick={() => { setEditParams(currentParams); setIsEditing(true) }}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors"
            title="Edit Parameters"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => deleteNode()}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Remove Block"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Block Content */}
      <div className="pointer-events-none select-none overflow-hidden rounded-2xl border border-gray-100/50">
        {renderedContent || (
          <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm font-mono bg-gray-50/50 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm">
              <ExternalLink size={16} className="text-gray-300" />
            </div>
            {code}
          </div>
        )}
      </div>

      {/* Edit Modal / Popover */}
      {isEditing && (
        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col rounded-2xl border border-gray-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Pencil size={14} />
              Edit {blockTitle}
            </h4>
            <button onClick={() => setIsEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {Object.keys(currentParams).length > 0 ? (
              Object.entries(editParams).map(([key, value]) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{key}</label>
                  <textarea
                    value={value}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/5 transition-all resize-none min-h-[40px]"
                    rows={value.length > 50 ? 3 : 1}
                  />
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic text-center py-4">No editable parameters found for this block.</p>
            )}
          </div>

          <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-xs font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              <Check size={14} />
              Save Changes
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}
