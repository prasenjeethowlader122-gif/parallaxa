'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Loader2, MoreVertical, Pencil, Trash2, Eye, 
  BarChart3, Calendar, ChevronRight 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const ArticlesView = () => {
  const router = useRouter()
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/articles/mine?page=${page}&limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        setArticles(Array.isArray(data) ? data : data.articles || [])
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Your Articles</h2>
        <Badge variant="secondary" className="px-3 py-1">{articles.length} Total</Badge>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex flex-col items-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Curating your content...</p>
          </div>
        ) : (
          articles.map((ar) => (
            <div 
              key={ar.id}
              className="group relative flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:border-blue-200"
            >
              {/* Thumbnail */}
              <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100 shrink-0">
                <img 
                  src={ar.image} 
                  alt="" 
                  className="h-full w-full object-cover transition-transform group-hover:scale-105" 
                />
              </div>

              {/* Content Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 border-blue-100 bg-blue-50">
                    Published
                  </Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {ar.date || 'Jan 12, 2026'}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 truncate pr-4">
                  {ar.title}
                </h3>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                    {ar.views?.toLocaleString() || 0} <span className="font-normal">views</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hidden md:flex rounded-full hover:bg-blue-50 hover:text-blue-600"
                  onClick={() => router.push(`/write?id=${ar.id}`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl border-slate-100">
                    <DropdownMenuItem className="py-2.5">
                      <Eye className="mr-2 h-4 w-4" /> View Live
                    </DropdownMenuItem>
                    <DropdownMenuItem className="py-2.5 text-destructive focus:bg-red-50 focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <div className="pl-2 border-l border-slate-100 ml-2 hidden sm:block">
                   <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ArticlesView