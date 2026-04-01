'use client'

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useState, useEffect, useCallback } from 'react'
import { Loader2, MoreHorizontal } from 'lucide-react'

const ArticlesView = () => {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 12
  
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/articles/mine?page=${page}&limit=${limit}`)
      if (response.ok) {
        const data = await response.json()
        setArticles(Array.isArray(data) ? data : data.articles || [])
      }
    } catch (e) {
      console.error("Fetch error:", e)
    } finally {
      setLoading(false)
    }
  }, [page])
  
  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])
  
  return (
    <div className="w-full space-y-4 p-2">
      <div className="rounded-md border">
        <Table className = 'border-none'>
          <TableHeader>
            <TableRow>
              <TableHead>id</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Views</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : articles.map((ar: any) => (
              <TableRow key={ar.id}>
                <TableCell className="font-mono text-xs">{ar.id.slice(0, 3) + '—' + ar.id.slice(ar.id.length,3)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={ar.image} alt="" className="h-8 w-8 rounded object-cover" />
                    <span className="font-medium line-clamp-1">{ar.title.slice(0,15)+'...'}</span>
                  </div>
                </TableCell>
                <TableCell>{ar.views || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* shadcn Pagination Component */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => {
                e.preventDefault()
                if (page > 1) setPage(page - 1)
              }}
              aria-disabled={page === 1}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>

          <PaginationItem>
            <PaginationLink isActive>{page}</PaginationLink>
          </PaginationItem>

          {/* Optional: Add an ellipsis or next page number if you have totalCount from API */}
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => {
                e.preventDefault()
                if (articles.length === limit) setPage(page + 1)
              }}
              aria-disabled={articles.length < limit}
              className={articles.length < limit ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export default ArticlesView