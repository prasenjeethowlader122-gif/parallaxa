'use client'

import { Header } from '@/components/header'
import { ArrowUp, Globe, Paperclip, TrendingUp, Star, Newspaper, Zap, Lightbulb } from 'lucide-react'
import { useState, useRef, KeyboardEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SUGGESTIONS = [
  { text: "What's happening today?", icon: TrendingUp },
  { text: 'Featured stories', icon: Star },
  { text: 'Breaking news', icon: Newspaper },
  { text: 'Explain a concept', icon: Lightbulb },
]

export default function AiInterface() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const handleSubmit = () => {
    if (!query.trim()) return
    router.push(`/ai/chat?q=${encodeURIComponent(query.trim())}`)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSuggestion = (text: string) => {
    router.push(`/ai/chat?q=${encodeURIComponent(text)}`)
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [query])

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header includeTinker={false} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-10">

        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-xl font-bold uppercase tracking-tight text-neutral-900">
            Bangladesh Hindu Union
          </span>
          <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
            What do you want to know?
          </h1>
          <p className="text-neutral-500 text-base max-w-sm">
            Get instant answers with sources from across the web.
          </p>
        </div>

        {/* Search box */}
        <div className="w-full max-w-2xl">
          <div className={`relative border rounded-2xl bg-white transition-all ${
            focused || query
              ? 'border-neutral-300 shadow-lg'
              : 'border-neutral-200 shadow-md'
          }`}>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="w-full resize-none bg-transparent outline-none text-[15px] text-neutral-900 placeholder:text-neutral-400 px-5 pt-4 pb-14 leading-relaxed max-h-[160px] overflow-y-auto"
            />
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all">
                  <Globe className="w-3.5 h-3.5" />
                  Web search
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!query.trim()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  query.trim()
                    ? 'bg-neutral-900 text-white hover:bg-neutral-700 shadow-sm active:scale-95'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
          {SUGGESTIONS.map(({ text, icon: Icon }) => (
            <button
              key={text}
              onClick={() => handleSuggestion(text)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 transition-all text-sm text-neutral-600 font-medium shadow-sm"
            >
              <Icon className="w-3.5 h-3.5 text-neutral-400" />
              {text}
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-neutral-400 text-center">
          Powered by third-party AI models. Responses may be inaccurate.
        </p>

      </main>
    </div>
  )
}