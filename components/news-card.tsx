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
  
  // ─── Featured ────────────────────────────────────────────────────────────────
  if (variant === 'featured') {
    return (
      <Link href={href} className={`group block ${className ?? ''}`}>
        {/* Image with overlay */}
        <div className="relative w-full h-80 overflow-hidden rounded-xl bg-gray-100">
          <Image
            src={article.image}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Gradient: bottom-heavy so text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className="inline-block bg-red-600 text-white px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase mb-2">
              Featured
            </span>
            <h3 className="text-white text-xl font-bold leading-snug line-clamp-2">
              {article.title}
            </h3>
          </div>
        </div>

        {/* Below-image content */}
        <div className="pt-3 space-y-2">
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
            {article.description}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{article.author}</span>
            <span className="text-gray-300">·</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </Link>
    )
  }
  
  // ─── Horizontal ───────────────────────────────────────────────────────────────
  if (variant === 'horizontal') {
    return (
      <Link href={href} className={`group flex gap-3 ${className ?? ''}`}>
        {/* Fixed-size thumbnail — narrow enough that the text column gets room */}
        <div className="relative w-28 h-[84px] flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <Image
            src={article.image}
            alt={article.title}
            fill
            sizes="112px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Text — min-w-0 prevents flex blowout */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          {/* Category + Breaking */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {article.category}
            </span>
            {article.breaking && (
              <span className="bg-red-600 text-white px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wide">
                Breaking
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
            {article.title}
            
          </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {article.description}
        </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.readTime} min
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {(article.views / 1000).toFixed(1)}K
            </span>
          </div>
        </div>
      </Link>
    )
  }
  
  // ─── Default ──────────────────────────────────────────────────────────────────
  return (
    <Link href={href} className={`group block ${className ?? ''}`}>
      {/* Thumbnail */}
      <div className="relative w-full h-48 overflow-hidden rounded-xl bg-gray-100 mb-3">
        <Image
          src={article.image}
          alt={article.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {article.breaking && (
          <div className="absolute top-2.5 left-2.5">
            <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide">
              Breaking
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="space-y-1.5">
        {/* Category + Trending inline */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            {article.category}
          </span>
          {article.trending && (
            <span className="text-[11px] font-semibold text-red-500">🔥 Trending</span>
          )}
        </div>

        <h3 className="font-bold text-gray-900 text-md leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
          {article.title}
        </h3>

        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-2 -mt-2">
          {article.description}
        </p>

        {/* Meta: date left, read time right */}
        <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
          <span>{formattedDate}</span>
          <span>{article.readTime} min read</span>
        </div>
      </div>
    </Link> 
  )
}


