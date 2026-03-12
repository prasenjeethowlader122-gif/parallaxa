'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getArticleById, getAllArticles , getArticleBySlug} from '@/lib/news-data'
import { Clock, User, Calendar, Eye, ArrowLeft } from 'lucide-react'

export default function ArticlePage({slug}) {
//  const params = useParams()
 // const slug = params.slug as string
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const foundArticle = getArticleBySlug(slug)
    if (foundArticle) {
      setArticle(foundArticle)
      const related = getAllArticles()
        .filter((a) => a.category === foundArticle.category && a.id !== foundArticle.id)
        .slice(0, 3)
      setRelatedArticles(related)
    }
    setIsLoading(false)
  }, [slug])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
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
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Article Header */}
        <div className="bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to News
            </Link>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-gray-600 uppercase bg-gray-200 px-3 py-1 rounded">
                {article.category}
              </span>
              {article.breaking && (
                <span className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">
                  Breaking
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance leading-tight">
              {article.title}
            </h1>

            <p className="text-xl text-gray-600 mb-6 text-balance">
              {article.description}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.readTime} min read</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{(article.views / 1000).toFixed(1)}K views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative w-full h-96 bg-gray-200">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Article Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="prose prose-lg max-w-none">
            <article className="text-gray-700 leading-relaxed space-y-6">
              <p className="text-lg first-letter:font-bold first-letter:text-2xl">
                {article.content}
              </p>

              {/* Additional paragraphs for better article experience */}
              <p>
                This article represents important developments in the field. Our journalists
                have compiled comprehensive information to ensure you have the complete picture.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                What This Means
              </h2>
              <p>
                Industry experts and analysts are weighing in on the implications of this story.
                The developments outlined above are expected to have significant consequences for
                the sector and broader economy.
              </p>

              <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">
                Looking Ahead
              </h2>
              <p>
                As this situation continues to develop, we'll be following closely and bringing
                you updates. Stay tuned to Parallaxa for the latest information and expert analysis.
              </p>
            </article>
          </div>

          {/* Share Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-gray-700 font-medium">Share this story:</span>
              <div className="flex gap-4">
                <a href="#" className="text-gray-600 hover:text-blue-500 transition-colors">
                  Twitter
                </a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Facebook
                </a>
                <a href="#" className="text-gray-600 hover:text-red-600 transition-colors">
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((article) => (
                  <NewsCard key={article.id} article={article} variant="default" />
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
