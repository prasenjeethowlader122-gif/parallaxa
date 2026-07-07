'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  PlusSquare, X, MagnifyingGlass, XCircle, List,
  SquaresFour, MagnifyingGlassMinus, CaretRight, CirclesFour,
  ShareNetwork, Code, Palette, PlayCircle, Info, WarningCircle,
  Lightbulb, Quotes, ChartBar, Image, Book, Note, Table, Notebook
} from '@phosphor-icons/react/dist/ssr'

export type BlockSortKey = 'name' | 'label' | 'recent'
export type BlockViewMode = 'grid' | 'list'

export interface BlockSearchPanelProps {
  blocks: Array<{ name: string; label: string; icon: any; template?: string }>
  onInsert: (block: { name: string; template?: string }) => void
  onClose: () => void
}

export const DynamicIcon = ({ name, size = 20, className = "" }: { name: string, size?: number, className?: string }) => {
  const Icon = (p => {
    switch(p) {
      case 'share': return ShareNetwork;
      case 'terminal': return Code;
      case 'palette': return Palette;
      case 'play_circle': return PlayCircle;
      case 'info': return Info;
      case 'warning': return WarningCircle;
      case 'lightbulb': return Lightbulb;
      case 'format_quote': return Quotes;
      case 'bar_chart': return ChartBar;
      case 'image': return Image;
      case 'book': return Book;
      case 'sticky_note_2': return Note;
      case 'table_chart': return Table;
      case 'menu_book': return Notebook;
      default: return CirclesFour;
    }
  })(name);
  return <Icon size={size} className={className} />;
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

  const socialNames = ['youtube', 'facebook', 'twitter', 'instagram', 'github', 'tiktok', 'reddit', 'vimeo', 'gist', 'tweet', 'fbpost']
  const utilityNames = ['embed', 'run', 'style', 'screenshot', 'goal', 'callout', 'button', 'badge', 'infobox', 'reference', 'tika', 'table', 'verse', 'chart']

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
    { id: 'utility', label: 'Components', count: blocks.filter(b => categorize(b.name) === 'utility').length },
    { id: 'social', label: 'Social', count: blocks.filter(b => categorize(b.name) === 'social').length },
  ] as const

  return (
    <div className="absolute top-full left-0 mt-3 w-[360px] bg-white border border-slate-200 rounded-[2rem] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">
               <PlusSquare size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-widest">Insert Block</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-950 hover:bg-white transition-all"
          >
             <X size={20} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
           <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="w-full pl-11 pr-10 py-3 text-xs bg-white border border-slate-100 rounded-xl outline-none text-slate-900 placeholder-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-950 transition-colors"
            >
               <XCircle size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 bg-white">
        <div className="flex items-center gap-1.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                category === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'Switch to list' : 'Switch to grid'}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-950 transition-all"
          >
             {viewMode === 'grid' ? <List size={18} /> : <SquaresFour size={18} />}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[320px] overflow-y-auto p-3 custom-scrollbar bg-slate-50/30">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100">
               <MagnifyingGlassMinus size={32} className="text-slate-200" />
            </div>
            <p className="text-xs text-slate-400 font-medium">No blocks match "{query}"</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(block => (
              <button
                key={block.name}
                onClick={() => { onInsert(block); onClose() }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                   <DynamicIcon name={typeof block.icon === 'string' ? block.icon : ''} size={20} />
                </div>
                <span className="text-[9px] font-bold text-slate-500 group-hover:text-slate-950 truncate w-full text-center leading-tight uppercase tracking-widest">
                  {block.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(block => (
              <button
                key={block.name}
                onClick={() => { onInsert(block); onClose() }}
                className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 active:scale-[0.98] transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
                   <DynamicIcon name={typeof block.icon === 'string' ? block.icon : ''} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-950 truncate uppercase tracking-widest">{block.label}</p>
                  <p className="text-[10px] text-slate-400 truncate font-mono font-bold mt-0.5">[!{block.name}]</p>
                </div>
                 <CaretRight size={16} className="text-slate-200 group-hover:text-slate-400 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {filtered.length} block{filtered.length !== 1 ? 's' : ''} available
          </p>
        </div>
      )}
    </div>
  )
}
