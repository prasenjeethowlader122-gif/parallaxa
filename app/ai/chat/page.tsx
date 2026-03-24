'use client'

import { Header } from '@/components/header'
import { ArrowRight, User, Bot } from 'lucide-react' // Added icons for avatars
import { useState, useRef, KeyboardEvent } from 'react'

interface Message {
  from: 'ai' | 'user'
  content: string
}

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState < Message[] > ([])
  const inputRef = useRef < HTMLInputElement > (null)
  
  const handleSubmit = () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    
    // 1. Add User Message
    const userMsg: Message = { from: 'user', content: trimmedQuery }
    
    // 2. Clear input immediately
    setQuery('')
    
    // 3. Update state (and mock an AI response)
    setMessages((prev) => [...prev, userMsg])
    
    // Simulated AI response delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { from: 'ai', content: `I received: "${trimmedQuery}". How can I help further?` }
      ])
    }, 600)
  }
  
  const handleKeyDown = (e: KeyboardEvent < HTMLInputElement > ) => {
    if (e.key === 'Enter') handleSubmit()
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans overflow-hidden">
      <Header includeTinker={false} />

      {/* Changed justify-center to justify-start for chat flow */}
      <main className="flex-1 bg-gray-50 flex flex-col items-center justify-start px-4 py-10 gap-6 overflow-y-auto">
        
        {/* Message Display Area */}
        <div className="flex flex-col gap-4 w-full max-w-2xl overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl font-medium">How can I help you today?</p>
            </div>
          ) : (
            messages.map((m, index) => (
              <div
                key={index}
                className={`flex w-full ${m.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`flex gap-3 max-w-[80%] ${m.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center ${m.from === 'user' ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {m.from === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-sm ${
                    m.from === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Search input - Stick to bottom or keep in flow */}
        <div className="sticky bottom-0 py-4 w-full max-w-xl mt-auto">
          <div
            className={`
              flex flex-row items-center gap-2 bg-white rounded-full 
              px-5 py-3 transition-all duration-200
              ${focused
                ? 'shadow-lg ring-2 ring-gray-900/5'
                : 'shadow-md border border-gray-200'
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
          <p className="text-[10px] text-gray-400 text-center mt-3">
            We are using third-party LLM models for this interface
          </p>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}