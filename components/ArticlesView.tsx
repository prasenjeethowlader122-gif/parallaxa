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
// --- New Imports ---
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
// -------------------
import { useState, useEffect, useCallback } from 'react'
import { Loader2, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'

const ArticlesView = () => {
  const router = useRouter() // For redirection
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
        <Table className='border-none'>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">No:</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : articles.map((ar: any, i) => (
              <TableRow key={ar.id}>
                {/* Fixed the exponential display to a simple index + offset */}
                <TableCell className="text-xs font-mono">
                  {((page - 1) * limit) + (i + 1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={ar.image} alt="" className="h-10 w-10 rounded-md object-cover bg-muted" />
                    <div className='flex flex-col items-start justify-start' >
                      <span className="font-medium leading-none mb-1">
                        {ar.title.length > 30 ? ar.title.slice(0, 30) + '...' : ar.title}
                      </span>
                      <small className="text-muted-foreground">{ar.views || 0} views</small>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => router.push(`/write?id=${ar.id}`)}
                        className="cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Article
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4" />
                        View Live
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => {
                e.preventDefault()
                if (page > 1) setPage(page - 1)
              }}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive>{page}</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => {
                e.preventDefault()
                if (articles.length === limit) setPage(page + 1)
              }}
              className={articles.length < limit ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export default ArticlesView