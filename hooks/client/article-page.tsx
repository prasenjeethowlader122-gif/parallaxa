'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { slabo } from '@/lib/font'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getAllArticles, getArticleBySlug } from '@/lib/news-data'
import {
  ArrowLeft, Share2, Printer, Twitter, Facebook,
  Linkedin, Link2, Check, Eye, Clock, Bookmark,
  BookmarkCheck, Volume2, ChevronRight,
} from 'lucide-react'

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
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function authorInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function toAuthorSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

// ── Reading progress bar ───────────────────────────────────────────────────────

function useReadingProgress(ref: React.RefObject<HTMLElement | null>) {
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
        <Twitter className="w-4 h-4 text-sky-500 flex-shrink-0" />
        Share on X / Twitter
      </button>
      <button
        onClick={onFacebook}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <Facebook className="w-4 h-4 text-blue-600 flex-shrink-0" />
        Share on Facebook
      </button>
      <button
        onClick={onLinkedin}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <Linkedin className="w-4 h-4 text-blue-700 flex-shrink-0" />
        Share on LinkedIn
      </button>
      <hr className="my-1 border-gray-100" />
      <button
        onClick={onCopy}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
      >
        {copied
          ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
          : <Link2 className="w-4 h-4 flex-shrink-0" />}
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
        <h4 className="text-[13px] font-medium leading-snug text-gray-900 group-hover:underline line-clamp-3">
          {article.title}
        </h4>
        <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(article.date)}</p>
      </div>
    </Link>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

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
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')
  }, [])

  const handleShareLinkedin = useCallback(() => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(article?.title ?? '')
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank')
  }, [article])

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: article?.title, text: article?.description, url: window.location.href })
    } else {
      setShareOpen((prev) => !prev)
    }
  }, [article])

  const handlePrint = () => window.print()

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-400 text-sm">Loading article…</div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Not found ──
  if (!article) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link href="/" className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 mb-8 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to News
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

  // ── Page ──
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
      <div className="no-print sticky top-0 left-0 right-0 h-0.5 bg-gray-100 z-50">
        <div
          className="h-full bg-red-600 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Sticky top bar ── */}
      <div className="no-print sticky top-0.5 bg-white border-b border-gray-100 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center justify-between gap-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-0">
            <Link href="/" className="hover:text-gray-600 transition-colors shrink-0">Home</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link href={`/category/${article.category}`} className="hover:text-gray-600 transition-colors shrink-0 capitalize">
              {article.category}
            </Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="truncate text-gray-500">{article.title}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Listen (decorative) */}
            <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
              <Volume2 className="w-3.5 h-3.5" />
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
              {bookmarked
                ? <BookmarkCheck className="w-3.5 h-3.5" />
                : <Bookmark className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{bookmarked ? 'Saved' : 'Save'}</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            {/* Share */}
            <div className="relative" ref={shareRef}>
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
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
              <h1 className={`${slabo.className} text-3xl md:text-4xl font-bold text-gray-900 leading-tight`}>
                {article.title}
              </h1>

              {/* Standfirst / description */}
              <p className="text-md text-gray-600 leading-relaxed mb-4">
                {article.description}
              </p>

              {/* ── Author + meta row ── */}
              <div className="flex items-center justify-between gap-4 py-4 border-t border-b border-gray-100 mb-6 flex-wrap">
                <Link href={`/author/${authorSlug}`} className="flex items-center gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-gray-900 group-hover:bg-black transition-colors flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {authorInitials(article.author)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:underline leading-tight">
                      {article.author}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatFullDate(article.date)}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {readTime} min read
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {article.views >= 1000
                      ? `${(article.views / 1000).toFixed(1)}K views`
                      : `${article.views} views`}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-400">{formatRelativeTime(article.date)}</span>
                </div>
              </div>

              {/* ── Hero image ── */}
              <div className="mb-2">
                <div className="relative w-full aspect-video rounded overflow-hidden bg-gray-100">
                  <Image
                    src={article.image || 'https://placehold.net/1200x675.png'}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                {article.imageCaption && (
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    {article.imageCaption}
                  </p>
                )}
              </div>

              {/* ── Key points box ── */}
              {/* Render this if your article data includes a keyPoints array, otherwise remove */}
              {/* article.keyPoints?.length > 0 && (
                <div className="bg-gray-50 rounded border-l-4 border-red-600 px-5 py-4 mb-6">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Key points</h3>
                  <ul className="space-y-2">
                    {article.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ) */}

              {/* ── Article body ── */}
              <article className={`${slabo.className} text-gray-800 leading-[1.85] text-[17px] py-6 space-y-5`}>
                {/* Drop cap on first paragraph */}
                <p className="first-letter:text-[64px] first-letter:font-bold first-letter:float-left first-letter:leading-[0.82] first-letter:mr-2 first-letter:mt-1.5 first-letter:text-red-600">
                  {article.content}
                </p>
              </article>

              {/* ── Bottom share bar ── */}
              <div className="no-print pt-5 pb-2 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mr-1">Share</span>
                  <button
                    onClick={handleShareTwitter}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Twitter className="w-3.5 h-3.5 text-sky-500" />
                    X / Twitter
                  </button>
                  <button
                    onClick={handleShareFacebook}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Facebook className="w-3.5 h-3.5 text-blue-600" />
                    Facebook
                  </button>
                  <button
                    onClick={handleShareLinkedin}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-blue-700" />
                    LinkedIn
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-green-500" />
                      : <Link2 className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>

              {/* ── Author byline card ── */}


              {/* ── Related articles (grid) ── */}
              {relatedArticles.length > 0 && (
                <section className="no-print mt-12 pt-6 border-t-2 border-gray-900">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-900 mb-5">
                    More in {article.category}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {relatedArticles.map((a) => (
                      <NewsCard key={a.id} article={a} variant="default" />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ════════════════════ SIDEBAR ════════════════════ */}
            <aside className="no-print hidden lg:flex flex-col gap-8 w-72 xl:w-80 flex-shrink-0 pt-0">

              {/* Most read */}
              {mostRead.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-900 border-t-2 border-gray-900 pt-3 mb-1">
                    Most read
                  </h3>
                  <div>
                    {mostRead.map((a) => (
                      <RelatedItem key={a.id} article={a} />
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter sign-up */}
              <div className="bg-gray-50 rounded p-4 border border-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-red-600 mb-1">Newsletter</p>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 leading-snug">
                  Stay informed. Daily briefings from our newsroom.
                </h4>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Get the most important stories delivered to your inbox every morning.
                </p>
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded mb-2 outline-none focus:border-red-400 bg-white text-gray-800 placeholder-gray-400"
                />
                <button className="w-full text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors py-2 rounded">
                  Subscribe — it's free
                </button>
              </div>

              {/* On this topic */}
              {relatedArticles.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-900 border-t-2 border-gray-900 pt-3 mb-1">
                    On this topic
                  </h3>
                  <div>
                    {relatedArticles.slice(0, 2).map((a) => (
                      <RelatedItem key={a.id} article={a} />
                    ))}
                  </div>
                  <Link
                    href={`/category/${article.category}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 mt-3"
                  >
                    See all in {article.category}
                    <ChevronRight className="w-3.5 h-3.5" />
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