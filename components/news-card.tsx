import Link from 'next/link'
import Image from 'next/image'
import { Fugaz, banglaFont } from '@/lib/font'
import { NewsArticle } from '@/lib/db/articles'
import { Clock, Eye, Calendar, User, BookOpen } from '@phosphor-icons/react/ssr'

interface NewsCardProps {
  article: NewsArticle
  variant?: 'default' | 'featured' | 'horizontal'
  className?: string
}

export const toDigitalNumber = (numbers: number, suffix?: string, locale: "en" | "sa" = "en"): string => {
  if (numbers > 0) {
    if (locale === "sa") {
      if (numbers >= 10000000) {
        const crore = numbers / 10000000;
        const formatted = crore % 1 === 0 ? crore : parseFloat(crore.toFixed(2));
        return `${formatted}Cr${suffix ?? ""}`;
      } else if (numbers >= 100000) {
        const lakh = numbers / 100000;
        const formatted = lakh % 1 === 0 ? lakh : parseFloat(lakh.toFixed(2));
        return `${formatted}L${suffix ?? ""}`;
      } else if (numbers >= 1000) {
        const thousand = numbers / 1000;
        const formatted = thousand % 1 === 0 ? thousand : parseFloat(thousand.toFixed(2));
        return `${formatted}K${suffix ?? ""}`;
      }
      return suffix ? `${numbers}${suffix}` : String(numbers);
    }
    
    const formatted = new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
    }).format(numbers);
    return suffix ? `${formatted}${suffix}` : formatted;
  }
  return String(numbers);
};

export function NewsCard({ article, variant = 'default', className }: NewsCardProps) {
  if (!article || !article.id) return null
  
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  
  const href = `/article/${article.slug || article.id}`
  const authorHref = `/author/${article.author_id || 'unknown'}`
  
  const imageSrc = article.image || '/images/placeholder.jpg'
  
  if (variant === 'featured') {
    return (
      <div className={`group relative cursor-pointer overflow-hidden h-full flex flex-col rounded-2xl border border-slate-200/50 bg-white hover:border-slate-300 transition-all ${className ?? ''}`}>
        <Link href={href} className="absolute inset-0 z-10" />
        {/* Image container */}
        <div className="relative w-full flex-1 overflow-hidden bg-slate-100 min-h-[220px]">
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
            className="object-cover group-hover:scale-102 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
            {article.category && (
              <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2">
                {article.category}
              </span>
            )}
            
            <h3 className={`${Fugaz.className} text-white text-lg md:text-xl font-bold leading-snug line-clamp-3 mb-3`}>
              {article.title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-slate-200">
              <span className="flex items-center gap-1 font-medium hover:underline relative z-30">
                <User size={13} />
                <Link href={authorHref}>{article.author}</Link>
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (variant === 'horizontal') {
    return (
      <div className={`group flex gap-4 cursor-pointer rounded-2xl border border-slate-200/50 p-3 bg-white hover:border-slate-300 transition-all ${className ?? ''}`}>
        <div className="relative w-28 sm:w-36 h-28 flex-shrink-0 overflow-hidden bg-slate-100 rounded-xl">
          <Link href={href} className="absolute inset-0 z-10" />
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 112px, 144px"
            className="object-cover group-hover:scale-102 transition-transform duration-500"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                {article.category}
              </span>
              {article.breaking && (
                <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-1 rounded">BREAKING</span>
              )}
            </div>
            <h3 className={`${Fugaz.className} text-slate-900 line-clamp-2 group-hover:text-red-600 transition-colors text-sm font-bold leading-snug`}>
              <Link href={href}>{article.title}</Link>
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{article.description}</p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span className="flex items-center gap-1 font-medium hover:underline truncate">
              <Link href={authorHref}>{article.author}</Link>
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {toDigitalNumber(article.views)}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Default variant (card grid item)
  return (
    <div className={`group cursor-pointer rounded-2xl border border-slate-200/50 p-4 bg-white hover:border-slate-300 transition-all flex flex-col h-full justify-between ${className ?? ''}`}>
      <div>
        <div className="relative w-full h-44 overflow-hidden bg-slate-100 mb-3.5 rounded-xl">
          <Link href={href} className="absolute inset-0 z-10" />
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-102 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            {article.breaking && (
              <span className="bg-red-600 text-white px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                Breaking
              </span>
            )}
            {article.trending && (
              <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                🔥 Trending
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
            {article.category}
          </span>
          <h3 className={`${Fugaz.className} text-slate-900 line-clamp-2 group-hover:text-red-600 transition-colors text-base font-bold leading-snug`}>
            <Link href={href}>{article.title}</Link>
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{article.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 mt-4 border-t border-slate-100">
        <span className="flex items-center gap-1 font-medium hover:underline truncate">
          <User size={12} />
          <Link href={authorHref}>{article.author}</Link>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <BookOpen size={12} />
          {article.readTime || 3} min read
        </span>
      </div>
    </div>
  )
}
