'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { slabo } from '@/lib/font'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getAllArticles, getArticleBySlug } from '@/lib/news-data'
import {
  Clock, User, Calendar, Eye, ArrowLeft,
  Share2, Printer, Twitter, Facebook, Linkedin, Link2, Check,
} from 'lucide-react'

export default function ArticlePage() {
  const params = useParams()
  const slug = params.slug as string
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const foundArticle = await getArticleBySlug(slug)
        if (foundArticle) {
          setArticle(foundArticle)
          const all = await getAllArticles()
          const related = all
            .filter((a) => a.category === foundArticle.category && a.id !== foundArticle.id)
            .slice(0, 3)
          setRelatedArticles(related)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    loadArticle()
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

  const handlePrint = () => window.print()

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShareTwitter = () => {
    const text = encodeURIComponent(article?.title ?? '')
    const url = encodeURIComponent(window.location.href)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
  }

  const handleShareLinkedin = () => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(article?.title ?? '')
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank')
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: article?.title,
        text: article?.description,
        url: window.location.href,
      })
    } else {
      setShareOpen((prev) => !prev)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-gray-500 text-sm">Loading article…</div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!article) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Article Not Found</h1>
            <p className="text-gray-500">The article you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const authorSlug = article.author
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')

  // ── Page ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Print styles */}
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          .print-content { max-width: 100% !important; }
        }
      `}</style>

      <main className="flex-1">

        {/* ── Article header ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Link
              href={`/category/${article.category}`}
              className="text-xs font-semibold text-gray-500 uppercase bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors tracking-wide"
            >
              {article.category}
            </Link>
            {article.breaking && (
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Breaking
              </span>
            )}
            {article.trending && (
              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Trending
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            {article.title}
          </h1>

          {/* Description — clamped to 2 lines */}
          <p
            className="text-sm text-gray-500 mb-6 leading-relaxed"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {article.description}
          </p>

          {/* Meta row */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-gray-100 flex-wrap">

            {/* Author + date */}
            <Link
              href={`/author/${authorSlug}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-9 h-9 rounded-full bg-gray-800 group-hover:bg-black transition-colors flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {article.author.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:underline">
                  {article.author}
                </p>
                <p className="text-xs text-gray-400">{formattedDate}</p>
              </div>
            </Link>

            {/* Views + actions */}
            <div className="flex items-center gap-2 no-print">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 pr-1">
                <Eye className="w-3.5 h-3.5" />
                {(article.views / 1000).toFixed(1)}K
              </span>

              {/* Print */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Share */}
              <div className="relative" ref={shareRef}>
                <button
                  onClick={handleNativeShare}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                {shareOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-1.5 w-52 z-50">
                    <button
                      onClick={handleShareTwitter}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <Twitter className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      Share on Twitter
                    </button>
                    <button
                      onClick={handleShareFacebook}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <Facebook className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      Share on Facebook
                    </button>
                    <button
                      onClick={handleShareLinkedin}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-blue-700 flex-shrink-0" />
                      Share on LinkedIn
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      {copied
                        ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        : <Link2 className="w-4 h-4 flex-shrink-0" />}
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Featured image ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
            <Image
              src={article.image || 'https://placehold.net/600x400.png'}
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

        {/* ── Article body ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 print-content">
          <article className={`text-gray-700 leading-relaxed text-base space-y-5 ${slabo.className}`}>
            <p className="first-letter:text-5xl first-letter:font-bold first-letter:float-left first-letter:leading-none first-letter:mr-2 first-letter:mt-1">
              {article.content}
            </p>
          </article>
        </div>

      

        {/* ── Bottom share bar ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 no-print">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 mr-1">Share</span>
            <button
              onClick={handleShareTwitter}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Twitter className="w-3.5 h-3.5 text-sky-500" />
              Twitter
            </button>
            <button
              onClick={handleShareFacebook}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Facebook className="w-3.5 h-3.5 text-blue-600" />
              Facebook
            </button>
            <button
              onClick={handleShareLinkedin}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Linkedin className="w-3.5 h-3.5 text-blue-700" />
              LinkedIn
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs text-gray-500 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-green-500" />
                : <Link2 className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        {/* ── Related articles ── */}
        {relatedArticles.length > 0 && (
          <section className="bg-gray-50 py-12 no-print">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Related articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedArticles.map((a) => (
                  <NewsCard key={a.id} article={a} variant="default" />
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  )
}