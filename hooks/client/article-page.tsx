'use client'

import { useState, useEffect, useRef, useCallback, ComponentPropsWithoutRef } from 'react'
import {toDigitalNumber} from '@/components/news-card'
import PinwheelLoader from '@/components/logo';
import Markdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { slabo ,Fugaz} from '@/lib/font'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getAllArticles, getArticleBySlug } from '@/lib/news-data'
import {
  ArrowLeft,
  Share2,
  Printer,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
  Check,
  ArrowRight,
  Eye,
  Clock,
  Bookmark,
  BookmarkCheck,
  Volume2,
  ChevronRight,
  Copy,
  MoreHorizontal,
} from 'lucide-react'

// ── Enhanced Helpers ───────────────────────────────────────────────────────────

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function authorInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function toAuthorSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

// ── Enhanced Code Block (Material Design) ──────────────────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded-md text-sm font-mono border">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-8 rounded-2xl overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-400 rounded-full" />
          <div className="w-2 h-2 bg-yellow-400 rounded-full" />
          <div className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="ml-3 text-xs font-mono text-slate-400 font-medium uppercase tracking-wide">
            {lang}
          </span>
        </div>
        <button
          onClick={() => { 
            navigator.clipboard.writeText(code.trim()); 
            setCopied(true); 
            setTimeout(() => setCopied(false), 2000) 
          }}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 px-2.5 py-1.5 rounded-xl transition-all duration-200 backdrop-blur-sm border border-slate-600/30"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="font-medium">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-6 py-5 text-sm leading-relaxed font-mono scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900/50">
        <code className="text-slate-100">{code}</code>
      </pre>
    </div>
  )
}

