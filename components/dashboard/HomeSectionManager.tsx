'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash, DotsSixVertical, Check, X, PencilSimple, CaretUp, CaretDown } from '@phosphor-icons/react/ssr'
import type { HomeSection, SectionType } from '@/lib/db/home-sections'
import { toast } from 'sonner'

export default function HomeSectionManager() {
  const [sections, setSections] = useState<HomeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newSection, setNewSection] = useState<Partial<HomeSection> | null>(null)

  useEffect(() => {
    fetchSections()
  }, [])

  const fetchSections = async () => {
    try {
      const res = await fetch('/api/admin/home-sections')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSections(data)
    } catch (err) {
      toast.error('Failed to load sections')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (section: Partial<HomeSection>) => {
    try {
      const isNew = !section.id
      const res = await fetch('/api/admin/home-sections', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(section)
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success(isNew ? 'Section created' : 'Section updated')
      setEditingId(null)
      setNewSection(null)
      fetchSections()
    } catch (err) {
      toast.error('Failed to save section')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this section?')) return
    try {
      const res = await fetch(`/api/admin/home-sections?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Section deleted')
      fetchSections()
    } catch (err) {
      toast.error('Failed to delete section')
    }
  }

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sections.length) return

    const temp = newSections[index]
    newSections[index] = newSections[targetIndex]
    newSections[targetIndex] = temp

    // Update order indices
    const updatedWithOrder = newSections.map((s, i) => ({ ...s, orderIndex: i }))
    setSections(updatedWithOrder)

    try {
      const res = await fetch('/api/admin/home-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedWithOrder.map(s => ({ id: s.id, orderIndex: s.orderIndex })))
      })
      if (!res.ok) throw new Error('Failed to update order')
    } catch (err) {
      toast.error('Failed to save new order')
      fetchSections()
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading home sections...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Home View Sections</h2>
          <p className="text-sm text-slate-500">Manage what appears on your home page.</p>
        </div>
        <button
          onClick={() => setNewSection({ title: '', type: 'horizontal', category: '', limit: 6, isActive: true, orderIndex: sections.length })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all"
        >
          <Plus size={18} />
          Add Section
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700">Order</th>
                <th className="px-6 py-4 font-bold text-slate-700">Title</th>
                <th className="px-6 py-4 font-bold text-slate-700">Type</th>
                <th className="px-6 py-4 font-bold text-slate-700">Category</th>
                <th className="px-6 py-4 font-bold text-slate-700">Limit</th>
                <th className="px-6 py-4 font-bold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {newSection && (
                <SectionRow
                  section={newSection as HomeSection}
                  isEditing={true}
                  onSave={handleSave}
                  onCancel={() => setNewSection(null)}
                />
              )}
              {sections.map((section, index) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  isEditing={editingId === section.id}
                  onEdit={() => setEditingId(section.id)}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => handleDelete(section.id)}
                  onMoveUp={() => moveSection(index, 'up')}
                  onMoveDown={() => moveSection(index, 'down')}
                  isFirst={index === 0}
                  isLast={index === sections.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SectionRow({
  section,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: {
  section: HomeSection,
  isEditing: boolean,
  onEdit?: () => void,
  onSave: (s: Partial<HomeSection>) => void,
  onCancel: () => void,
  onDelete?: () => void,
  onMoveUp?: () => void,
  onMoveDown?: () => void,
  isFirst?: boolean,
  isLast?: boolean
}) {
  const [formData, setFormData] = useState(section)

  const types: SectionType[] = ['featured', 'horizontal', 'grid', 'breaking', 'trending']

  if (isEditing) {
    return (
      <tr className="bg-slate-50/50">
        <td className="px-6 py-4">-</td>
        <td className="px-6 py-4">
          <input
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10 outline-none"
            placeholder="Section Title"
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as SectionType })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10 outline-none"
          >
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td className="px-6 py-4">
          <input
            value={formData.category || ''}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10 outline-none"
            placeholder="Category Name"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            value={formData.limit}
            onChange={e => setFormData({ ...formData, limit: parseInt(e.target.value) })}
            className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-slate-900/10 outline-none"
          />
        </td>
        <td className="px-6 py-4 text-right space-x-2">
          <button onClick={() => onSave(formData)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <Check size={18} weight="bold" />
          </button>
          <button onClick={onCancel} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <X size={18} weight="bold" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <button
            disabled={isFirst}
            onClick={onMoveUp}
            className="p-1 text-slate-400 hover:text-slate-950 disabled:opacity-30"
          >
            <CaretUp size={14} weight="bold" />
          </button>
          <button
            disabled={isLast}
            onClick={onMoveDown}
            className="p-1 text-slate-400 hover:text-slate-950 disabled:opacity-30"
          >
            <CaretDown size={14} weight="bold" />
          </button>
        </div>
      </td>
      <td className="px-6 py-4 font-medium text-slate-900">{section.title}</td>
      <td className="px-6 py-4">
        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
          {section.type}
        </span>
      </td>
      <td className="px-6 py-4 text-slate-500">{section.category || 'All Categories'}</td>
      <td className="px-6 py-4 text-slate-500">{section.limit}</td>
      <td className="px-6 py-4 text-right space-x-2">
        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors">
          <PencilSimple size={18} />
        </button>
        <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash size={18} />
        </button>
      </td>
    </tr>
  )
}
