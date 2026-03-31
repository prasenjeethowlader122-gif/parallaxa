'use client'

import { useRef, useState, ComponentPropsWithoutRef } from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'
import { Copy, Check, AlertCircle, Info, CheckCircle } from 'lucide-react'
import 'katex/dist/katex.min.css'

// ─── MDX Compound Components (ported from chat/page.tsx) ──────────────────────

function Callout({
  variant = 'info',
  children,
}: {
  variant?: 'info' | 'warn' | 'success' | 'error'
  children?: React.ReactNode
}) {
  const map = {
    info:    { icon: Info,        bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
    warn:    { icon: AlertCircle, bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    success: { icon: CheckCircle, bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    error:   { icon: AlertCircle, bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  }
  const { icon: Icon, bg, border, text } = map[variant]
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        borderRadius: 8,
        border: `1px solid ${border}`,
        padding: '10px 14px',
        margin: '8px 0',
        background: bg,
      }}
    >
      <Icon style={{ width: 15, height: 15, marginTop: 2, flexShrink: 0, color: text }} />
      <div style={{ fontSize: 13, lineHeight: 1.6, color: text }}>{children}</div>
    </div>
  )
}

function Steps({ children }: { children?: React.ReactNode }) {
  return (
    <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '10px 0', padding: 0, listStyle: 'none' }}>
      {children}
    </ol>
  )
}

function Step({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'var(--text-primary)',
          color: 'var(--bg-primary)',
          fontSize: 9,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        ✓
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {title && (
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{title}</span>
        )}
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{children}</span>
      </div>
    </li>
  )
}

function Tabs({ labels = '', children }: { labels?: string; children?: React.ReactNode }) {
  const tabs = labels.split(',').map((l) => l.trim())
  const [active, setActive] = useState(0)
  const panels = Array.isArray(children) ? children : [children]
  return (
    <div
      style={{
        margin: '10px 0',
        borderRadius: 8,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--hover-bg)',
        }}
      >
        {tabs.map((label, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              borderBottom: i === active ? '2px solid var(--text-primary)' : '2px solid transparent',
              marginBottom: -1,
              background: i === active ? 'var(--card-bg)' : 'transparent',
              color: i === active ? 'var(--text-primary)' : 'var(--text-tertiary)',
              transition: 'color 0.12s',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ padding: 12 }}>{panels[active]}</div>
    </div>
  )
}

function Tab({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>
}

// ─── Code block with copy button (from chat/page.tsx) ─────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code
        style={{
          background: 'var(--hover-bg)',
          color: 'var(--text-primary)',
          padding: '1px 6px',
          borderRadius: 4,
          fontSize: '0.82em',
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {children}
      </code>
    )
  }

  return (
    <div
      style={{
        margin: '10px 0',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #30363d',
        background: '#0d1117',
        color: '#e6edf3',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 14px',
          background: '#161b22',
          borderBottom: '1px solid #30363d',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: "'DM Mono', monospace",
            color: '#8b949e',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {lang}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code.trim())
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            color: copied ? '#3fb950' : '#8b949e',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
            transition: 'color 0.15s',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          overflowX: 'auto',
          padding: '12px 16px',
          margin: 0,
          fontSize: 13,
          lineHeight: 1.7,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Markdown component map (mirrors chat/page.tsx mdxComponents) ─────────────

const mdxComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '18px 0 6px', lineHeight: 1.3, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '14px 0 4px', lineHeight: 1.35 }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '10px 0 3px' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.8, margin: '5px 0' }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingLeft: 20, margin: '5px 0', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14, color: 'var(--text-primary)' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: 20, margin: '5px 0', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14, color: 'var(--text-primary)' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ lineHeight: 1.7 }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid var(--border)', paddingLeft: 14, margin: '8px 0', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 14 }}>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '10px 0', borderRadius: 8, border: '1px solid var(--border)' }}>
      <table style={{ minWidth: '100%', fontSize: 13, borderCollapse: 'collapse' }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr style={{ borderBottom: '1px solid var(--border)' }}>{children}</tr>,
  th: ({ children }) => <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: '7px 12px', color: 'var(--text-primary)' }}>{children}</td>,
  hr: () => <hr style={{ margin: '14px 0', borderColor: 'var(--border)', borderStyle: 'solid' }} />,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', textUnderlineOffset: 2 }}>
      {children}
    </a>
  ),
}

// ─── Directive parser (from chat/page.tsx) ────────────────────────────────────

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /(\w+)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) attrs[m[1]] = m[2]
  return attrs
}

type ContentChunk =
  | { kind: 'md'; text: string }
  | { kind: 'callout'; variant: string; body: string }
  | { kind: 'steps'; items: { title: string; body: string }[] }
  | { kind: 'tabs'; labels: string; panels: string[] }

