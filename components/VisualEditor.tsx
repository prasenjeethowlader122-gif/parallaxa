'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import LinkExt from '@tiptap/extension-link'
import ImageExt from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import YoutubeExt from '@tiptap/extension-youtube'
import { MdxBlockExtension } from './mdx/MdxBlockExtension'
import { useEffect, useRef, useState, useCallback } from 'react'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { marked } from 'marked'
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon,
  Youtube, Undo, Redo, Minus, X, ExternalLink, Type, AlignLeft,
  Terminal, SquarePlus, ChevronDown, Search
} from 'lucide-react'
import { BlockSearchPanel } from './mdx/BlockSearchPanel'
import { blockRegistry } from '@/lib/mdx/block-registry'

interface VisualEditorProps {
  content: string
  onChange: (content: string) => void
}

function URLModal({ title, placeholder, label, onConfirm, onClose }: {
  title: string
  placeholder: string
  label: string
  onConfirm: (url: string) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const confirm = () => { if (url.trim()) { onConfirm(url.trim()); } }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10 mb-4"
          onKeyDown={e => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            বাতিল
          </button>
          <button
            onClick={confirm}
            disabled={!url.trim()}
            className="flex-1 py-2 text-sm text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  )
}

const ToolBtn = ({ onClick, active, disabled, title, children }: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) => (
  <button
    onMouseDown={e => { e.preventDefault(); onClick() }}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded-lg transition-all shrink-0 ${
      active
        ? 'bg-gray-900 text-white'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    } disabled:opacity-30 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
)

const BubbleBtn = ({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) => (
  <button
    onMouseDown={e => { e.preventDefault(); onClick() }}
    title={title}
    className={`p-1.5 rounded-lg transition-all ${
      active ? 'bg-white text-gray-900' : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`}
  >
    {children}
  </button>
)

const Sep = () => <div className="w-px h-5 bg-gray-100 mx-0.5 shrink-0" />
const BubbleSep = () => <div className="w-px h-4 bg-white/20 mx-0.5 shrink-0" />

const SLASH_ITEMS = [
  { label: 'সাধারণ অনুচ্ছেদ', icon: <AlignLeft size={14} />, cmd: (ed: any) => ed.chain().focus().setParagraph().run() },
  { label: 'শিরোনাম ১', icon: <Heading1 size={14} />, cmd: (ed: any) => ed.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'শিরোনাম ২', icon: <Heading2 size={14} />, cmd: (ed: any) => ed.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'শিরোনাম ৩', icon: <Heading3 size={14} />, cmd: (ed: any) => ed.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'বুলেট লিস্ট', icon: <List size={14} />, cmd: (ed: any) => ed.chain().focus().toggleBulletList().run() },
  { label: 'নম্বর লিস্ট', icon: <ListOrdered size={14} />, cmd: (ed: any) => ed.chain().focus().toggleOrderedList().run() },
  { label: 'উদ্ধৃতি', icon: <Quote size={14} />, cmd: (ed: any) => ed.chain().focus().toggleBlockquote().run() },
  { label: 'কোড ব্লক', icon: <Terminal size={14} />, cmd: (ed: any) => ed.chain().focus().toggleCodeBlock().run() },
  { label: 'বিভাজক রেখা', icon: <Minus size={14} />, cmd: (ed: any) => ed.chain().focus().setHorizontalRule().run() },
]

export default function VisualEditor({ content, onChange }: VisualEditorProps) {
  const tdRef = useRef<TurndownService | null>(null)
  const [modal, setModal] = useState<'image' | 'link' | 'youtube' | 'embed' | null>(null)
  const [slashMenu, setSlashMenu] = useState(false)
  const [blockSearchOpen, setBlockSearchOpen] = useState(false)
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 })
  const slashRef = useRef<HTMLDivElement>(null)
  const blockSearchRef = useRef<HTMLDivElement>(null)

  if (!tdRef.current) {
    tdRef.current = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
    tdRef.current.use(gfm)
  }

  const toMarkdown = useCallback((html: string) => {
    if (!tdRef.current) return html

    // Rule to handle mdxBlock nodes
    tdRef.current.addRule('mdxBlock', {
      filter: (node) => node.nodeName === 'DIV' && node.hasAttribute('data-mdx-block'),
      replacement: (content, node: any) => {
        const code = node.getAttribute('data-mdx-block') || ''
        return `\n\n${code}\n\n`
      },
    })

    return tdRef.current.turndown(html)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      ImageExt.configure({ HTMLAttributes: { class: 've-img' } }),
      YoutubeExt.configure({ width: '100%', height: 380 }),
      MdxBlockExtension,
      Placeholder.configure({ placeholder: 'লিখুন, অথবা / চাপুন block যোগ করতে…' }),
    ],
    content: marked.parse(content) as string,
    onUpdate: ({ editor }) => {
      const md = toMarkdown(editor.getHTML())
      onChange(md)
    },
    editorProps: {
      attributes: { class: 've-body focus:outline-none min-h-[480px]' },
      handleKeyDown(view, event) {
        if (event.key === '/') {
          const { from } = view.state.selection
          const node = view.domAtPos(from)
          if (node && node.node) {
            const el = node.node.nodeType === 3
              ? node.node.parentElement
              : node.node as HTMLElement
            if (el) {
              const rect = el.getBoundingClientRect()
              const editorRect = view.dom.getBoundingClientRect()
              setSlashPos({ x: rect.left - editorRect.left, y: rect.bottom - editorRect.top + 4 })
              setTimeout(() => setSlashMenu(true), 50)
            }
          }
        } else if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Enter') {
          setSlashMenu(false)
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const currentMd = toMarkdown(editor.getHTML()).trim()
    const targetMd = content.trim()

    if (currentMd !== targetMd) {
      // We need to wrap [!block()] patterns in <div data-mdx-block="..."> before parsing to HTML
      const pattern = /\[![a-zA-Z0-9_-]+\([\s\S]*?\)\s*\]/g
      const processedContent = content.replace(pattern, (match) => {
        // Escape single quotes to prevent breaking the attribute
        const escapedMatch = match.replace(/'/g, '&#39;')
        return `<div data-mdx-block='${escapedMatch}'></div>`
      })

      const html = marked.parse(processedContent) as string
      editor.commands.setContent(html, false)
    }
  }, [content, editor, toMarkdown])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) {
        setSlashMenu(false)
      }
      if (blockSearchRef.current && !blockSearchRef.current.contains(e.target as Node)) {
        setBlockSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [slashMenu, blockSearchOpen])

  if (!editor) return null

  const runSlash = (cmd: (ed: any) => void) => {
    editor.chain().focus().deleteRange({
      from: editor.state.selection.from - 1,
      to: editor.state.selection.from,
    }).run()
    cmd(editor)
    setSlashMenu(false)
  }

  const insertImage = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run()
    setModal(null)
  }

  const insertLink = (url: string) => {
    editor.chain().focus().setLink({ href: url }).run()
    setModal(null)
  }

  const insertYoutube = (url: string) => {
    editor.commands.setYoutubeVideo({ src: url })
    setModal(null)
  }

  const insertEmbed = (url: string) => {
    const code = `[!embed(url="${url}")]`
    editor.chain().focus().insertContent({
      type: 'mdxBlock',
      attrs: { code }
    }).run()
    setModal(null)
  }

  const handleBlockInsert = (block: { name: string; template?: string }) => {
    const code = block.template || `[!${block.name}(url="")]`
    editor.chain().focus().insertContent({
      type: 'mdxBlock',
      attrs: { code }
    }).run()
    setBlockSearchOpen(false)
  }

  const allBlocks = blockRegistry.getAllBlocks()

  return (
    <div className="w-full flex flex-col relative">
      {modal === 'image' && (
        <URLModal title="ছবি যোগ করুন" placeholder="https://example.com/image.jpg" label="যোগ করুন" onConfirm={insertImage} onClose={() => setModal(null)} />
      )}
      {modal === 'link' && (
        <URLModal title="লিংক যোগ করুন" placeholder="https://example.com" label="যোগ করুন" onConfirm={insertLink} onClose={() => setModal(null)} />
      )}
      {modal === 'youtube' && (
        <URLModal title="YouTube ভিডিও" placeholder="https://youtube.com/watch?v=..." label="যোগ করুন" onConfirm={insertYoutube} onClose={() => setModal(null)} />
      )}
      {modal === 'embed' && (
        <URLModal title="Social Embed" placeholder="Facebook, Twitter, Instagram, Reddit URL..." label="যোগ করুন" onConfirm={insertEmbed} onClose={() => setModal(null)} />
      )}

      {/* Main Toolbar */}
      <div className="sticky top-0 z-20 flex items-center gap-0.5 px-1.5 py-1.5 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm mb-5 overflow-visible">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-0.5 flex-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
            <Bold size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
            <Italic size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
            <Code size={14} />
          </ToolBtn>

          <Sep />

          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="শিরোনাম ১">
            <Heading1 size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="শিরোনাম ২">
            <Heading2 size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="শিরোনাম ৩">
            <Heading3 size={14} />
          </ToolBtn>

          <Sep />

          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="বুলেট লিস্ট">
            <List size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="নম্বর লিস্ট">
            <ListOrdered size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="উদ্ধৃতি">
            <Quote size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="কোড ব্লক">
            <Terminal size={14} />
          </ToolBtn>

          <Sep />

          <ToolBtn onClick={() => setModal('link')} active={editor.isActive('link')} title="লিংক">
            <LinkIcon size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => setModal('image')} title="ছবি">
            <ImageIcon size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => setModal('youtube')} title="YouTube ভিডিও">
            <Youtube size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => setModal('embed')} title="Social Embed">
            <ExternalLink size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="বিভাজক রেখা">
            <Minus size={14} />
          </ToolBtn>
        </div>

        <Sep />

        {/* Block Search - Outside overflow div */}
        <div className="relative" ref={blockSearchRef}>
          <button
            onMouseDown={e => { e.preventDefault(); setBlockSearchOpen(!blockSearchOpen) }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              blockSearchOpen
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <SquarePlus size={14} />
            <span className="hidden sm:inline">Blocks</span>
            <Search size={11} className="hidden sm:inline opacity-60" />
            <ChevronDown size={11} className={`transition-transform duration-200 ${blockSearchOpen ? 'rotate-180' : ''}`} />
          </button>

          {blockSearchOpen && (
            <div className="absolute top-full right-0 mt-2 z-50">
              <BlockSearchPanel
                blocks={allBlocks}
                onInsert={handleBlockInsert}
                onClose={() => setBlockSearchOpen(false)}
              />
            </div>
          )}
        </div>

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <Redo size={14} />
        </ToolBtn>
      </div>

      {/* Bubble Menu — appears when text is selected */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 120, placement: 'top' }}
        shouldShow={({ editor, from, to }) => from !== to && !editor.isActive('image')}
      >
        <div className="flex items-center gap-0.5 bg-gray-900 rounded-xl shadow-xl p-1">
          <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold size={13} />
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic size={13} />
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike">
            <Strikethrough size={13} />
          </BubbleBtn>
          <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
            <Code size={13} />
          </BubbleBtn>
          <BubbleSep />
          <button
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run() }}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${editor.isActive('heading', { level: 1 }) ? 'bg-white text-gray-900' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            title="H1"
          >H1</button>
          <button
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run() }}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-white text-gray-900' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            title="H2"
          >H2</button>
          <BubbleSep />
          <BubbleBtn onClick={() => setModal('link')} active={editor.isActive('link')} title="লিংক">
            <LinkIcon size={13} />
          </BubbleBtn>
          {editor.isActive('link') && (
            <BubbleBtn onClick={() => editor.chain().focus().unsetLink().run()} title="লিংক সরান">
              <X size={13} />
            </BubbleBtn>
          )}
        </div>
      </BubbleMenu>

      {/* Slash Command Menu */}
      {slashMenu && (
        <div
          ref={slashRef}
          className="absolute z-30 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: slashPos.x, top: slashPos.y }}
        >
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Block যোগ করুন</p>
          {SLASH_ITEMS.map((item) => (
            <button
              key={item.label}
              onMouseDown={e => { e.preventDefault(); runSlash(item.cmd) }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 shrink-0">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Editor Canvas */}
      <div className="relative min-h-[480px] ve-canvas">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ve-canvas .ProseMirror {
          outline: none;
          font-size: 17px;
          line-height: 1.85;
          color: #313334;
        }
        .ve-canvas .ProseMirror p {
          margin: 0.6rem 0;
        }
        .ve-canvas .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #c0bebe;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        .ve-canvas .ProseMirror h1 {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 2rem;
          font-weight: 700;
          color: #1a1b1c;
          margin: 1.75rem 0 0.5rem;
          line-height: 1.2;
        }
        .ve-canvas .ProseMirror h2 {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1a1b1c;
          margin: 1.4rem 0 0.4rem;
          line-height: 1.3;
        }
        .ve-canvas .ProseMirror h3 {
          font-family: 'Newsreader', Georgia, serif;
          font-size: 1.2rem;
          font-weight: 600;
          color: #1a1b1c;
          margin: 1.2rem 0 0.35rem;
        }
        .ve-canvas .ProseMirror blockquote {
          border-left: 3px solid #dcdad9;
          padding-left: 1.25rem;
          color: #5e5f61;
          font-style: italic;
          margin: 1.25rem 0;
          font-size: 1.05rem;
        }
        .ve-canvas .ProseMirror ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }
        .ve-canvas .ProseMirror ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin: 0.75rem 0;
        }
        .ve-canvas .ProseMirror li { margin: 0.25rem 0; }
        .ve-canvas .ProseMirror code {
          background: #efedee;
          color: #585f64;
          padding: 0.1em 0.4em;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: 'Courier New', monospace;
        }
        .ve-canvas .ProseMirror pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .ve-canvas .ProseMirror pre code {
          background: none;
          color: inherit;
          padding: 0;
          font-size: 0.88em;
        }
        .ve-canvas .ProseMirror hr {
          border: none;
          border-top: 1px solid #e4e2e1;
          margin: 2rem 0;
        }
        .ve-canvas .ProseMirror a {
          color: #dc2626;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .ve-canvas .ProseMirror img,
        .ve-canvas .ProseMirror .ve-img {
          max-width: 100%;
          border-radius: 0.75rem;
          margin: 1rem 0;
          display: block;
        }
        .ve-canvas .ProseMirror .youtube-wrapper {
          margin: 1.5rem 0;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .ve-canvas .ProseMirror > *:first-child { margin-top: 0; }
        .ve-canvas .ProseMirror strong { font-weight: 700; color: #1a1b1c; }
        .ve-canvas .ProseMirror em { font-style: italic; color: #5e5f61; }
        .ve-canvas .ProseMirror s { text-decoration: line-through; color: #9e9fa0; }
      `}</style>
    </div>
  )
}
