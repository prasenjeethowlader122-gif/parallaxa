'use client'

import { useState, useEffect, useRef, useCallback, ComponentPropsWithoutRef } from 'react'
import { toDigitalNumber } from '@/components/news-card'
import PinwheelLoader from '@/components/logo';
import Markdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { slabo, Fugaz } from '@/lib/font'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getAllArticles, getArticleBySlug } from '@/lib/db/articles'

// ── Helpers ────────────────────────────────────────────────────────────────────

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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function authorInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function toAuthorSlug(name: string): string {
  return name.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]/g, '')
}

// ── Code Block ────────────────────────────────────────────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef < 'code' > ) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className
  
  if (isInline) {
    return (
      <code className="bg-[#efedee] text-[#585f64] px-1.5 py-0.5 rounded text-[0.82em] font-mono break-all">
        {children}
      </code>
    )
  }
  
  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-[#dcdad9] bg-[#1e1e1e] text-gray-100 max-w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b border-[#3a3a3a]">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest truncate mr-2">{lang}</span>
        <button
          onClick={() => { 
            navigator.clipboard.writeText(code.trim()); 
            setCopied(true); 
            setTimeout(() => setCopied(false), 1800) 
          }}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors shrink-0"
        >
          <span className="material-symbols-rounded !text-[14px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs sm:text-sm leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ── MD Component Map ──────────────────────────────────────────────────────────

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 className={`${Fugaz.className} text-2xl sm:text-3xl font-bold text-gray-900 mt-8 mb-3 leading-tight uppercase`}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className={`${Fugaz.className} text-xl sm:text-2xl font-semibold text-gray-900 mt-7 mb-2 leading-snug uppercase`}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className={`${Fugaz.className} text-lg sm:text-xl font-semibold text-gray-800 mt-5 mb-1 uppercase`}>{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-800 text-[17px] leading-[1.85] my-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-4 flex flex-col gap-2 text-[17px] text-gray-800">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-4 flex flex-col gap-2 text-[17px] text-gray-800">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-red-600 pl-5 my-6 text-gray-600 italic text-lg font-['Georgia',serif] bg-gray-50 py-3 pr-4 rounded-r-lg">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-gray-200 max-w-full">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50 text-gray-500">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-3 text-gray-700">{children}</td>,
  hr: () => <hr className="my-8 border-gray-200" />,
  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-red-600 underline underline-offset-2 hover:text-red-700 transition-colors"
    >
      {children}
    </a>
  ),
  img: ({ node, className: imgClass = "", ...props }) => {
    const { alt, src } = props
    const match = alt?.match(/^(.+)\\s{caption:(.+?)}$/)
    const imageAlt = match ? match[1].trim() : alt
    const caption = match ? match[2].trim() : null
    
    return (
      <figure className="my-4 flex flex-col" data-type="image-figure">
        <img
          src={src}
          alt={imageAlt}
          className={`max-w-full rounded-lg ${imgClass}`}
        />
        {caption && (
          <figcaption className="text-sm text-gray-600 mt-2">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }
}

// ── Article Markdown ──────────────────────────────────────────────────────────

function ArticleMarkdown({ content }: { content: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={mdComponents}
    >
      {content}
    </Markdown>
  )
}

// ── Reading progress bar ───────────────────────────────────────────────────────

function useReadingProgress(ref: React.RefObject < HTMLElement | null > ) {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      const total = height - window.innerHeight
      const scrolled = Math.max(0, -top)
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ref])
  
  return progress
}

// ── Share dropdown ─────────────────────────────────────────────────────────────

interface ShareDropdownProps {
  article: NewsArticle
  copied: boolean
  onCopy: () => void
  onTwitter: () => void
  onFacebook: () => void
  onLinkedin: () => void
}

function ShareDropdown({ article, copied, onCopy, onTwitter, onFacebook, onLinkedin }: ShareDropdownProps) {
  return (
    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl p-1.5 w-52 z-50">
      <button
        onClick={onTwitter}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <span className="material-symbols-rounded !text-[18px] text-sky-500 flex-shrink-0">share</span>
        Share on X / Twitter
      </button>
      <button
        onClick={onFacebook}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <span className="material-symbols-rounded !text-[18px] text-blue-600 flex-shrink-0">facebook</span>
        Share on Facebook
      </button>
      <button
        onClick={onLinkedin}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <span className="material-symbols-rounded !text-[18px] text-blue-700 flex-shrink-0">share</span>
        Share on LinkedIn
      </button>
      <hr className="my-1 border-gray-100" />
      <button
        onClick={onCopy}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        {copied
          ? <span className="material-symbols-rounded !text-[18px] text-green-500 flex-shrink-0">check</span>
          : <span className="material-symbols-rounded !text-[18px] flex-shrink-0">link</span>}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}

// ── Sidebar: related item ──────────────────────────────────────────────────────

function RelatedItem({ article }: { article: NewsArticle }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 group"
    >
      <div className="relative w-18 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-100" style={{ width: 72, height: 54 }}>
        {article.image
          ? <Image src={article.image} alt={article.title} fill className="object-cover" />
          : <div className="w-full h-full bg-gray-100" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">
          {article.category}
        </p>
        <h4 className={`${Fugaz.className} text-[13px] font-medium leading-snug text-gray-900 group-hover:underline line-clamp-3`}>
          {article.title}
        </h4>
        <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(article.date)}</p>
      </div>
    </Link>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ArticlePage({ initialArticle, slug: propSlug }: { initialArticle?: NewsArticle, slug?: string }) {
  const params = useParams()
  const slug = (params.slug as string) || propSlug
  
  const [article, setArticle] = useState < NewsArticle | null > (initialArticle || null)
  const [relatedArticles, setRelatedArticles] = useState < NewsArticle[] > ([])
  const [mostRead, setMostRead] = useState < NewsArticle[] > ([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  
  const shareRef = useRef < HTMLDivElement > (null)
  const mainRef = useRef < HTMLDivElement > (null)
  const progress = useReadingProgress(mainRef)
  
  // Load article data
  useEffect(() => {
    const load = async () => {
      try {
        const found = initialArticle || await getArticleBySlug(slug)
        if (found) {
          setArticle(found)
          const all = await getAllArticles()
          const related = all
            .filter((a) => a.category === found.category && a.id !== found.id)
            .slice(0, 3)
          const popular = all
            .filter((a) => a.id !== found.id)
            .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
            .slice(0, 4)
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
  
  // Close share dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    if (shareOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [shareOpen])
  
  // Share handlers
  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])
  
  const handleShareTwitter = useCallback(() => {
    const text = encodeURIComponent(article?.title ?? '')
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }, [article])
  
  const handleShareFacebook = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      '_blank')
  }, [])
  
  const handleShareLinkedin = useCallback(() => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(article?.title ?? '')
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank')
  }, [article])
  
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: article?.title, text: article?.description, url: window.location
          .href })
    } else {
      setShareOpen((prev) => !prev)
    }
  }, [article])
  
  const handlePrint = () => window.print()
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 h-full flex items-center justify-center">
          <PinwheelLoader size={100} color='#A8A8A8' />
        </div>
      </div>
    )
  }
  
  if (!article) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link href="/" className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 mb-8 text-sm font-medium">
            <span className="material-symbols-rounded !text-[18px]">arrow_back</span> Back to News
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Article Not Found</h1>
            <p className="text-gray-500">The article you're looking for doesn't exist or has been removed.</p>
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
    <div className="min-h-screen bg-white flex flex-col" ref={mainRef}>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-content { max-width: 100% !important; }
        }
      `}</style>

      <Header />

      {/* ── Reading progress bar ── */}
      <div className="no-print sticky top-0 left-0 right-0 h-0.5 bg-gray-50 z-50">
        <div
          className="h-full bg-black transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Sticky top bar ── */}
      <div className="no-print sticky top-0.5 bg-white border-b border-gray-100 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between gap-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            <Link href="/" className="hover:text-gray-600 transition-colors shrink-0">Home</Link>
            <span className="material-symbols-rounded !text-[14px] shrink-0">chevron_right</span>
            <Link href={`/category/${article.category}`} className="hover:text-gray-600 transition-colors shrink-0 capitalize">
              {article.category}
            </Link>
            <span className="material-symbols-rounded !text-[14px] shrink-0">chevron_right</span>
            <span className="truncate text-gray-500">{article.title}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Listen (decorative) */}
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
              <span className="material-symbols-rounded !text-[16px]">volume_up</span>
              Listen
            </button>

            {/* Bookmark */}
            <button
              onClick={() => setBookmarked((b) => !b)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                bookmarked
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-rounded !text-[16px]">
                {bookmarked ? 'bookmark_added' : 'bookmark'}
              </span>
              <span className="hidden sm:inline">{bookmarked ? 'Saved' : 'Save'}</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-rounded !text-[16px]">print</span>
              Print
            </button>

            {/* Share */}
            <div className="relative" ref={shareRef}>
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="material-symbols-rounded !text-[16px]">share</span>
                <span className="hidden sm:inline">Share</span>
              </button>
              {shareOpen && (
                <ShareDropdown
                  article={article}
                  copied={copied}
                  onCopy={handleCopyLink}
                  onTwitter={handleShareTwitter}
                  onFacebook={handleShareFacebook}
                  onLinkedin={handleShareLinkedin}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-10 xl:gap-14 items-start">

            {/* ════════════════════ ARTICLE COLUMN ════════════════════ */}
            <div className="flex-1 min-w-0 print-content">

              {/* Category + badges */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Link
                  href={`/category/${article.category}`}
                  className="text-[10px] font-semibold text-red-600 uppercase tracking-wider border border-red-200 px-2.5 py-1 rounded-sm hover:bg-red-50 transition-colors"
                >
                  {article.category}
                </Link>
                {article.breaking && (
                  <span className="bg-red-600 text-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-sm">
                    Breaking
                  </span>
                )}
                {article.trending && (
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-orange-600 uppercase tracking-wider border border-orange-200 px-2.5 py-1 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Trending
                  </span>
                )}
              </div>

              {/* Headline */}
              <h1 className={`${Fugaz.className} text-3xl md:text-4xl font-bold text-gray-900 leading-tight`}>
                {article.title}
              </h1>

              {/* Standfirst / description */}
              <p className="text-md text-gray-600 leading-relaxed mb-2">
                {article.description.length > 120 ? (
                  <>
                    {article.description.slice(0, 120)}...{' '}
                    <Link href="/" className="px-2 underline hover:text-red-600">
                      Read more
                    </Link>
                  </>
                ) : (
                  article.description
                )}
              </p>

              {/* ── Author + meta row (NO BORDER) ── */}
              <div className="flex items-center justify-between gap-4 py-4 mb-8 flex-wrap">
                <div className="flex items-center gap-2">
                  {/* Author Avatar */}
                  <Link href={`/${authorSlug}`} className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-300">
                    
                    </div>
                  </Link>
                  {/* Author Name */}
                  <div>
                    <Link 
                      href={`/${authorSlug}`} 
                      className="text-md text-gray-900 hover:text-red-600 transition-colors"
                    >
                      by {article.author}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-rounded !text-[16px]">schedule</span>
                    {readTime} min read
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-rounded !text-[16px]">visibility</span>
                    {toDigitalNumber(article.views ?? 0)}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-400">{formatRelativeTime(article.date)}</span>
                </div>
              </div>

              {/* ── Hero image ── */}
              <div className="mb-8">
                <div className="relative w-full aspect-video overflow-hidden bg-gray-100 rounded-lg">
                  <Image
                    src={article.image || 'https://placehold.co/1200x675/efeff1/6b7280?text=No+Image'}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                {article.imageCaption && (
                  <p className="text-xs text-gray-400 mt-3 leading-relaxed italic">
                    {article.imageCaption}
                  </p>
                )}
              </div>

              {/* ── Article body ── */}
              <article className={`${slabo.className} py-6`}>
                <ArticleMarkdown content={article.content} />
              </article>

              {/* ── Bottom share bar ── */}
              <div className="no-print pt-6 pb-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-gray-900 tracking-widest whitespace-nowrap">Share this article</span>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-full p-1">
                    <button
                      onClick={handleShareTwitter}
                      className="flex items-center gap-1.5 p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                      title="Share on X/Twitter"
                    >
                      <span className="material-symbols-rounded !text-[18px]">share</span>
                    </button>
                    <button
                      onClick={handleShareFacebook}
                      className="flex items-center gap-1.5 p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                      title="Share on Facebook"
                    >
                      <span className="material-symbols-rounded !text-[18px]">facebook</span>
                    </button>
                    <button
                      onClick={handleShareLinkedin}
                      className="flex items-center gap-1.5 p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                      title="Share on LinkedIn"
                    >
                      <span className="material-symbols-rounded !text-[18px]">share</span>
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                      title="Copy link"
                    >
                      {copied ? <span className="material-symbols-rounded !text-[18px] text-green-500">check</span> : <span className="material-symbols-rounded !text-[18px]">link</span>}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Related articles (grid) ── */}
              {relatedArticles.length > 0 && (
                <section className="no-print mt-16 pt-8 border-t border-gray-100">
                  <h2 className={`${Fugaz.className} text-lg font-bold tracking-widest text-gray-900 mb-6`}>
                    More in {article.category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relatedArticles.slice(0, 3).map((a) => (
                      <NewsCard key={a.id} article={a} variant="default" />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ════════════════════ SIDEBAR ════════════════════ */}
            <aside className="no-print hidden lg:flex flex-col gap-8 w-72 xl:w-80 flex-shrink-0">

              {/* Most read */}
              {mostRead.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900 border-b border-gray-200 pb-3 mb-4">
                    Most Read
                  </h3>
                  <div className="space-y-2">
                    {mostRead.slice(0, 5).map((a) => (
                      <RelatedItem key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter sign-up */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-2">Newsletter</p>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 leading-snug">
                  Stay informed daily
                </h4>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Get our best stories delivered to your inbox every morning.
                </p>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-white text-gray-900 placeholder-gray-400 transition-all"
                  />
                  <button className="w-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 py-2.5 rounded-xl transition-all shadow-sm">
                    Subscribe Free
                  </button>
                </div>
              </div>

              {/* On this topic */}
              {relatedArticles.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900 border-b border-gray-200 pb-3 mb-4">
                    Related Articles
                  </h3>
                  <div className="space-y-2 mb-4">
                    {relatedArticles.slice(0, 3).map((a) => (
                      <RelatedItem key={a.id} article={a} />
                    ))}
                  </div>
                  <Link
                    href={`/category/${article.category}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    See all {article.category} stories
                    <span className="material-symbols-rounded !text-[18px]">chevron_right</span>
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