function splitDirectives(raw: string): ContentChunk[] {
  const chunks: ContentChunk[] = []
  let cursor = 0
  const directiveRe = /^::(callout|steps|tabs)(\{[^}]*\})?\n([\s\S]*?)^::/gm
  let match: RegExpExecArray | null

  while ((match = directiveRe.exec(raw)) !== null) {
    if (match.index > cursor) chunks.push({ kind: 'md', text: raw.slice(cursor, match.index) })

    const tag = match[1]
    const attrs = parseAttrs(match[2] ?? '')
    const body = match[3]

    if (tag === 'callout') {
      chunks.push({ kind: 'callout', variant: attrs.variant ?? 'info', body: body.trim() })
    } else if (tag === 'steps') {
      const stepRe = /::step(\{[^}]*\})?\n([\s\S]*?)(?=::step|$)/g
      const items: { title: string; body: string }[] = []
      let sm: RegExpExecArray | null
      while ((sm = stepRe.exec(body)) !== null) {
        const sAttrs = parseAttrs(sm[1] ?? '')
        items.push({ title: sAttrs.title ?? '', body: sm[2].trim() })
      }
      if (items.length === 0) {
        body.split('\n').filter(Boolean).forEach((line) => {
          items.push({ title: '', body: line.replace(/^[-*]\s*/, '') })
        })
      }
      chunks.push({ kind: 'steps', items })
    } else if (tag === 'tabs') {
      const panels = body.split(/^::tab\n/m).filter(Boolean)
      chunks.push({ kind: 'tabs', labels: attrs.labels ?? '', panels })
    }

    cursor = match.index + match[0].length
  }

  if (cursor < raw.length) chunks.push({ kind: 'md', text: raw.slice(cursor) })
  return chunks
}

// ─── RenderChunks — exact same logic as chat/page.tsx ────────────────────────

function RenderChunks({ text }: { text: string }) {
  const chunks = splitDirectives(text)
  return (
    <>
      {chunks.map((chunk, i) => {
        if (chunk.kind === 'md') {
          return (
            <Markdown
              key={i}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={mdxComponents}
            >
              {chunk.text}
            </Markdown>
          )
        }
        if (chunk.kind === 'callout') {
          return (
            <Callout key={i} variant={chunk.variant as 'info' | 'warn' | 'success' | 'error'}>
              <Markdown remarkPlugins={[remarkGfm]} components={mdxComponents}>
                {chunk.body}
              </Markdown>
            </Callout>
          )
        }
        if (chunk.kind === 'steps') {
          return (
            <Steps key={i}>
              {chunk.items.map((item, j) => (
                <Step key={j} title={item.title}>
                  <Markdown remarkPlugins={[remarkGfm]} components={mdxComponents}>
                    {item.body}
                  </Markdown>
                </Step>
              ))}
            </Steps>
          )
        }
        if (chunk.kind === 'tabs') {
          return (
            <Tabs key={i} labels={chunk.labels}>
              {chunk.panels.map((panel, j) => (
                <Tab key={j}>
                  <Markdown remarkPlugins={[remarkGfm]} components={mdxComponents}>
                    {panel.trim()}
                  </Markdown>
                </Tab>
              ))}
            </Tabs>
          )
        }
        return null
      })}
    </>
  )
}

// ─── Toolbar definition ───────────────────────────────────────────────────────

