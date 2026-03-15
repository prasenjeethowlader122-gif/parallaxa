import Link from 'next/link'
import Image from 'next/image'
import { NewsArticle } from '@/lib/news-data'
import { Clock, Eye } from 'lucide-react'

interface NewsCardProps {
  article: NewsArticle
  variant ? : 'default' | 'featured' | 'horizontal'
  className ? : string
}

export function NewsCard({ article, variant = 'default', className }: NewsCardProps) {
  if (!article || !article.id) return null
  
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  
  const href = `/article/${article.slug || article.id}`
  
  const imageSrc = article.image || '/images/placeholder.jpg'
  
  if (variant === 'featured') {
    return (
      <Link href={href} className="block h-full">
        {/*
         * KEY FIX: The outer div and the image container both use h-full
         * so they fill whatever height the grid cell provides.
         * aspect-video is REMOVED — it fought the fixed grid-row height
         * and caused cards to overflow/overlap each other.
         * The image container is purely position:relative + fills parent.
         */}
        <div className={`group cursor-pointer overflow-hidden h-full flex flex-col ${className ?? ''}`}>
          {/* Image fills all available space */}
          <div className="relative w-full flex-1 overflow-hidden  bg-gray-200 min-h-0">
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
                            <span className="text-sm bg-white pr-2 text-black rounded-lg font-medium tracking-wide">
                {article.category}
              </span>
              <h3 className="text-white text-lg font-bold leading-tight line-clamp-3">
                {article.title}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                <span className="font-medium">{article.author}</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }
  
  if (variant === 'horizontal') {
    return (
      <Link href={href} className="block">
        <div className={`group flex gap-4 cursor-pointer min-h-[8rem] ${className ?? ''}`}>
          <div className="relative w-32 sm:w-40 h-32 flex-shrink-0 overflow-hidden  bg-gray-200">
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs  text-blue-600 font-medium tracking-wide">
                {article.category}
              </span>
          
            </div>
            <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors text-sm">
              {article.title}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-1 mt-1">{article.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {(article.views / 1000).toFixed(1)}K views
              </div>
            </div>
          </div>
        </div>
      </Link>
    )
  }
  
  // Default variant
  return (
    <Link href={href} className="block">
      <div className={`group cursor-pointer ${className ?? ''}`}>
        <div className="relative w-full h-48 overflow-hidden bg-gray-200 mb-3">
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {article.breaking && (
            <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">
              Breaking
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              {article.category}
            </span>
            {article.trending && (
              <span className="text-xs font-bold text-red-600">🔥 Trending</span>
            )}
          </div>
          <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors text-base">
            {article.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">{article.description}</p>
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>{formattedDate}</span>
            <span>{article.readTime} min read</span>
          </div>
        </div>
      </div>
    </Link>
  )
}