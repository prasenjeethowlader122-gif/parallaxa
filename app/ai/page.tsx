'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import ParallaxaLogoSvg from '../../public/parallaxa-logo.svg'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useState, useRef, KeyboardEvent, useEffect } from 'react'
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
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef < HTMLInputElement > (null)
  const router = useRouter()
  
  useEffect(() => {
    // Trigger mount animation
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])
  
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
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      <Header includeTinker={false} />

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-10">

        {/* Logo + tagline */}
        <div className={`flex flex-col items-center gap-4 transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Gradient wrapper around the SVG logo */}
          <div className="logo-gradient-wrapper">
            <Image
              src={ParallaxaLogoSvg}
              height={120}
              alt="Parallaxa logo"
              priority
              className="logo-image"
            />
          </div>

          <p
            className={`text-sm tracking-widest uppercase text-gray-400 transition-all duration-700 delay-200 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            What would you like to explore?
          </p>
        </div>

        {/* Search input */}
        <div
          className={`transition-all duration-700 delay-300 ease-out w-full max-w-xl ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div
            className={`
              flex flex-row items-center gap-2 bg-white rounded-full w-full
              px-5 py-2 transition-all duration-200
              ${focused
                ? 'shadow-[0_0_0_2px_rgba(59,130,246,0.3),0_4px_20px_rgba(99,179,237,0.2)]'
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
                  ? 'submit-btn-active hover:scale-105 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Suggestion chips */}
        <div
          className={`flex flex-wrap gap-2 justify-center max-w-lg transition-all duration-700 delay-500 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {SUGGESTIONS.map((s, i) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="chip"
              style={{ animationDelay: `${600 + i * 60}ms` }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Disclaimer */}
        <p
          className={`text-xs text-gray-400 transition-all duration-700 delay-700 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          Using third-party LLM model for this interface
        </p>

      </main>

      <style jsx>{`
        /* ── Ambient blobs ── */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.35;
          animation: drift 12s ease-in-out infinite alternate;
        }
        .blob-1 {
          width: 520px; height: 520px;
          top: -120px; left: -100px;
          background: radial-gradient(circle, #bfdbfe, #93c5fd);
          animation-duration: 14s;
        }
        .blob-2 {
          width: 400px; height: 400px;
          bottom: -80px; right: -80px;
          background: radial-gradient(circle, #dbeafe, #60a5fa);
          animation-duration: 10s;
          animation-direction: alternate-reverse;
        }
        .blob-3 {
          width: 300px; height: 300px;
          top: 40%; left: 55%;
          background: radial-gradient(circle, #e0f2fe, #38bdf8);
          opacity: 0.2;
          animation-duration: 16s;
        }
        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.06); }
        }

        /* ── Gradient logo ── */
        .logo-gradient-wrapper {
          position: relative;
          display: inline-block;
          animation: logo-reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        /* Overlay a clipped gradient on top of the SVG via mix-blend-mode */
        .logo-gradient-wrapper::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #818cf8 100%);
          mix-blend-mode: multiply;
          border-radius: 8px;
          pointer-events: none;
          animation: shimmer 4s ease-in-out infinite alternate;
        }
        .logo-image {
          display: block;
          filter: saturate(0) brightness(0.15); /* desaturate so gradient shows cleanly */
          animation: logo-reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes logo-reveal {
          0%   { opacity: 0; transform: scale(0.88) translateY(10px); filter: saturate(0) brightness(0.15) blur(6px); }
          60%  { opacity: 1; transform: scale(1.03) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          from { background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 55%, #818cf8 100%); }
          to   { background: linear-gradient(135deg, #60a5fa 0%, #38bdf8 45%, #a5b4fc 100%); }
        }

        /* ── Submit button gradient ── */
        .submit-btn-active {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          color: white;
          box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
        }

        /* ── Suggestion chips ── */
        .chip {
          font-size: 0.75rem;
          color: #6b7280;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 9999px;
          padding: 5px 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          animation: chip-pop 0.4s ease both;
          white-space: nowrap;
        }
        .chip:hover {
          border-color: #93c5fd;
          color: #3b82f6;
          background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.2);
        }
        @keyframes chip-pop {
          from { opacity: 0; transform: scale(0.9) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}