const TOOLS = [
  {
    group: 'format',
    items: [
      { label: 'B',   title: 'Bold',           wrap: ['**', '**'] as [string, string], style: { fontWeight: 700 as const } },
      { label: 'I',   title: 'Italic',          wrap: ['*', '*'] as [string, string],   style: { fontStyle: 'italic' as const } },
      { label: 'S',   title: 'Strikethrough',   wrap: ['~~', '~~'] as [string, string], style: { textDecoration: 'line-through' as const } },
    ],
  },
  {
    group: 'heading',
    items: [
      { label: 'H1', title: 'Heading 1', prefix: '# ',   style: { fontSize: 11 } },
      { label: 'H2', title: 'Heading 2', prefix: '## ',  style: { fontSize: 11 } },
      { label: 'H3', title: 'Heading 3', prefix: '### ', style: { fontSize: 11 } },
    ],
  },
  {
    group: 'block',
    items: [
      { label: '❝',   title: 'Blockquote',  prefix: '> ',                              style: {} },
      { label: '</>',  title: 'Inline code', wrap: ['`', '`'] as [string, string],      style: { fontFamily: 'monospace', fontSize: 11 } },
      { label: '```',  title: 'Code block',  wrap: ['```\n', '\n```'] as [string, string], style: { fontFamily: 'monospace', fontSize: 10 } },
    ],
  },
  {
    group: 'list',
    items: [
      { label: '•—', title: 'Bullet list',  prefix: '- ',  style: {} },
      { label: '1.', title: 'Ordered list', prefix: '1. ', style: { fontSize: 11 } },
    ],
  },
  {
    group: 'directives',
    items: [
      { label: '📢', title: 'Insert Callout (info)',   insert: '::callout{variant="info"}\nYour message here.\n::',                                                                      style: {} },
      { label: '☑',  title: 'Insert Steps',            insert: '::steps\n::step{title="First step"}\nDescribe this step.\n::step{title="Second step"}\nDescribe this step.\n::',         style: { fontSize: 12 } },
      { label: '⇆',  title: 'Insert Tabs',             insert: '::tabs{labels="Tab A,Tab B"}\n::tab\nContent for Tab A.\n::tab\nContent for Tab B.\n::',                                  style: { fontSize: 12 } },
    ],
  },
  {
    group: 'math',
    items: [
      { label: '∑',   title: 'Inline math',  wrap: ['$', '$'] as [string, string],         style: { fontFamily: 'serif', fontSize: 14 } },
      { label: '∑∑',  title: 'Block math',   wrap: ['$$\n', '\n$$'] as [string, string],   style: { fontFamily: 'serif', fontSize: 11 } },
    ],
  },
  {
    group: 'insert',
    items: [
      { label: '⎘', title: 'Insert link',      insert: '[link text](https://)',  style: {} },
      { label: '⬚', title: 'Insert image',     insert: '![alt text](https://)', style: {} },
      { label: '—', title: 'Horizontal rule',   insert: '\n---\n',               style: {} },
    ],
  },
]

// ─── Main RichEditor component ────────────────────────────────────────────────

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
}

export function RichEditor({ value, onChange, placeholder, minHeight = 340 }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  function applyTool(tool: { wrap?: [string, string]; prefix?: string; insert?: string }) {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    let next = value
    let cursor = start

    if (tool.insert) {
      next = value.slice(0, start) + tool.insert + value.slice(end)
      cursor = start + tool.insert.length
    } else if (tool.wrap) {
      const [pre, post] = tool.wrap
      next = value.slice(0, start) + pre + selected + post + value.slice(end)
      cursor = start + pre.length + selected.length + post.length
    } else if (tool.prefix) {
      const before = value.slice(0, start)
      const middle = value.slice(start, end)
      const after = value.slice(end)
      const lines = middle
        ? middle.split('\n').map((l) => tool.prefix + l).join('\n')
        : tool.prefix!
      next = before + lines + after
      cursor = start + lines.length
    }

    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(cursor, cursor)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      applyTool({ insert: '  ' })
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--card-bg)' }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '5px 10px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--hover-bg)',
          flexWrap: 'wrap',
          rowGap: 4,
        }}
      >
        {TOOLS.map((group, gi) => (
          <div key={group.group} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {gi > 0 && (
              <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
            )}
            {group.items.map((tool) => (
              <button
                key={tool.label}
                title={tool.title}
                onMouseDown={(e) => { e.preventDefault(); applyTool(tool) }}
                style={{
                  minWidth: 28,
                  height: 27,
                  padding: '0 4px',
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--card-bg)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                {tool.label}
              </button>
            ))}
          </div>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Write / Preview toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: tab === t ? 'var(--text-primary)' : 'transparent',
                color: tab === t ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                transition: 'background 0.15s, color 0.15s',
                textTransform: 'capitalize',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Write pane ───────────────────────────────────────────────────── */}
      {tab === 'write' && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ??
            'Start writing…\n\n**bold**  *italic*  ## Heading  > blockquote\n```code block```  $inline math$\n\n::callout{variant="info"}\nCallout text\n::\n\n::steps\n::step{title="Step 1"}\nContent\n::'
          }
          style={{
            width: '100%',
            minHeight,
            padding: '18px 20px',
            fontSize: 14,
            lineHeight: 1.8,
            color: 'var(--text-primary)',
            background: 'var(--card-bg)',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            fontFamily: "'DM Mono', monospace",
            display: 'block',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.background = 'var(--bg-primary)')}
          onBlur={(e) => (e.target.style.background = 'var(--card-bg)')}
        />
      )}

      {/* ── Preview pane — uses the exact same RenderChunks as chat/page.tsx ── */}
      {tab === 'preview' && (
        <div style={{ minHeight, padding: '18px 20px', background: 'var(--card-bg)', overflowY: 'auto' }}>
          {value.trim() ? (
            <RenderChunks text={value} />
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', marginTop: 60 }}>
              Nothing to preview yet — start writing in the editor.
            </p>
          )}
        </div>
      )}

      {/* ── Footer hint ──────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '5px 14px',
          background: 'var(--hover-bg)',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}>
          **bold** · *italic* · ## heading · ```code``` · $math$
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}>
          ::callout · ::steps · ::tabs
        </span>
      </div>
    </div>
  )
}