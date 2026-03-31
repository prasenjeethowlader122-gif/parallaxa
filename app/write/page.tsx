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
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  
  // Still measuring — render nothing to avoid flicker
  
  
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