'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, SquareArrowOutUpRight, Search, ChevronDown } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useRouter } from 'next/navigation'

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
]

function getInitials(title: string) {
  return title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

type Article = {
  id: string
  title: string
  image?: string
  date: string
  views?: number
}

type ModalState = {
  open: boolean
  article: Article | null
}

const ArticlesView = () => {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionOpen, setActionOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false, article: null })
  const [editTitle, setEditTitle] = useState('')
  const [editViews, setEditViews] = useState('')
  const [editBio, setEditBio] = useState('')
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
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Close dropdown on outside click
  useEffect(() => {
    if (!actionOpen) return
    const handler = () => setActionOpen(false)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [actionOpen])

  const filtered = articles.filter((ar) =>
    ar.title.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((ar) => ar.id)))
    }
    setSelectAll(!selectAll)
  }

  const toggleRow = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
    setSelectAll(next.size === filtered.length)
  }

  const openModal = (article: Article) => {
    setModal({ open: true, article })
    setEditTitle(article.title)
    setEditViews(String(article.views ?? 0))
    setEditBio('')
  }

  const closeModal = () => setModal({ open: false, article: null })

  return (
    <div className="w-full space-y-4 p-2">
      {/* Table Card */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-gray-100">
          {/* Action Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setActionOpen((v) => !v) }}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition"
            >
              Action
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {actionOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-md py-1"
                onClick={(e) => e.stopPropagation()}
              >
                {['Reward', 'Promote', 'Archive'].map((item) => (
                  <button
                    key={item}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setActionOpen(false)}
                  >
                    {item}
                  </button>
                ))}
                <hr className="my-1 border-gray-100" />
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50"
                  onClick={() => setActionOpen(false)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 w-56 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="h-24 text-center text-gray-400 text-sm">
                  No articles found.
                </td>
              </tr>
            ) : (
              filtered.map((ar, i) => {
                const color = getAvatarColor(i)
                const initials = getInitials(ar.title)
                const isSelected = selected.has(ar.id)
                return (
                  <tr
                    key={ar.id}
                    className={`border-b border-gray-100 last:border-0 transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(ar.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                      />
                    </td>

                    {/* Article info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {ar.image ? (
                          <img
                            src={ar.image}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${color.bg} ${color.text}`}>
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 leading-none mb-1 truncate max-w-[200px]">
                            {ar.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <SquareArrowOutUpRight className="w-3 h-3" />
                            <span>Article #{((page - 1) * limit) + (i + 1)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(ar.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Views */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-gray-600">{(ar.views ?? 0).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openModal(ar)}
                        className="text-indigo-600 hover:underline font-medium text-sm"
                      >
                        Edit
                      </button>
                      <span className="mx-1.5 text-gray-300">|</span>
                      <button
                        onClick={() => router.push(`/write?id=${ar.id}`)}
                        className="text-gray-500 hover:text-gray-800 font-medium text-sm"
                      >
                        Write
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1) }}
              className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive>{page}</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => { e.preventDefault(); if (articles.length === limit) setPage(page + 1) }}
              className={articles.length < limit ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Edit Modal */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit article</h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 17.94 6M18 18 6.06 6" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Views</label>
                <input
                  type="text"
                  value={editViews}
                  onChange={(e) => setEditViews(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400">
                  <option>Published</option>
                  <option>Draft</option>
                  <option>Archived</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Add internal notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                Update article
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ArticlesView