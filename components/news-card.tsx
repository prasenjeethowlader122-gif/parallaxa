import Link from 'next/link'
import Image from 'next/image'
import {Fugaz} from '@/lib/font'
import { NewsArticle } from '@/lib/db/articles'
import { Eye, TrendUp } from '@phosphor-icons/react/dist/ssr'

interface NewsCardProps {
  article: NewsArticle
  variant ? : 'default' | 'featured' | 'horizontal'
  className ? : string
}
export const toDigitalNumber = (numbers: number, suffix ? : string, locale: "en" | "sa" = "en"): string => {
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
  
  const imageSrc = article.image || '/images/placeholder.jpg'
  
  if (variant === 'featured') {
    return (
      <Link href={href} className="block h-full">
        <div className={`group cursor-pointer overflow-hidden h-full flex flex-col rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${className ?? ''}`}>
          <div className="relative w-full flex-1 overflow-hidden bg-slate-100 min-h-[200px]">
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
               <span className="inline-block px-2 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest mb-3 border border-white/10">
                {article.category}
              </span>
              <h3 className={Fugaz.className + " text-white text-2xl font-black leading-tight line-clamp-3 mb-2"}>
                {article.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-white/70 font-bold uppercase tracking-widest">
                <span>{article.author}</span>
                <span className="w-1 h-1 rounded-full bg-white/40"></span>
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
        <div className={`group flex gap-4 cursor-pointer p-3 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all duration-300 ${className ?? ''}`}>
          <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden bg-slate-100 rounded-xl">
            <Image
              src={imageSrc}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 128px, 160px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">
              {article.category}
            </span>
            <h3 className={Fugaz.className + " text-slate-950 font-bold line-clamp-2 group-hover:text-primary transition-colors text-sm mb-1.5"}>
              {article.title}
            </h3>
            <div className="flex items-center gap-4 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
               <div className="flex items-center gap-1">
                 <Eye size={16} />
                 {toDigitalNumber(article.views)}
               </div>
               <span>{article.readTime} min read</span>
            </div>
          </div>
        </div>
      </Link>
    )
  }
  
  // Default variant
  return (
    <Link href={href} className="block">
      <div className={`group cursor-pointer rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${className ?? ''}`}>
        <div className="relative w-full h-56 overflow-hidden bg-slate-100">
          <Image
            src={imageSrc}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {article.breaking && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-red-600/20">
              Breaking
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {article.category}
            </span>
            {article.trending && (
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                <TrendUp size={14} weight="bold" />
                Trending
              </span>
            )}
          </div>
          <h3 className={Fugaz.className + " text-slate-950 text-lg font-black leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors"}>
            {article.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium leading-relaxed">{article.description}</p>
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-4 border-t border-slate-100">
            <span>{formattedDate}</span>
            <div className="flex items-center gap-1">
               <Eye size={14} />
               {toDigitalNumber(article.views)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
