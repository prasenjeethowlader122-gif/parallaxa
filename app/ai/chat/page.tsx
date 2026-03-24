'use client'

import { Header } from '@/components/header'
import { ArrowRight, User, Bot } from 'lucide-react'
import { useState, useRef, KeyboardEvent } from 'react'
import remarkGfm from 'remark-gfm'

import Markdown from 'react-markdown'

interface Message {
  from: 'ai' | 'user'
  content: string
}

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState < Message[] > ([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef < HTMLInputElement > (null)
  const messagesEndRef = useRef < HTMLDivElement > (null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const handleSubmit = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || isLoading) return
    
    // Add user message
    const userMsg: Message = { from: 'user', content: trimmedQuery }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)
    
    try {
      // Create conversation history for context
      const conversationHistory = messages.map((m) => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...conversationHistory,
            { role: 'user', content: trimmedQuery },
          ],
          model: '@cf/moonshotai/kimi-k2.5',
          temperature: 0.7,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''
      
      // Add empty AI message placeholder
      setMessages((prev) => [...prev, { from: 'ai', content: '' }])
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  aiContent += parsed.content
                  
                  // Update the last message with streaming content
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    if (newMessages[newMessages.length - 1].from === 'ai') {
                      newMessages[newMessages.length - 1].content = aiContent
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                // Skip parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          from: 'ai',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
      scrollToBottom()
      inputRef.current?.focus()
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent < HTMLInputElement > ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center overflow-hidden bg-white">
        
        {/* Messages Container - scrollable */}
        <div className="flex-1 w-full flex flex-col items-center px-4 py-10">
          <div className="flex flex-col gap-4 w-full max-w-2xl">
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
                  <div className={`flex flex-col items-center justify-start gap-3 max-w-[80%]  ${m.from === 'user' ? 'flex-col-reverse' : 'flex-col'}`}>
                    <small className = 'italic text-gray-600'>
                      {
                        m.from === 'user' ? 'You' : 'Parallaxa.ai'
                      }
                    </small>
                    <div className={`px-4 py-2 rounded-2xl text-sm ${
                      m.from === 'user' 
                        ? 'text-gray-800' 
                        : ' text-gray-800'
                    }`}>
                      {m.content ? (
                        <Markdown className='w-full overflow-x-scroll' remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                      ) : (
                        <span className="text-gray-400 italic">Typing...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - fixed at bottom */}
        <div className="w-full bg-gradient-to-t from-gray-50 to-transparent pt-4 pb-6 px-4 flex flex-col items-center border-t border-gray-200">
          <div className="w-full max-w-xl">
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
                disabled={isLoading}
                className="flex-1 outline-none border-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 min-w-0 disabled:opacity-60"
              />
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading}
                className={`
                  rounded-full p-2 flex items-center justify-center transition-all duration-150 flex-shrink-0
                  ${query.trim() && !isLoading
                    ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <ArrowRight className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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