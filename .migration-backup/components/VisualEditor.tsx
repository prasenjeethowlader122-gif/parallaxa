'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Youtube from '@tiptap/extension-youtube'
import { useEffect, useRef } from 'react'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import { marked } from 'marked'
import {
  Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2,
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
  Undo, Redo, Code, Minus
} from 'lucide-react'

interface VisualEditorProps {
  content: string
  onChange: (content: string) => void
}

const MenuButton = ({ onClick, active, disabled, children, title }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded-lg transition-all ${
      active
        ? 'bg-gray-900 text-white'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    } disabled:opacity-30`}
  >
    {children}
  </button>
)

export default function VisualEditor({ content, onChange }: VisualEditorProps) {
  const turndownRef = useRef<TurndownService | null>(null);

  if (!turndownRef.current) {
    turndownRef.current = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    turndownRef.current.use(gfm);
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Youtube,
      Placeholder.configure({
        placeholder: 'Start writing your story...',
      }),
    ],
    content: marked.parse(content) as string,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownRef.current?.turndown(html);
      if (markdown !== undefined) {
        onChange(markdown);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px]',
      },
    },
  })

  // Keep editor content in sync with external Markdown changes
  useEffect(() => {
    if (editor) {
      const currentHtml = editor.getHTML();
      const newHtml = marked.parse(content) as string;

      // We compare the markdown version to avoid trivial HTML differences causing jumps
      const currentMarkdown = turndownRef.current?.turndown(currentHtml);
      if (currentMarkdown !== content) {
        editor.commands.setContent(newHtml, false);
      }
    }
  }, [content, editor])

  if (!editor) return null

  const addYoutubeVideo = () => {
    const url = prompt('Enter YouTube URL')
    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: 640,
        height: 480,
      })
    }
  }

  const addImage = () => {
    const url = prompt('Enter Image URL')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const setLink = () => {
    const url = prompt('Enter URL')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          <Code size={18} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-100 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-100 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote size={18} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-100 mx-1" />

        <MenuButton onClick={setLink} active={editor.isActive('link')} title="Link">
          <LinkIcon size={18} />
        </MenuButton>
        <MenuButton onClick={addImage} title="Image">
          <ImageIcon size={18} />
        </MenuButton>
        <MenuButton onClick={addYoutubeVideo} title="YouTube">
          <YoutubeIcon size={18} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
          <Minus size={18} />
        </MenuButton>

        <div className="flex-1" />

        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={18} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={18} />
        </MenuButton>
      </div>

      <div className="min-h-[500px] border border-transparent rounded-xl">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror {
            outline: none !important;
        }
        .ProseMirror blockquote {
            border-left: 3px solid #ddd;
            padding-left: 1rem;
            color: #666;
        }
      `}</style>
    </div>
  )
}
