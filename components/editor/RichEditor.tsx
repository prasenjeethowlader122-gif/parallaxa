'use client'

import { useRef } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

const TOOLS = [
  { group: 'format', items: [
    { label: 'B',    title: 'Bold',      wrap: ['**', '**'],         style: { fontWeight: 700 } },
    { label: 'I',    title: 'Italic',    wrap: ['*', '*'],           style: { fontStyle: 'italic' } },
    { label: 'S',    title: 'Strike',    wrap: ['~~', '~~'],         style: { textDecoration: 'line-through' } },
  ]},
  { group: 'heading', items: [
    { label: 'H1', title: 'Heading 1', prefix: '# ',    style: { fontSize: 11 } },
    { label: 'H2', title: 'Heading 2', prefix: '## ',   style: { fontSize: 11 } },
    { label: 'H3', title: 'Heading 3', prefix: '### ',  style: { fontSize: 11 } },
  ]},
  { group: 'block', items: [
    { label: '❝',   title: 'Blockquote', prefix: '> ', style: {} },
    { label: '</>',  title: 'Inline code', wrap: ['`', '`'], style: { fontFamily: 'monospace', fontSize: 11 } },
    { label: '```',  title: 'Code block', wrap: ['```\n', '\n```'], style: { fontFamily: 'monospace', fontSize: 10 } },
  ]},
  { group: 'list', items: [
    { label: '•—', title: 'Unordered list', prefix: '- ', style: {} },
    { label: '1.', title: 'Ordered list',   prefix: '1. ', style: { fontSize: 11 } },
  ]},
  { group: 'insert', items: [
    { label: '⎘',   title: 'Insert link',  insert: '[link text](https://)',  style: {} },
    { label: '⬚',   title: 'Insert image', insert: '![alt text](https://)', style: {} },
    { label: '—',   title: 'Horizontal rule', insert: '\n---\n', style: {} },
  ]},
]

export function RichEditor({ value, onChange, placeholder, minHeight = 340 }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function applyTool(tool: {
    wrap?: [string, string]
    prefix?: string
    insert?: string
  }) {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const selected = value.slice(start, end)
    let next = value
    let cursor = start

    if (tool.insert) {
      next   = value.slice(0, start) + tool.insert + value.slice(end)
      cursor = start + tool.insert.length
    } else if (tool.wrap) {
      const [pre, post] = tool.wrap
      next   = value.slice(0, start) + pre + selected + post + value.slice(end)
      cursor = start + pre.length + selected.length + post.length
    } else if (tool.prefix) {
      // Prefix each selected line
      const before  = value.slice(0, start)
      const middle  = value.slice(start, end)
      const after   = value.slice(end)
      const lines   = middle ? middle.split('\n').map(l => tool.prefix + l).join('\n') : tool.prefix
      next   = before + lines + after
      cursor = start + lines.length
    }

    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '6px 10px',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          background: 'var(--hover-bg)',
          flexWrap: 'wrap',
        }}
      >
        {TOOLS.map((group, gi) => (
          <div key={group.group} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {gi > 0 && (
              <div
                style={{
                  width: 1,
                  height: 20,
                  background: 'var(--border)',
                  margin: '0 6px',
                }}
              />
            )}
            {group.items.map(tool => (
              <button
                key={tool.label}
                title={tool.title}
                onMouseDown={e => {
                  e.preventDefault()
                  applyTool(tool)
                }}
                style={{
                  width: 30,
                  height: 28,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderRadius: 5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  transition: 'background 0.1s, color 0.1s',
                  ...tool.style,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.background = 'var(--card-bg)'
                  el.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.background = 'transparent'
                  el.style.color = 'var(--text-secondary)'
                }}
              >
                {tool.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          minHeight,
          padding: '18px 20px',
          fontSize: 14,
          lineHeight: 1.8,
          color: 'var(--text-primary)',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          outline: 'none',
          resize: 'vertical',
          fontFamily: "'DM Mono', monospace",
          transition: 'border-color 0.12s',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--text-secondary)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}
