'use client'

import { useState } from 'react'
import {
  SidebarPanel,
  FieldLabel,
  FieldInput,
  FieldSelect,
  FieldTextarea,
  ToggleRow,
} from './SidebarPanel'
import type { EditorForm } from './useArticleEditor'
import { categories } from '@/lib/db/articles'

interface Props {
  form: EditorForm
  set: <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => void
  tags: string[]
  setTags: (tags: string[]) => void
  onDelete?: () => void
}

export function PublishPanel({ form, set, tags, setTags, onDelete }: Props) {
  const [tagInput, setTagInput] = useState('')

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const v = tagInput.trim()
    if (v && !tags.includes(v)) setTags([...tags, v])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  return (
    <>
      {/* ── Publish ───────────────────────────────────────────── */}
      <SidebarPanel title="Publish" defaultOpen>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Status</FieldLabel>
          <FieldSelect
            value={form.status}
            onChange={e => set('status', e.target.value as EditorForm['status'])}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </FieldSelect>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Schedule publish</FieldLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            <FieldInput
              type="date"
              value={form.scheduledDate}
              onChange={e => set('scheduledDate', e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            />
            <FieldInput
              type="time"
              value={form.scheduledTime}
              onChange={e => set('scheduledTime', e.target.value)}
              style={{ flex: 1, fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Publish date</FieldLabel>
          <FieldInput
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            style={{ fontSize: 12 }}
          />
        </div>

        <div>
          <FieldLabel>Visibility</FieldLabel>
          <FieldSelect
            value={form.visibility}
            onChange={e => set('visibility', e.target.value as EditorForm['visibility'])}
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="members">Members only</option>
          </FieldSelect>
        </div>
      </SidebarPanel>

      {/* ── Labels ────────────────────────────────────────────── */}
      <SidebarPanel title="Labels" defaultOpen>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Category</FieldLabel>
          <FieldSelect
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </FieldSelect>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Tags</FieldLabel>
          <FieldInput
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={addTag}
            placeholder="Add tag + Enter"
            style={{ marginBottom: 6 }}
          />
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {tags.map(tag => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 20,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      padding: 0,
                      fontSize: 13,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Article flags</FieldLabel>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {(['featured', 'breaking', 'trending'] as const).map(flag => {
              const active = form[flag]
              const colors: Record<string, { on: string; text: string; border: string }> = {
                featured: { on: '#fef3c7', text: '#92400e', border: '#d97706' },
                breaking: { on: '#fee2e2', text: '#b91c1c', border: '#dc2626' },
                trending: { on: '#e0f2fe', text: '#075985', border: '#0284c7' },
              }
              const c = colors[flag]
              return (
                <button
                  key={flag}
                  onClick={() => set(flag, !active)}
                  style={{
                    fontSize: 11,
                    padding: '3px 9px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    border: `0.5px solid ${active ? c.border : 'var(--border)'}`,
                    background: active ? c.on : 'var(--card-bg)',
                    color: active ? c.text : 'var(--text-tertiary)',
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 600,
                    transition: 'all 0.12s',
                  }}
                >
                  {flag.charAt(0).toUpperCase() + flag.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        <ToggleRow
          label="Read time override"
          sub="Auto-calculated otherwise"
          checked={form.readTimeOverride}
          onChange={v => set('readTimeOverride', v)}
        />
        {form.readTimeOverride && (
          <div style={{ marginTop: 8 }}>
            <FieldInput
              type="number"
              value={form.readTime}
              min={1}
              max={60}
              onChange={e => set('readTime', parseInt(e.target.value))}
              placeholder="Minutes"
            />
          </div>
        )}
      </SidebarPanel>

      {/* ── Advanced ──────────────────────────────────────────── */}
      <SidebarPanel title="Advanced">
        <ToggleRow
          label="Index by search engines"
          sub="Adds noindex meta if off"
          checked={!form.noIndex}
          onChange={v => set('noIndex', !v)}
        />
        <ToggleRow
          label="Allow comments"
          checked={form.allowComments}
          onChange={v => set('allowComments', v)}
        />
        <ToggleRow
          label="Show in RSS feed"
          checked={form.showInRss}
          onChange={v => set('showInRss', v)}
        />
        <ToggleRow
          label="AMP version"
          sub="Faster on mobile"
          checked={form.ampEnabled}
          onChange={v => set('ampEnabled', v)}
        />

        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <FieldLabel>301 Redirect URL</FieldLabel>
          <FieldInput
            value={form.redirectUrl}
            onChange={e => set('redirectUrl', e.target.value)}
            placeholder="https://…"
            type="url"
            style={{ fontSize: 12 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Custom CSS class</FieldLabel>
          <FieldInput
            value={form.cssClass}
            onChange={e => set('cssClass', e.target.value)}
            placeholder="my-article special"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}
          />
        </div>

        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              width: '100%',
              padding: '7px 14px',
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #fca5a5',
              background: 'transparent',
              color: '#b91c1c',
              cursor: 'pointer',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => ((e.target as HTMLButtonElement).style.background = '#fee2e2')}
            onMouseLeave={e => ((e.target as HTMLButtonElement).style.background = 'transparent')}
          >
            Delete this article
          </button>
        )}
      </SidebarPanel>
    </>
  )
}