// ── Enhanced MD Components (Material 3 Design) ─────────────────────────────────

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 className={`${Fugaz.className} text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mt-12 mb-6 leading-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent`}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className={`${Fugaz.className} text-2xl md:text-3xl font-bold text-slate-900 mt-10 mb-4 leading-tight border-l-4 border-red-500 pl-4`}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl md:text-2xl font-bold text-slate-900 mt-8 mb-3 leading-snug bg-slate-50 px-4 py-3 rounded-xl">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-lg md:text-xl leading-8 text-slate-700 my-6 font-light max-w-4xl">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-8 my-6 space-y-3 text-lg text-slate-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-8 my-6 space-y-3 text-lg text-slate-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed py-1">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="relative my-8 pl-8 pr-6 py-6 bg-gradient-to-r from-red-50 to-pink-50 border border-red-100 rounded-2xl shadow-sm">
      <div className="absolute left-0 top-0 w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl -translate-x-4 translate-y-4 shadow-lg" />
      <div className="relative text-xl italic text-slate-800 font-serif leading-relaxed">{children}</div>
      <div className="absolute bottom-2 right-4 w-20 h-1 bg-gradient-to-r from-red-500 to-pink-600 rounded-full" />
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-8 rounded-2xl border border-slate-200 shadow-sm bg-white">
      <table className="min-w-full divide-y divide-slate-200">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>,
  tr: ({ children }) => (
    <tr className="hover:bg-slate-50/50 transition-all duration-150">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider bg-gradient-to-r from-slate-100 to-slate-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-6 py-4 text-sm text-slate-900 font-medium">{children}</td>
  ),
  hr: () => (
    <hr className="my-12 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent border-0" />
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-slate-900 bg-slate-100 px-1 rounded-sm">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-700 bg-yellow-50 px-1 rounded-sm">{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-red-600 hover:text-red-700 font-semibold underline underline-offset-2 decoration-red-200 hover:decoration-red-400 transition-all duration-200 bg-red-50/50 px-1 py-0.5 rounded-md hover:bg-red-100"
    >
      {children}
    </a>
  ),
  img: ({ node, className: imgClass = "", ...props }) => {
    const { alt, src } = props
    const match = alt?.match(/^(.+)\s{caption:(.+)}$/)
    const imageAlt = match ? match[1].trim() : alt
    const caption = match ? match[2].trim() : null

    return (
      <figure className="my-12" data-type="image-figure">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-slate-100 group hover:shadow-3xl transition-all duration-500">
          <img
            src={src}
            alt={imageAlt}
            className={`w-full h-auto max-h-[500px] object-cover group-hover:scale-105 transition-transform duration-700 ${imgClass}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        {caption && (
          <figcaption className="mt-4 text-sm text-slate-600 italic font-medium text-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
            📷 {caption}
          </figcaption>
        )}
      </figure>
    )
  }
}

// ── Article Markdown ───────────────────────────────────────────────────────────

function ArticleMarkdown({ content }: { content: string }) {
  return (
    <article className={`${slabo.className} prose prose-lg max-w-none`}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={mdComponents}
      >
        {content}
      </Markdown>
    </article>
  )
}

// ── Enhanced Reading Progress ──────────────────────────────────────────────────

function useReadingProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      const total = height - window.innerHeight + 100
      const scrolled = Math.max(0, -top)
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ref])

  return progress
}

// ── Enhanced Share Dropdown (Material 3) ───────────────────────────────────────

interface ShareDropdownProps {
  article: NewsArticle
  copied: boolean
  onCopy: () => void
  onTwitter: () => void
  onFacebook: () => void
  onLinkedin: () => void
  onClose: () => void
}

function ShareDropdown({ article, copied, onCopy, onTwitter, onFacebook, onLinkedin, onClose }: ShareDropdownProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl shadow-slate-900/10 p-2 z-50 animate-in slide-in-from-top-2 duration-200">
      <div className="space-y-1">
        <button
          onClick={() => { onTwitter(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 rounded-2xl transition-all duration-200 font-medium group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
            <Twitter className="w-5 h-5 text-white" />
          </div>
          <span>X / Twitter</span>
        </button>
        <button
          onClick={() => { onFacebook(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-2xl transition-all duration-200 font-medium group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
            <Facebook className="w-5 h-5 text-white" />
          </div>
          <span>Facebook</span>
        </button>
        <button
          onClick={() => { onLinkedin(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-2xl transition-all duration-200 font-medium group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200">
            <Linkedin className="w-5 h-5 text-white" />
          </div>
          <span>LinkedIn</span>
        </button>
        <div className="w-full h-px bg-gradient-to-r from-slate-200 to-transparent my-1" />
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-2xl transition-all duration-200 font-medium group"
        >
          <div className="w-10 h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-200 border border-slate-200">
            {copied ? <Check className="w-5 h-5 text-green-600" /> : <Link2 className="w-5 h-5 text-slate-600" />}
          </div>
          <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  )
}

// ── Enhanced Related Item ──────────────────────────────────────────────────────

function RelatedItem({ article }: { article: NewsArticle }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="group relative flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all duration-200 overflow-hidden hover:shadow-md"
    >
      <div className="relative w-20 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm group-hover:shadow-md transition-all duration-200">
        {article.image ? (
          <Image 
            src={article.image} 
            alt={article.title} 
            fill 
            className="object-cover group-hover:scale-110 transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">News</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-red-100 to-pink-100 text-xs font-bold text-red-700 rounded-full">
          {article.category}
        </span>
        <h4 className={`${Fugaz.className} mt-1.5 text-base font-bold leading-tight text-slate-900 group-hover:text-red-600 line-clamp-2 transition-colors duration-200`}>
          {article.title}
        </h4>
        <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          {toDigitalNumber(article.views ?? 0)} views • {formatRelativeTime(article.date)}
        </p>
      </div>
    </Link>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ArticlePage() {
  const params = useParams()
  const slug = params.slug as string

  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([])
  const [mostRead, setMostRead] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  const shareRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const progress = useReadingProgress(mainRef)

  // Load article data
  useEffect(() => {
    const load = async () => {
      try {
        const found = await getArticleBySlug(slug)
        if (found) {
          setArticle(found)
          const all = await getAllArticles()
          const related = all
            .filter((a) => a.category === found.category && a.id !== found.id)
            .slice(0, 5)
          const popular = all
            .filter((a) => a.id !== found.id)
            .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
            .slice(0, 6)
          setRelatedArticles(related)
          setMostRead(popular)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [slug])

  // Enhanced share handlers
  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleShareTwitter = useCallback(() => {
    const text = encodeURIComponent(`${article?.title ?? ''} ${window.location.href}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=600,height=400')
  }, [article])

  const handleShareFacebook = useCallback(() => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'width=600,height=400')
  }, [])

  const handleShareLinkedin = useCallback(() => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(article?.title ?? '')
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank', 'width=600,height=400')
  }, [article])

  const handleNativeShare = useCallback(async () => {
    if (navigator.share && article) {
      await navigator.share({ 
        title: article.title, 
        text: article.description?.slice(0, 100) + '...', 
        url: window.location.href 
      })
    } else {
      setShareOpen(true)
    }
  }, [article])

  const handlePrint = () => window.print()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6">
              <PinwheelLoader size={96} color='#6366f1' />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Loading article...</h2>
            <p className="text-slate-500">Please wait while we fetch the latest content</p>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Link href="/" className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 mb-8 text-sm font-semibold bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-all duration-200">
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>
          <div className="text-center py-16 bg-white rounded-3xl shadow-2xl border border-slate-200">
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-3xl flex items-center justify-center">
              <span className="text-3xl">📄</span>
            </div>
            <h1 className={`${Fugaz.className} text-4xl font-black text-slate-900 mb-4`}>Article Not Found</h1>
            <p className="text-xl text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Link 
              href="/" 
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-lg rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-lg"
            >
              Browse Latest News
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const readTime = estimateReadTime(article.content)
  const authorSlug = toAuthorSlug(article.author)
  const authorInitialsStr = authorInitials(article.author)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col" ref={mainRef}>
      
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-content { max-width: 100% !important; }
          .sidebar { display: none !important; }
        }
        .scrollbar-thin::-webkit-scrollbar { height: 6px; width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { 
          background: rgba(148, 163, 184, 0.5); 
          border-radius: 3px; 
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.8); }
      `}</style>

      <Header />

      {/* Enhanced Reading Progress Bar */}
      <div className="no-print fixed top-0 left-0 right-0 h-1 bg-slate-200/50 backdrop-blur-sm z-[99] shadow-sm">
        <div
          className="h-full bg-gradient-to-r from-red-500 via-pink-500 to-red-600 shadow-lg shadow-red-500/25 transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, transform: `translateX(${(100-progress)/2}%)` }}
        />
      </div>

      {/* Enhanced Sticky Top Bar */}
      <div className="no-print sticky top-1 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium min-w-0">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <Link 
              href={`/category/${article.category}`} 
              className="hover:text-slate-900 transition-colors capitalize"
            >
              {article.category}
            </Link>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="truncate font-semibold text-slate-900 max-w-[300px]">{article.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBookmarked(b => !b)}
              className={`relative p-2.5 rounded-2xl transition-all duration-200 group ${
                bookmarked
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:-translate-y-0.5'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
            >
              {bookmarked ? (
                <BookmarkCheck className="w-5 h-5" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
              {bookmarked && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center animate-ping">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-all duration-200 border border-slate-200"
              title="Print article"
            >
              <Printer className="w-5 h-5" />
            </button>
            <div className="relative" ref={shareRef}>
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
              {shareOpen && (
                <ShareDropdown
                  article={article}
                  copied={copied}
                  onCopy={handleCopyLink}
                  onTwitter={handleShareTwitter}
                  onFacebook={handleShareFacebook}
                  onLinkedin={handleShareLinkedin}
                  onClose={() => setShareOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 pt-4 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-12 xl:gap-16 items-start">
            
            {/* ════════════════════ MAIN CONTENT ════════════════════ */}
            <article className="print-content max-w-4xl">
              
              {/* Enhanced Category Badges */}
              <div className="flex items-center gap-3 mb-8 flex-wrap">
                <Link
                  href={`/category/${article.category}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold uppercase tracking-wide rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  {article.category}
                </Link>
                {article.breaking && (
                  <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide rounded-2xl shadow-lg animate-pulse">
                    🚨 Breaking
                  </div>
                )}
                {article.trending && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold uppercase tracking-wide rounded-2xl shadow-lg">
                    🔥 Trending
                  </div>
                )}
              </div>

              {/* Enhanced Headline */}
              <h1 className={`${Fugaz.className} text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-[0.9] mb-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent drop-shadow-lg`}>
                {article.title}
              </h1>

              {/* Enhanced Standfirst */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-8 rounded-3xl shadow-inner border border-slate-200 mb-12">
                <p className="text-xl md:text-2xl text-slate-700 leading-relaxed font-light max-w-3xl">
                  {article.description}
                </p>
              </div>

              {/* Enhanced Author + Meta */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-12 mb-16 border-b-4 border-slate-200">
                <div className="flex items-center gap-4">
                  <Link href={`/${authorSlug}`} className="group">
                    <div className="relative w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-3xl shadow-lg group-hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className={`${Fugaz.className} absolute inset-0 flex items-center justify-center text-2xl font-black text-slate-700 group-hover:text-red-600 transition-colors`}>
                        {authorInitialsStr}
                      </div>
                    </div>
                  </Link>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/${authorSlug}`} 
                        className={`${Fugaz.className} text-2xl font-black text-slate-900 hover:text-red-600 transition-all duration-200`}
                      >
                        {article.author}
                      </Link>
                      <span className="text-slate-400">•</span>
                    </div>
                    <p className="text-sm text-slate-500">Editor & Writer</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-600 font-medium flex-wrap">
                  <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl">
                    <Clock className="w-4 h-4 text-slate-500" />
                    {readTime} min read
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-2xl text-emerald-800">
                    <Eye className="w-4 h-4" />
                    {toDigitalNumber(article.views ?? 0)} views
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>{formatRelativeTime(article.date)}</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Hero Image */}
              <div className="relative mb-20">
                <div className="relative overflow-hidden rounded-4xl shadow-2xl bg-gradient-to-br from-slate-100 to-slate-200 aspect-[16/9] group">
                  <Image
                    src={article.image || 'https://placehold.co/1600x900/efeff1/6b7280?text=No+Image+Available'}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                    className="object-cover group-hover:scale-105 transition-transform duration-1000"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                </div>
                {article.imageCaption && (
                  <p className="mt-6 text-lg text-slate-600 italic font-medium bg-white/80 px-6 py-4 rounded-3xl shadow-lg backdrop-blur-sm border border-slate-200 max-w-2xl mx-auto text-center">
                    📷 {article.imageCaption}
                  </p>
                )}
              </div>

              {/* Article Content */}
              <section className="prose-content">
                <ArticleMarkdown content={article.content} />
              </section>

              {/* Enhanced Share Bar */}
              <div className="no-print sticky bottom-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 pt-12 pb-8 mt-20">
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`${Fugaz.className} text-2xl font-black text-slate-900 tracking-tight`}>Share this story</h3>
                    <div className="w-20 h-1 bg-gradient-to-r from-slate-200 to-transparent" />
                  </div>
                  <div className="flex items-center gap-3 p-1 bg-gradient-to-r from-slate-100 to-slate-200 rounded-3xl shadow-inner">
                    <button
                      onClick={handleShareTwitter}
                      className="p-3 hover:bg-white/60 rounded-2xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex-shrink-0"
                      title="Share on X/Twitter"
                    >
                      <Twitter className="w-6 h-6 text-sky-500" />
                    </button>
                    <button
                      onClick={handleShareFacebook}
                      className="p-3 hover:bg-white/60 rounded-2xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex-shrink-0"
                      title="Share on Facebook"
                    >
                      <Facebook className="w-6 h-6 text-blue-600" />
                    </button>
                    <button
                      onClick={handleShareLinkedin}
                      className="p-3 hover:bg-white/60 rounded-2xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex-shrink-0"
                      title="Share on LinkedIn"
                    >
                      <Linkedin className="w-6 h-6 text-blue-700" />
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2 px-4 py-3 bg-white shadow-sm rounded-2xl border font-semibold text-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ml-1"
                      title="Copy article link"
                    >
                      {copied ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Link2 className="w-5 h-5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Related Articles */}
              {relatedArticles.length > 0 && (
                <section className="no-print mt-32 pt-20 border-t-4 border-slate-200">
                  <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-xl">🔥</span>
                    </div>
                    <div>
                      <h2 className={`${Fugaz.className} text-3xl font-black text-slate-900 leading-tight`}>
                        More {article.category} stories
                      </h2>
                      <p className="text-lg text-slate-600 mt-1">Keep reading about what matters</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {relatedArticles.slice(0, 6).map((related) => (
                      <NewsCard key={related.id} article={related} variant="compact" />
                    ))}
                  </div>
                </section>
              )}
            </article>

            {/* ════════════════════ ENHANCED SIDEBAR ════════════════════ */}
            <aside className="no-print xl:sticky xl:top-24 xl:h-fit space-y-8">
              
              {/* Most Read */}
              {mostRead.length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-xl p-8">
                  <h3 className={`${Fugaz.className} text-xl font-black text-slate-900 mb-6 tracking-tight border-b-2 border-slate-200 pb-4`}>
                    Most Read Today
                  </h3>
                  <div className="space-y-3">
                    {mostRead.slice(0, 5).map((item) => (
                      <RelatedItem key={item.id} article={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Newsletter */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 border border-emerald-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="mb-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold uppercase tracking-wide rounded-2xl shadow-md">
                    🚀 Newsletter
                  </span>
                </div>
                <h4 className={`${Fugaz.className} text-xl font-black text-slate-900 mb-3 leading-tight`}>
                  Daily News Digest
                </h4>
                <p className="text-slate-700 mb-6 leading-relaxed text-lg">
                  Get the most important stories delivered to your inbox every morning. Free forever.
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-5 py-4 text-lg border-2 border-slate-200 rounded-3xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50 bg-white/50 backdrop-blur-sm shadow-lg transition-all duration-200 font-semibold"
                  />
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black text-lg rounded-3xl shadow-2xl hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 uppercase tracking-wide">
                    Subscribe Free
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center font-medium">
                  ✅ No spam. Unsubscribe anytime.
                </p>
              </div>

              {/* Related Articles in Sidebar */}
              {relatedArticles.length > 0 && (
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-xl p-8">
                  <h3 className={`${Fugaz.className} text-xl font-black text-slate-900 mb-6 tracking-tight border-b-2 border-slate-200 pb-4`}>
                    Related Stories
                  </h3>
                  <div className="space-y-3 mb-6">
                    {relatedArticles.slice(0, 4).map((item) => (
                      <RelatedItem key={item.id} article={item} />
                    ))}
                  </div>
                  <Link
                    href={`/category/${article.category}`}
                    className="inline-flex items-center gap-2 text-lg font-bold text-red-600 hover:text-red-700 transition-all duration-200 group"
                  >
                    All {article.category} →
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}