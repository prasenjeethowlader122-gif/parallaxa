'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import ParallaxaLogoSvg from '../../public/parallaxa-logo.svg'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useState, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

const SUGGESTIONS = [
  'Summarize a document',
  'Write a draft',
  'Analyze data',
  'Brainstorm ideas',
  'Explain a concept',
  'Review my code',
]

export default function AiInterface() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef < HTMLInputElement > (null)
  const router = useRouter()
  
  const handleSubmit = () => {
    if (!query.trim()) return
    router.push(`/ai/chat?q=${encodeURIComponent(query.trim())}`)
  }
  
  const handleKeyDown = (e: KeyboardEvent < HTMLInputElement > ) => {
    if (e.key === 'Enter') handleSubmit()
  }
  
  const handleSuggestion = (text: string) => {
    setQuery(text)
    inputRef.current?.focus()
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header includeTinker={false} />

      <main className="flex-1 bg-gray-50 flex flex-col items-center justify-center px-4 py-16 gap-10">

        {/* Logo + tagline */}
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Image src={ParallaxaLogoSvg} height={40} alt="Parallaxa logo" priority />
          <p className="text-sm text-gray-400 tracking-wide">
            What would you like to explore?
          </p>
        </div>

        {/* Search input */}
        <div
          className={`
            flex flex-row items-center gap-2 bg-white rounded-full w-full max-w-xl
            px-5 py-2 transition-all duration-200
            ${focused
              ? 'shadow-[0_0_0_2px_rgba(0,0,0,0.12)]'
              : 'shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-200'
            }
          `}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            className="flex-1 outline-none border-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 min-w-0"
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            aria-label="Submit"
            className={`
              rounded-full p-2 flex items-center justify-center transition-all duration-150
              ${query.trim()
                ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion chips */}
        <div className="flex flex-wrap gap-2 justify-center max-w-lg animate-fade-in-up">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-4 py-2 hover:border-gray-400 hover:text-gray-800 transition-all duration-150 active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>

      </main>

      <Footer />

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease both;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s 0.1s ease both;
        }
      `}</style>
    </div>
  )
}