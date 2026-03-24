'use client'

import { Header } from '@/components/header'
import { ArrowRight, Paperclip, X, Globe, Code2, FileText, CloudSun, Link } from 'lucide-react'
import { useState, useRef, KeyboardEvent, useCallback } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  from: 'ai' | 'user'
  content: string
  file?: AttachedFile
}

interface AttachedFile {
  name: string
  size: number
  type: string
  base64: string
}

const TOOL_ICONS: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  web_search:  { icon: <Globe  className="w-3 h-3" />, label: 'Web Search',  color: 'text-blue-500  bg-blue-50  border-blue-100' },
  fetch_url:   { icon: <Link   className="w-3 h-3" />, label: 'Fetching URL', color: 'text-violet-500 bg-violet-50 border-violet-100' },
  run_code:    { icon: <Code2  className="w-3 h-3" />, label: 'Running Code', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
  read_file:   { icon: <FileText className="w-3 h-3"/>, label: 'Reading File', color: 'text-amber-500  bg-amber-50  border-amber-100' },
  get_weather: { icon: <CloudSun className="w-3 h-3"/>, label: 'Weather',     color: 'text-sky-500    bg-sky-50    border-sky-100' },
}

// Parse tool-call markers out of streaming text so we can render them nicely
function parseContent(raw: string): Array<{ type: 'text' | 'tool'; text?: string; toolName?: string; toolArgs?: string; toolResult?: string }> {
  const segments: ReturnType<typeof parseContent> = []
  // Matches: > 🔧 **Calling tool:** `name` with {...}
  const toolCallRe = /> 🔧 \*\*Calling tool:\*\* `([^`]+)` with (\{[^}]*\})/g
  const toolResultRe = /> ✅ \*\*Tool result received\*\*/g

  let lastIdx = 0
  // Split on tool-status lines
  const allMatches: Array<{ index: number; end: number; type: 'call' | 'result'; name?: string; args?: string }> = []

  let m
  while ((m = toolCallRe.exec(raw)) !== null) {
    allMatches.push({ index: m.index, end: m.index + m[0].length, type: 'call', name: m[1], args: m[2] })
  }
  const reCopy = /> ✅ \*\*Tool result received\*\*/g
  while ((m = reCopy.exec(raw)) !== null) {
    allMatches.push({ index: m.index, end: m.index + m[0].length, type: 'result' })
  }
  allMatches.sort((a, b) => a.index - b.index)

  for (const match of allMatches) {
    if (match.index > lastIdx) {
      const text = raw.slice(lastIdx, match.index).trim()
      if (text) segments.push({ type: 'text', text })
    }
    if (match.type === 'call') {
      segments.push({ type: 'tool', toolName: match.name, toolArgs: match.args })
    }
    lastIdx = match.end
  }

  const remaining = raw.slice(lastIdx).trim()
  if (remaining) segments.push({ type: 'text', text: remaining })

  return segments.length ? segments : [{ type: 'text', text: raw }]
}

export default function AiInterfaceChat() {
  const [query, setQuery]       = useState('')
  const [focused, setFocused]   = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile]         = useState<AttachedFile | null>(null)
  const [dragging, setDragging] = useState(false)

  const inputRef      = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const readFileAsBase64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader()
      r.onload  = () => res((r.result as string).split(',')[1])
      r.onerror = () => rej(new Error('Read failed'))
      r.readAsDataURL(f)
    })

  const handleFileAttach = async (f: File) => {
    const base64 = await readFileAsBase64(f)
    setFile({ name: f.name, size: f.size, type: f.type, base64 })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileAttach(f)
  }, [])

  const handleSubmit = async () => {
    const trimmed = query.trim()
    if ((!trimmed && !file) || isLoading) return

    const userContent = trimmed + (file ? `\n\n[Attached file: ${file.name}]` : '')
    const userMsg: Message = { from: 'user', content: userContent, file: file ?? undefined }
    setMessages(prev => [...prev, userMsg])
    setQuery('')
    const attachedFile = file
    setFile(null)
    setIsLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

      // Inject file info into the message
      const lastUserContent = attachedFile
        ? `${trimmed}\n\n[File attached: ${attachedFile.name} (${attachedFile.type}). Base64 content below]\n${attachedFile.base64.slice(0, 500)}…`
        : trimmed

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: lastUserContent }],
          temperature: 0.7,
        }),
      })

      if (!response.ok) throw new Error(response.statusText)

      const reader  = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''

      setMessages(prev => [...prev, { from: 'ai', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of decoder.decode(value).split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                aiContent += parsed.content
                setMessages(prev => {
                  const copy = [...prev]
                  if (copy[copy.length - 1].from === 'ai') copy[copy.length - 1].content = aiContent
                  return copy
                })
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { from: 'ai', content: '**Error:** Something went wrong. Please try again.' }])
    } finally {
      setIsLoading(false)
      scrollToBottom()
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <div
      className="min-h-screen bg-[#f9f8f6] flex flex-col font-[system-ui]"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <Header />

      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-indigo-500/10 border-4 border-dashed border-indigo-400 flex items-center justify-center">
          <p className="text-indigo-600 font-semibold text-lg">Drop file to attach</p>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center overflow-hidden">

        {/* Messages */}
        <div className="flex-1 w-full overflow-y-auto px-4 py-10">
          <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              messages.map((m, i) => <MessageBubble key={i} m={m} />)
            )}
            {isLoading && messages[messages.length - 1]?.from !== 'ai' && (
              <TypingIndicator />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="w-full pb-6 px-4 flex flex-col items-center gap-2">

          {/* File badge */}
          {file && (
            <div className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm text-gray-700">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
              <button onClick={() => setFile(null)} className="ml-1 text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="w-full max-w-2xl">
            <div className={`flex items-center gap-2 bg-white rounded-2xl px-4 py-3 transition-all duration-200 ${
              focused ? 'shadow-lg ring-2 ring-gray-900/8' : 'shadow-md border border-gray-200'
            }`}>
              {/* File attach */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileAttach(f) }}
              />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, paste a URL, or attach a file…"
                disabled={isLoading}
                className="flex-1 outline-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 disabled:opacity-60"
              />

              <button
                onClick={handleSubmit}
                disabled={(!query.trim() && !file) || isLoading}
                className={`flex-shrink-0 rounded-xl p-2 flex items-center justify-center transition-all duration-150 ${
                  (query.trim() || file) && !isLoading
                    ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ArrowRight className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-2">
              Parallaxa.ai · Powered by Kimi K2.5 · Tool-calling enabled
            </p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-enter { animation: fade-up 0.25s ease forwards; }
        @keyframes blink { 0%,100%{opacity:.3} 50%{opacity:1} }
        .dot { animation: blink 1.2s ease-in-out infinite; }
        .dot:nth-child(2){animation-delay:.2s}
        .dot:nth-child(3){animation-delay:.4s}
      `}</style>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState() {
  const tools = [
    { icon: <Globe className="w-4 h-4" />, label: 'Web search' },
    { icon: <Code2 className="w-4 h-4" />, label: 'Run code' },
    { icon: <Paperclip className="w-4 h-4" />, label: 'Read files' },
    { icon: <CloudSun className="w-4 h-4" />, label: 'Get weather' },
    { icon: <Link className="w-4 h-4" />, label: 'Fetch URLs' },
  ]
  return (
    <div className="text-center py-16 msg-enter">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">How can I help?</h2>
      <p className="text-sm text-gray-500 mb-8">I can search the web, run code, read files, and more.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {tools.map(t => (
          <span key={t.label} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm">
            {t.icon} {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start msg-enter">
      <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-white text-[10px] font-bold">P</span>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex gap-1.5 items-center">
        <span className="dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
        <span className="dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
        <span className="dot w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
      </div>
    </div>
  )
}

function ToolBadge({ name }: { name: string }) {
  const info = TOOL_ICONS[name] || { icon: <Code2 className="w-3 h-3" />, label: name, color: 'text-gray-500 bg-gray-50 border-gray-100' }
  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${info.color} my-1`}>
      {info.icon}
      <span>{info.label}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-pulse"></span>
    </div>
  )
}

