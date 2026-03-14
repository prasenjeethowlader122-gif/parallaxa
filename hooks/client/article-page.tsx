'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {spacegrotesk , slabo} from '@/lib/font'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getAllArticles, getArticleBySlug } from '@/lib/news-data'
import { Clock, User, Calendar, Eye, ArrowLeft, Share2, Printer, Twitter, Facebook, Linkedin, Link2, Check } from 'lucide-react'

export default function ArticlePage() {
  const params = useParams()
  const slug = params.slug as string
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

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
      setShareOpen(!shareOpen)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-500">Loading article...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Article Not Found</h1>
            <p className="text-gray-600">The article you're looking for doesn't exist.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // Slugify author name for profile link
  const authorSlug = article.author.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')

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

      <main className="flex-grow">
        {/* Article Header */}
        <div className="py-4">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
           

            <div className="flex items-center gap-2 mb-4">
              <Link
                href={`/category/${article.category}`}
                className="text-xs font-bold text-gray-600 uppercase bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
              >
                {article.category}
              </Link>
              {article.breaking && (
                <span className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">
                  Breaking
                </span>
              )}
              {article.trending && (
                <span className="bg-orange-500 text-white px-3 py-1 rounded text-xs font-bold">
                  Trending
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              {article.title}
            </h1>

            <p className={"text-sm text-gray-600 mb-6 "}>{article.description}</p>

            {/* Meta + Actions row */}
            <div className="flex flex-col items-start justify-start gap-4">
              <div className="flex flex-wrap items-center gap-5 text-sm text-gray-600">
                {/* Author with profile link */}
                <Link
                  href={`/author/${authorSlug}`}
                  className="flex items-center gap-2 hover:text-black transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-bold group-hover:bg-black transition-colors">
                    {article.author.charAt(0)}
                  </div>
                  <div className='flex flex-col items-start justify-start gap-2'>
                  <span className="font-medium text-sm group-hover:underline">{article.author}</span>
                                  <div className="flex items-center text-xs gap-1.5">
                  
                  <span>{formattedDate}</span>
                  </div>
                </div>
                </Link>
                
                </div>
              
                <div className = 'flex flex-row items-center justify-start gap-2 text-black w-full'>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>{(article.views / 1000).toFixed(1)}K views</span>
                </div>
              </div>

              {/* Share & Print Actions */}
              <div className="flex items-center gap-2 no-print">
                {/* Print */}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600  rounded-full border transition-colors"
                  title="Print article"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                {/* Share dropdown */}
                <div className="relative">
                  <button
                    onClick={handleNativeShare}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600  rounded-full border transition-colors"
                    title="Share article"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </button>

                  {shareOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 w-48 z-50">
                      <button
                        onClick={handleShareTwitter}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600  rounded-full border transition-colors"
                      >
                        <Twitter className="w-4 h-4 text-sky-500" />
                        Share on Twitter
                      </button>
                      <button
                        onClick={handleShareFacebook}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600  rounded-full border transition-colors"
                      >
                        <Facebook className="w-4 h-4 text-blue-600" />
                        Share on Facebook
                      </button>
                      <button
                        onClick={handleShareLinkedin}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600  rounded-full border transition-colors"
                      >
                        <Linkedin className="w-4 h-4 text-blue-700" />
                        Share on LinkedIn
                      </button>
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={handleCopyLink}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600  rounded-full border transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy link'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative w-full h-96 bg-gray-200">
          <Image
            src={article.image || 'https://placehold.net/600x400.png'}
            alt={article.title}
            fill
            className="object-cover aspect-video"
            priority
          />
        </div>

        {/* Article Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 print-content">
          <div className="prose prose-lg max-w-none">
            <article className={"text-gray-700 leading-relaxed space-y-6 " + slabo.className }>
              <p className="text-lg first-letter:font-bold first-letter:text-2xl">
                {article.content}
              </p>

            </article>
          </div>

          {/* Author Card */}
          <div className="mt-12 pt-8 border-t border-gray-200 no-print">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">About the Author</h3>
            <Link href={`/author/${authorSlug}`} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all group">
              <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 group-hover:bg-black transition-colors">
                {article.author.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-gray-900 group-hover:underline">{article.author}</p>
                <p className="text-sm text-gray-500 mt-0.5">Staff Writer · {article.category}</p>
                <p className="text-sm text-gray-400 mt-1">View all articles by this author →</p>
              </div>
            </Link>
          </div>

          {/* Bottom Share Bar */}

          
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="bg-gray-50 py-12 no-print">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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