
'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash,
  ArrowsDownUp,
  Gear,
  Check,
  X,
  SquaresFour,
  List,
  MonitorPlay
} from '@phosphor-icons/react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Business' },
  { id: 2, name: 'Technology' },
  { id: 3, name: 'Sports' },
  { id: 4, name: 'Entertainment' },
  { id: 5, name: 'Science' },
  { id: 6, name: 'Health' },
  { id: 7, name: 'World' },
];

interface HomeSection {
  id: number;
  title: string;
  type: string;
  category_id?: number | null;
  layout: string;
  limit_count: number;
  order_index: number;
  is_active: boolean;
}

export default function HomeSectionManager() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAddLoading , setAddLoading] = useState(false)
  const [newSection, setNewSection] = useState<Omit<HomeSection, 'id' | 'order_index'>>({
    title: '',
    type: 'latest',
    category_id: null,
    layout: 'grid',
    limit_count: 10,
    is_active: true
  });

  const [editSectionData, setEditSectionData] = useState<Omit<HomeSection, 'id' | 'order_index'>>({
    title: '',
    type: 'latest',
    category_id: null,
    layout: 'grid',
    limit_count: 10,
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
    fetchSections();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setCategories(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    if (editingId !== null) {
      const sec = sections.find(s => s.id === editingId);
      if (sec) {
        setEditSectionData({
          title: sec.title,
          type: sec.type,
          category_id: sec.category_id || null,
          layout: sec.layout,
          limit_count: sec.limit_count,
          is_active: sec.is_active
        });
      }
    }
  }, [editingId, sections]);

  const fetchSections = async () => {
    try {
      const res = await fetch('/api/admin/home-sections');
      if (!res.ok) throw new Error('Failed to fetch sections');
      const data = await res.json();
      if (data && Array.isArray(data)) {
        setSections(data);
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load sections');
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/home-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSection, order_index: sections.length })
      });
      if (res.ok) {
        toast.success('Section added');
        setIsAdding(false);
        setNewSection({
          title: '',
          type: 'latest',
          category_id: null,
          layout: 'grid',
          limit_count: 10,
          is_active: true
        });
        await fetchSections();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to add section');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to add section');
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdate = async (id: number, data: Partial<HomeSection>) => {
    try {
      const res = await fetch('/api/admin/home-sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      });
      if (res.ok) {
        toast.success('Section updated');
        setEditingId(null);
        fetchSections();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to update section');
      }
    } catch (error) {
      toast.error('Failed to update section');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`/api/admin/home-sections?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Section deleted');
        fetchSections();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to delete section');
      }
    } catch (error) {
      toast.error('Failed to delete section');
    }
  };

  const handleReorder = async (direction: 'up' | 'down', index: number) => {
    const newSections = [...sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    } else if (direction === 'down' && index < sections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    } else {
      return;
    }

    try {
      const res = await fetch('/api/admin/home-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', ids: newSections.map(s => s.id) })
      });
      if (res.ok) {
        setSections(newSections);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to reorder');
      }
    } catch (error) {
      toast.error('Failed to reorder');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Home Sections</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <Plus size={20} />
          Add Section
        </button>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <button onClick={() => handleReorder('up', index)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900">
                <ArrowsDownUp size={16} />
              </button>
            </div>

            <div className="flex-1">
              <div className="font-semibold text-lg text-slate-900">{section.title}</div>
              <div className="text-sm text-slate-500 flex gap-4 mt-1">
                <span className="capitalize">
                  {section.type === 'category' && section.category_id
                    ? `Category: ${categories.find(c => c.id === section.category_id)?.name || 'Unknown'}`
                    : section.type}
                </span>
                <span className="capitalize">{section.layout} layout</span>
                <span>{section.limit_count} articles</span>
                <span className={section.is_active ? 'text-green-600' : 'text-red-600'}>
                  {section.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingId(section.id)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              >
                <Gear size={20} />
              </button>
              <button
                onClick={() => handleDelete(section.id)}
                className="p-2 hover:bg-red-50 rounded-lg text-red-600"
              >
                <Trash size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 border border-slate-200 shadow-none">
            <h3 className="text-xl font-bold text-slate-900">Add New Section</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Title</label>
                <input
                  type="text"
                  value={newSection.title}
                  onChange={e => setNewSection({...newSection, title: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="Latest News"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Type</label>
                  <select
                    value={newSection.type}
                    onChange={e => setNewSection({...newSection, type: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="latest">Latest</option>
                    <option value="category">Category</option>
                    <option value="featured">Featured</option>
                    <option value="trending">Trending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Layout</label>
                  <select
                    value={newSection.layout}
                    onChange={e => setNewSection({...newSection, layout: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="slider">Slider</option>
                  </select>
                </div>
              </div>
              {newSection.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Category</label>
                  <select
                    value={newSection.category_id || ''}
                    onChange={e => setNewSection({...newSection, category_id: parseInt(e.target.value) || null})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Limit</label>
                  <input
                    type="number"
                    value={newSection.limit_count}
                    onChange={e => setNewSection({...newSection, limit_count: parseInt(e.target.value)})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={newSection.is_active}
                    onChange={e => setNewSection({...newSection, is_active: e.target.checked})}
                    id="is_active"
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active</label>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleAdd}
                className="flex-1 bg-slate-900 text-white py-2 rounded-xl hover:bg-slate-800 transition-colors font-bold"
              >
                {isAddLoading ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-slate-100 text-slate-900 py-2 rounded-xl hover:bg-slate-200 transition-colors font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 border border-slate-200 shadow-none">
            <h3 className="text-xl font-bold text-slate-900">Edit Section</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Title</label>
                <input
                  type="text"
                  value={editSectionData.title}
                  onChange={e => setEditSectionData({...editSectionData, title: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  placeholder="Latest News"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Type</label>
                  <select
                    value={editSectionData.type}
                    onChange={e => setEditSectionData({...editSectionData, type: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="latest">Latest</option>
                    <option value="category">Category</option>
                    <option value="featured">Featured</option>
                    <option value="trending">Trending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Layout</label>
                  <select
                    value={editSectionData.layout}
                    onChange={e => setEditSectionData({...editSectionData, layout: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="slider">Slider</option>
                  </select>
                </div>
              </div>
              {editSectionData.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Category</label>
                  <select
                    value={editSectionData.category_id || ''}
                    onChange={e => setEditSectionData({...editSectionData, category_id: parseInt(e.target.value) || null})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">Limit</label>
                  <input
                    type="number"
                    value={editSectionData.limit_count}
                    onChange={e => setEditSectionData({...editSectionData, limit_count: parseInt(e.target.value) || 0})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={editSectionData.is_active}
                    onChange={e => setEditSectionData({...editSectionData, is_active: e.target.checked})}
                    id="edit_is_active"
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="edit_is_active" className="text-sm font-medium text-slate-700">Active</label>
                </div>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => handleUpdate(editingId, editSectionData)}
                className="flex-1 bg-slate-900 text-white py-2 rounded-xl hover:bg-slate-800 transition-colors font-bold"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 bg-slate-100 text-slate-900 py-2 rounded-xl hover:bg-slate-200 transition-colors font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