function MessageBubble({ m }: { m: Message }) {
  const isUser = m.from === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end msg-enter">
        <div className="max-w-[78%]">
          {m.file && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1 justify-end">
              <Paperclip className="w-3 h-3" /> {m.file.name}
            </div>
          )}
          <div className="bg-gray-900 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2.5 leading-relaxed">
            {m.content.replace(/\n\n\[Attached file:.*?\]/, '')}
          </div>
        </div>
      </div>
    )
  }

  // AI message — parse tool calls
  const segments = parseContent(m.content)

  return (
    <div className="flex gap-3 items-start msg-enter">
      <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-white text-[10px] font-bold">P</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 mb-1.5 font-medium">Parallaxa.ai</p>
        <div className="flex flex-col gap-1">
          {segments.map((seg, i) => {
            if (seg.type === 'tool') {
              return <ToolBadge key={i} name={seg.toolName || ''} />
            }
            if (!seg.text) return null
            return (
              <div key={i} className="prose prose-sm max-w-none text-gray-800">
                <Markdown remarkPlugins={[remarkGfm]}>{seg.text}</Markdown>
              </div>
            )
          })}
          {!m.content && (
            <span className="text-gray-400 text-sm italic">Thinking…</span>
          )}
        </div>
      </div>
    </div>
  )
}