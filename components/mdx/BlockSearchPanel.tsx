'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Link, Image as ImageIcon,
  Minus, SquarePlus, Share2, Terminal, Palette, Box,
  Youtube, Facebook, Twitter, Instagram, X, Search,
  XCircle, List as ListIcon, Grid3x3, ArrowUpDown, ChevronRight,
  TrendingUp, Info, Tag
} from 'lucide-react'

export type BlockSortKey = 'name' | 'label' | 'recent'
export type BlockViewMode = 'grid' | 'list'

export const DynamicIcon = ({ name, size = 18, className }: { name: string; size?: number; className?: string }) => {
  const iconMap: Record<string, any> = {
    'format_bold': Bold, 'format_italic': Italic, 'format_strikethrough': Strikethrough,
    'code': Code, 'format_h1': Heading1, 'format_h2': Heading2,
    'format_list_bulleted': List, 'format_list_numbered': ListOrdered,
    'format_quote': Quote, 'link': Link, 'image': ImageIcon,
    'horizontal_rule': Minus, 'add_box': SquarePlus, 'share': Share2,
    'terminal': Terminal, 'palette': Palette, 'extension': Box,
    'youtube': Youtube, 'facebook': Facebook, 'twitter': Twitter, 'instagram': Instagram,
    'trending_up': TrendingUp, 'info': Info, 'tag': Tag,
  };
  const Icon = iconMap[name] || Box;
  return <Icon size={size} className={className} />;
};

export interface BlockSearchPanelProps {
  blocks: Array<{ name: string; label: string; icon: any; template?: string }>
  onInsert: (block: { name: string; template?: string }) => void
  onClose: () => void
}

export function BlockSearchPanel({ blocks, onInsert, onClose }: BlockSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<BlockSortKey>('label')
  const [viewMode, setViewMode] = useState<BlockViewMode>('grid')
  const [category, setCategory] = useState<'all' | 'embed' | 'social' | 'utility'>('all')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const socialNames = ['youtube', 'facebook', 'twitter', 'instagram', 'github']
  const utilityNames = ['embed', 'run', 'style', 'screenshot']

  const categorize = (name: string) => {
    if (socialNames.includes(name)) return 'social'
    if (utilityNames.includes(name)) return 'utility'
    return 'embed'
  }

  const filtered = blocks
    .filter(b => {
      const matchesQuery =
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.label.toLowerCase().includes(query.toLowerCase())
      const matchesCat = category === 'all' || categorize(b.name) === category
      return matchesQuery && matchesCat
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'label') return a.label.localeCompare(b.label)
      return 0
    })

  const categories = [
    { id: 'all', label: 'All', count: blocks.length },
    { id: 'utility', label: 'Components', count: blocks.filter(b => utilityNames.includes(b.name)).length },
    { id: 'social', label: 'Social', count: blocks.filter(b => socialNames.includes(b.name)).length },
  ] as const

  return (
    <div className="absolute top-full left-0 mt-2 w-[340px] bg-white border border-[#e4e2e1] rounded-none shadow-none z-[100] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#f0eeee]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-none bg-[#585f64] flex items-center justify-center">
              <SquarePlus size={13} className="text-white" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#1a1b1c]">Insert Block</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-none text-[#9e9fa0] hover:text-[#313334] hover:bg-[#f0eeee] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b8b9ba]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="w-full pl-8 pr-3 py-2 text-xs bg-[#f5f3f3] border-0 rounded-none outline-none text-[#313334] placeholder-[#b8b9ba] focus:ring-1 focus:ring-[#585f64] transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b8b9ba] hover:text-[#585f64] transition-colors"
            >
              <XCircle size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#f0eeee] bg-[#faf9f9]">
        <div className="flex items-center gap-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-2.5 py-1 rounded-none text-[10px] font-semibold transition-all ${
                category === cat.id
                  ? 'bg-[#585f64] text-white'
                  : 'text-[#7a8086] hover:bg-[#eeecec] hover:text-[#313334]'
              }`}
            >
              {cat.label}
              <span className={`ml-1 ${category === cat.id ? 'text-white/60' : 'text-[#b8b9ba]'}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'Switch to list' : 'Switch to grid'}
            className="p-1.5 rounded-none text-[#9e9fa0] hover:bg-[#eeecec] hover:text-[#585f64] transition-colors"
          >
            {viewMode === 'grid' ? <ListIcon size={12} /> : <Grid3x3 size={12} />}
          </button>
          <button
            onClick={() => setSort(s => s === 'label' ? 'name' : 'label')}
            title="Toggle sort"
            className="p-1.5 rounded-none text-[#9e9fa0] hover:bg-[#eeecec] hover:text-[#585f64] transition-colors"
          >
            <ArrowUpDown size={12} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[280px] overflow-y-auto p-2 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="w-10 h-10 rounded-none bg-[#f5f3f3] flex items-center justify-center">
              <Search size={16} className="text-[#c8c6c6]" />
            </div>
            <p className="text-xs text-[#b8b9ba]">No blocks match "{query}"</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-1">
            {filtered.map(block => (
              <button
                key={block.name}
                onClick={() => { onInsert(block); onClose() }}
                title={block.label}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-none hover:bg-[#f5f3f3] active:scale-95 transition-all group"
              >
                <div className="w-9 h-9 rounded-none bg-[#f5f3f3] border border-[#eeecec] flex items-center justify-center text-[#7a8086] group-hover:bg-[#1a1b1c] group-hover:text-white group-hover:border-transparent transition-all">
                  <DynamicIcon name={typeof block.icon === 'string' ? block.icon : 'extension'} size={16} />
                </div>
                <span className="text-[9px] font-semibold text-[#7a8086] group-hover:text-[#313334] truncate w-full text-center leading-tight">
                  {block.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map(block => (
              <button
                key={block.name}
                onClick={() => { onInsert(block); onClose() }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-none hover:bg-[#f5f3f3] active:scale-[0.99] transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-none bg-[#f5f3f3] border border-[#eeecec] flex items-center justify-center text-[#7a8086] group-hover:bg-[#1a1b1c] group-hover:text-white group-hover:border-transparent transition-all shrink-0">
                  <DynamicIcon name={typeof block.icon === 'string' ? block.icon : 'extension'} size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#313334] truncate">{block.label}</p>
                  <p className="text-[10px] text-[#b8b9ba] truncate font-mono">[!{block.name}]</p>
                </div>
                <ChevronRight size={12} className="text-[#dcdad9] group-hover:text-[#585f64] shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#f0eeee] bg-[#faf9f9]">
          <p className="text-[10px] text-[#c8c6c6]">
            {filtered.length} block{filtered.length !== 1 ? 's' : ''} · Click to insert at cursor
          </p>
        </div>
      )}
    </div>
  )
}
