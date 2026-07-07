import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { blockRegistry, parseBlockParams } from '@/lib/mdx/block-registry'
import { customBlockComponents } from './CustomBlockRenderer'
import React, { useState, useMemo } from 'react'
import { PencilSimple, Trash, Cube, Gear, X, Info, Check } from '@phosphor-icons/react/ssr'

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
    <NodeViewWrapper className="mdx-block-node my-8 relative group border border-transparent hover:border-slate-200 rounded-3xl transition-all duration-300">
      {/* Label and Actions */}
      <div className="absolute -top-4 left-6 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
        <div className="bg-slate-950 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 uppercase tracking-widest border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {blockTitle}
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xl">
          <button
            onClick={() => { setEditParams(currentParams); setIsEditing(true) }}
            className="p-1.5 text-slate-500 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-all"
            title="Edit Parameters"
          >
             <PencilSimple size={18} />
          </button>
          <button
            onClick={() => deleteNode()}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Remove Block"
          >
             <Trash size={18} />
          </button>
        </div>
      </div>

      {/* Block Content */}
      <div className="select-none overflow-hidden rounded-[2rem] border border-slate-100 bg-white/50 transition-all group-hover:shadow-xl group-hover:shadow-slate-200/50">
        {renderedContent || (
          <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-400 text-sm font-mono bg-slate-50/50 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
               <Cube size={24} className="text-slate-300" />
            </div>
            <code className="text-[10px] bg-white px-3 py-1 rounded-full border border-slate-100 font-bold">{code}</code>
          </div>
        )}
      </div>

      {/* Edit Modal / Popover */}
      {isEditing && (
        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md flex flex-col rounded-[2rem] border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
            <h4 className="text-sm font-bold text-slate-950 flex items-center gap-2 uppercase tracking-widest">
               <Gear size={18} />
               Edit {blockTitle}
            </h4>
            <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-slate-950 rounded-xl hover:bg-white transition-all">
               <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {Object.keys(currentParams).length > 0 ? (
              Object.entries(editParams).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block px-1">{key}</label>
                  <textarea
                    value={value}
                    onChange={(e) => handleParamChange(key, e.target.value)}
                    className="w-full text-sm font-medium border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all resize-none min-h-[50px] bg-white"
                    rows={value.length > 50 ? 3 : 1}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                 <Info size={32} className="text-slate-200 mb-2 mx-auto" />
                 <p className="text-xs text-slate-500 font-medium italic">No editable parameters found for this block.</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-6 py-3 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 text-xs font-bold text-white bg-slate-950 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-950/20 uppercase tracking-widest"
            >
               <Check size={18} />
               Save Changes
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}
