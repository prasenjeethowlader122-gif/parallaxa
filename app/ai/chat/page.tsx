'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import { slabo, spacegrotesk } from '@/lib/font'
import { ArrowRight, Brain, ChevronRight, AlertCircle, Info, CheckCircle, Copy, Check } from 'lucide-react'
import { useState, useRef, KeyboardEvent, useEffect, useCallback, ComponentPropsWithoutRef } from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  from: 'ai' | 'user'
  content: string
}

type Segment =
  | { type: 'text'; content: string }
  | { type: 'think'; content: string }
  | { type: 'tool_call'; tool: string; args: string }
  | { type: 'tool_result' }

interface ToolPair {
  tool: string
  args: string
  done: boolean
  summary: string
}

// ─── MDX Compound Components ──────────────────────────────────────────────────

/** <Callout variant="info|warn|success|error"> */
function Callout({
  variant = 'info',
  children,
}: {
  variant?: 'info' | 'warn' | 'success' | 'error'
  children?: React.ReactNode
}) {
  const map = {
    info:    { icon: Info,          bg: 'bg-blue-50',   border: 'border-blue-200',  text: 'text-blue-800'  },
    warn:    { icon: AlertCircle,   bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-800' },
    success: { icon: CheckCircle,   bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800' },
    error:   { icon: AlertCircle,   bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-800'   },
  }
  const { icon: Icon, bg, border, text } = map[variant]
  return (
    <div className={`flex gap-2.5 rounded-lg border px-3.5 py-3 my-2 ${bg} ${border}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${text}`} />
      <div className={`text-sm leading-relaxed ${text}`}>{children}</div>
    </div>
  )
}

/** <Steps> + <Step> */
function Steps({ children }: { children?: React.ReactNode }) {
  return <ol className="flex flex-col gap-3 my-3 pl-0 list-none">{children}</ol>
}

function Step({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
        ✓
      </span>
      <div className="flex flex-col gap-0.5">
        {title && <span className="font-semibold text-sm text-gray-900">{title}</span>}
        <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
      </div>
    </li>
  )
}

/** <Tabs labels="Tab A,Tab B"> <Tab>…</Tab> <Tab>…</Tab> </Tabs> */
function Tabs({ labels = '', children }: { labels?: string; children?: React.ReactNode }) {
  const tabs = labels.split(',').map((l) => l.trim())
  const [active, setActive] = useState(0)
  const panels = Array.isArray(children) ? children : [children]
  return (
    <div className="my-3 rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((label, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              i === active
                ? 'bg-white text-gray-900 border-b-2 border-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-3">{panels[active]}</div>
    </div>
  )
}

function Tab({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>
}

// ─── MDX-style code block with copy button ────────────────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[0.8em] font-mono">
        {children}
      </code>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-950 text-gray-100">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Compound component resolver ──────────────────────────────────────────────

/**
 * MDX uses JSX syntax. Since we're staying in react-markdown land,
 * we support a lightweight directive-style syntax in the raw text:
 *
 *   ::callout{variant="info"}
 *   Some text here
 *   ::
 *
 *   ::steps
 *   ::step{title="First"}Content::
 *   ::
 *
 *   ::tabs{labels="A,B"}
 *   ::tab
 *   Content A
 *   ::tab
 *   Content B
 *   ::
 *
 * These are parsed out before the markdown renderer and replaced
 * with real React components.
 */

interface DirectiveNode {
  tag: string
  attrs: Record<string, string>
  children: (string | DirectiveNode)[]
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /(\w+)="([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2]
  }
  return attrs
}

// ─── Rich markdown component map (for react-markdown) ────────────────────────

const mdxComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-5 mb-2 leading-tight tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-gray-900 mt-4 mb-2 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-800 mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-800 leading-relaxed my-1.5">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 flex flex-col gap-1 text-sm text-gray-800">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 flex flex-col gap-1 text-sm text-gray-800">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-300 pl-4 my-2 text-gray-600 italic text-sm">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50 text-gray-700">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-gray-800">{children}</td>,
  hr: () => <hr className="my-4 border-gray-200" />,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors"
    >
      {children}
    </a>
  ),
}

// ─── Directive parser & renderer ──────────────────────────────────────────────

type ContentChunk =
  | { kind: 'md'; text: string }
  | { kind: 'callout'; variant: string; body: string }
  | { kind: 'steps'; items: { title: string; body: string }[] }
  | { kind: 'tabs'; labels: string; panels: string[] }

function splitDirectives(raw: string): ContentChunk[] {
  const chunks: ContentChunk[] = []
  let cursor = 0

  // Simple regex for our three directives
  const directiveRe = /^::(callout|steps|tabs)(\{[^}]*\})?\n([\s\S]*?)^::/gm

  let match: RegExpExecArray | null
  while ((match = directiveRe.exec(raw)) !== null) {
    if (match.index > cursor) {
      chunks.push({ kind: 'md', text: raw.slice(cursor, match.index) })
    }

    const tag = match[1]
    const attrsRaw = match[2] ?? ''
    const attrs = parseAttrs(attrsRaw)
    const body = match[3]

    if (tag === 'callout') {
      chunks.push({ kind: 'callout', variant: attrs.variant ?? 'info', body: body.trim() })
    } else if (tag === 'steps') {
      // each step: ::step{title="…"} content ::
      const stepRe = /::step(\{[^}]*\})?\n([\s\S]*?)(?=::step|$)/g
      const items: { title: string; body: string }[] = []
      let sm: RegExpExecArray | null
      while ((sm = stepRe.exec(body)) !== null) {
        const sAttrs = parseAttrs(sm[1] ?? '')
        items.push({ title: sAttrs.title ?? '', body: sm[2].trim() })
      }
      // fallback: plain list items
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

  if (cursor < raw.length) {
    chunks.push({ kind: 'md', text: raw.slice(cursor) })
  }

  return chunks
}

function RenderChunks({ text }: { text: string }) {
  const chunks = splitDirectives(text)

  return (
    <>
      {chunks.map((chunk, i) => {
        if (chunk.kind === 'md') {
          return (
            <Markdown
              key={i}
              className="min-w-full"
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

// ─── Segment parser ───────────────────────────────────────────────────────────

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = []
  let remaining = raw

  while (remaining.length > 0) {
    const thinkStart = remaining.indexOf('<think>')
    const toolCallIdx = remaining.indexOf('\n\n>**Calling tool:**')
    const toolResultIdx = remaining.indexOf('\n\n>**Tool result received**')

    const candidates = [
      thinkStart !== -1 ? thinkStart : Infinity,
      toolCallIdx !== -1 ? toolCallIdx : Infinity,
      toolResultIdx !== -1 ? toolResultIdx : Infinity,
    ]
    const earliest = Math.min(...candidates)

    if (earliest === Infinity) {
      if (remaining.trim()) segments.push({ type: 'text', content: remaining })
      break
    }

    if (earliest > 0) {
      const before = remaining.slice(0, earliest)
      if (before.trim()) segments.push({ type: 'text', content: before })
    }

    if (earliest === thinkStart) {
      const thinkEnd = remaining.indexOf('</think>', thinkStart + 7)
      if (thinkEnd === -1) {
        const content = remaining.slice(thinkStart + 7)
        if (content) segments.push({ type: 'think', content })
        remaining = ''
      } else {
        const content = remaining.slice(thinkStart + 7, thinkEnd)
        segments.push({ type: 'think', content })
        remaining = remaining.slice(thinkEnd + 8)
      }
    } else if (earliest === toolCallIdx) {
      const lineEnd = remaining.indexOf('\n', toolCallIdx + 2)
      const line =
        lineEnd === -1 ? remaining.slice(toolCallIdx + 2) : remaining.slice(toolCallIdx + 2, lineEnd)
      const toolMatch = line.match(/>\*\*Calling tool:\*\* `([^`]+)` with (.*)/)
      const tool = toolMatch?.[1] ?? 'unknown'
      const args = toolMatch?.[2] ?? ''
      segments.push({ type: 'tool_call', tool, args })
      remaining = lineEnd === -1 ? '' : remaining.slice(lineEnd)
    } else {
      const lineEnd = remaining.indexOf('\n', toolResultIdx + 2)
      segments.push({ type: 'tool_result' })
      remaining = lineEnd === -1 ? '' : remaining.slice(lineEnd)
    }
  }

  return segments
}

// ─── Group tool calls + results ───────────────────────────────────────────────

function groupToolPairs(segments: Segment[]): ToolPair[] {
  const pairs: ToolPair[] = []
  for (const seg of segments) {
    if (seg.type === 'tool_call') {
      pairs.push({ tool: seg.tool, args: seg.args, done: false, summary: 'running…' })
    } else if (seg.type === 'tool_result') {
      const pendingIdx = pairs.findIndex((p) => !p.done)
      if (pendingIdx !== -1) {
        pairs[pendingIdx].done = true
        pairs[pendingIdx].summary = 'done'
      }
    }
  }
  return pairs
}

// ─── Think block ──────────────────────────────────────────────────────────────

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
      >
        <Brain className="w-3 h-3 flex-shrink-0" />
        <span className="italic">thinking</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <p className="mt-1 pl-4 text-[11px] text-gray-400 italic leading-relaxed whitespace-pre-wrap border-l border-gray-200">
          {content}
        </p>
      )}
    </div>
  )
}

// ─── Tool feed ────────────────────────────────────────────────────────────────

function ToolFeed({ pairs }: { pairs: ToolPair[] }) {
  const [open, setOpen] = useState(false)
  if (pairs.length === 0) return null
  const label = `${pairs.length} tool${pairs.length > 1 ? 's' : ''} used`
  return (
    <div className="my-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
      >
        <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span>{label}</span>
      </button>
      {open && (
        <div className="mt-1 pl-4 flex flex-col gap-0.5">
          {pairs.map((p, i) => (
            <div key={i} className="flex items-baseline gap-0 text-[11px] whitespace-nowrap overflow-hidden">
              <div className="text-gray-400 flex-shrink-0 h-5 w-3 bg-transparent border-l border-b-2 border-gray-300 rounded-bl" />
              <span className="font-mono text-gray-500 flex-shrink-0">{p.tool}</span>
              <span className="text-gray-300 px-1.5 flex-shrink-0">·</span>
              <span className="font-mono text-gray-400 overflow-hidden text-ellipsis flex-1 min-w-0">{p.args}</span>
              <span className="text-gray-300 pl-2 flex-shrink-0">{p.done ? 'done' : 'running…'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MessageContent (MDX-powered) ────────────────────────────────────────────

function MessageContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  if (!content) {
    return <span className="text-gray-400 italic text-xs">Typing…</span>
  }

  const segments = parseSegments(content)

  if (segments.length === 0) {
    return <span className="text-gray-400 italic text-xs">Typing…</span>
  }

  const toolPairs = groupToolPairs(segments)
  const hasTools = toolPairs.length > 0

  return (
    <div className={`flex flex-col gap-1 min-w-full pt-2 ${spacegrotesk.className}`}>
      {segments
        .filter((s) => s.type === 'think')
        .map((s, i) => (s.type === 'think' ? <ThinkBlock key={i} content={s.content} /> : null))}

      {hasTools && <ToolFeed pairs={toolPairs} />}

      {segments
        .filter((s) => s.type === 'text')
        .map((s, i) =>
          s.type === 'text' && s.content.trim() ? (
            <RenderChunks key={i} text={s.content} />
          ) : null
        )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamBufferRef = useRef('')
  const rafRef = useRef<number | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleSubmit = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || isLoading) return

    const historySnapshot = messages.map((m) => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const userMsg: Message = { from: 'user', content: trimmedQuery }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...historySnapshot, { role: 'user', content: trimmedQuery }],
          model: '@cf/moonshotai/kimi-k2.5',
          temperature: 0.7,
        }),
      })

      if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      setMessages((prev) => [...prev, { from: 'ai', content: '' }])
      streamBufferRef.current = ''

      const scheduleFlush = () => {
        if (rafRef.current !== null) return
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          const buffered = streamBufferRef.current
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.from === 'ai') next[next.length - 1] = { ...last, content: buffered }
            return next
          })
        })
      }

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) { streamBufferRef.current += parsed.content; scheduleFlush() }
            } catch { /* skip malformed */ }
          }
        }

        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        const finalContent = streamBufferRef.current
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.from === 'ai') next[next.length - 1] = { ...last, content: finalContent }
          return next
        })
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        { from: 'ai', content: 'Sorry, I encountered an error. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className={`flex-1 flex flex-col items-center overflow-hidden bg-white ${slabo.className}`}>
        <div className="flex-1 w-full flex flex-col items-center overflow-y-auto px-4 py-10">
          <div className="flex flex-col gap-6 w-full max-w-2xl">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-xl font-medium">How can I help you today?</p>
              </div>
            ) : (
              messages.map((m, index) => {
                const isLastAi = m.from === 'ai' && index === messages.length - 1
                return (
                  <div
                    key={index}
                    className={`flex min-w-full ${m.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`flex flex-col gap-1 max-w-[100%] text-md ${m.from === 'user' ? 'items-end' : 'items-start w-full'}`}>
                      <div className="flex items-center text-[11px] w-full">
                        {m.from === 'user' ? (
                          <div className="w-6 h-6 rounded-full bg-gray-200" title="User" />
                        ) : (
                          <div className="flex items-center justify-between border-t w-full pt-3">
                            <div className="flex items-center justify-start gap-2">
                              <PinwheelLoader size={35} isfill={true} isDone={!isLoading || !isLastAi} />
                              <p className="font-bold">Parallaxa</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`text-md text-gray-800 ${m.from === 'user' ? 'bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-sm whitespace-pre-wrap' : 'min-w-full'}`}>
                        {m.from === 'ai' ? (
                          <MessageContent content={m.content} isStreaming={isLastAi && isLoading} />
                        ) : (
                          <span>{m.content}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input */}
        <div className="w-full pt-4 pb-6 px-4 flex flex-col items-center bg-white border-t border-transparent">
          <div className="w-full max-w-xl">
            <div className={`flex flex-row items-center gap-2 bg-white rounded-full px-5 py-3 transition-all duration-200 ${focused ? 'shadow-lg ring-2 ring-gray-900/5' : 'shadow-md border border-gray-200'}`}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                disabled={isLoading}
                className="flex-1 outline-none border-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 min-w-0 disabled:opacity-60"
              />
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading}
                className={`rounded-full p-2 flex items-center justify-center transition-all duration-150 flex-shrink-0 ${query.trim() && !isLoading ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <ArrowRight className={`w-4 h-4 ${isLoading ? 'animate-spin opacity-50' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-3">
              Powered by Cloudflare AI (Kimi K2.5) with streaming responses
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
      `}</style>
    </div>
  )
}