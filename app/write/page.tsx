'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArticleEditor } from '@/components/editor'
import type { NewsArticle } from '@/lib/db/articles'
import { MonitorX, ArrowLeft } from 'lucide-react'

// ─── Desktop guard ────────────────────────────────────────────────────────────

function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState < boolean | null > (null)
  
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  
  // Still measuring — render nothing to avoid flicker
  if (isDesktop === null) return null
  
  if (!isDesktop) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: 20,
        padding: '0 24px',
        background: 'var(--bg-primary, #0f0f0f)',
        color: 'var(--text-primary, #f0f0f0)',
        textAlign: 'center',
        userSelect: 'none',
      }}>
        {/* Icon */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72,
          height: 72,
          borderRadius: 18,
          background: 'var(--bg-secondary, #1a1a1a)',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          color: 'var(--text-tertiary, #666)',
        }}>
          <MonitorX size={32} strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            margin: 0,
            color: 'var(--text-primary, #f0f0f0)',
          }}>
            Desktop only
          </h1>
          <p style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text-secondary, #888)',
            margin: 0,
            maxWidth: 280,
          }}>
            The article editor requires a desktop screen. Please open this page on a larger device to continue writing.
          </p>
        </div>

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            padding: '9px 16px',
            borderRadius: 8,
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            background: 'transparent',
            color: 'var(--text-secondary, #888)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary, #f0f0f0)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary, #888)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border, rgba(255,255,255,0.1))'
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Go back
        </button>
      </div>
    )
  }
  
  return <>{children}</>
}

// ─── Write page ───────────────────────────────────────────────────────────────

function WritePageContent() {
  const params = useSearchParams()
  const editId = params.get('edit')
  const [article, setArticle] = useState < NewsArticle | null > (null)
  const [loading, setLoading] = useState(!!editId)
  
  useEffect(() => {
    if (!editId) return
    fetch(`/api/articles/${editId}`)
      .then(r => r.json())
      .then(data => {
        setArticle({
          ...data,
          date: data.date ? new Date(data.date) : new Date(),
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
        })
      })
      .finally(() => setLoading(false))
  }, [editId])
  
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', color: 'var(--text-tertiary)', fontSize: 14,
      }}>
        Loading article…
      </div>
    )
  }
  
  return <ArticleEditor editingArticle={article} />
}

export default function WritePage() {
  return (
    <DesktopOnly>
      <Suspense fallback={
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', color: 'var(--text-tertiary)', fontSize: 14,
        }}>
          Loading…
        </div>
      }>
        <WritePageContent />
      </Suspense>
    </DesktopOnly>
  )
}