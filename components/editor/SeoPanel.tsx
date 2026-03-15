'use client'

import type { SeoAnalysis } from '@/lib/seo'
import {
  SidebarPanel,
  FieldLabel,
  FieldInput,
  FieldTextarea,
  FieldSelect,
  CharCount,
} from './SidebarPanel'
import type { EditorForm } from './useArticleEditor'
import { slugify } from './useArticleEditor'

interface Props {
  form: EditorForm
  set: <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => void
  seoAnalysis: SeoAnalysis | null
}

const dotColor: Record<'good' | 'warn' | 'bad', string> = {
  good: '#3B6D11',
  warn: '#854F0B',
  bad:  '#A32D2D',
}

const dotBg: Record<'good' | 'warn' | 'bad', string> = {
  good: '#EAF3DE',
  warn: '#FAEEDA',
  bad:  '#FCEBEB',
}

export function SeoPanel({ form, set, seoAnalysis }: Props) {
  const slug = slugify(form.title)

  return (
    <>
      {/* SEO Score */}
      <SidebarPanel title="SEO" defaultOpen>
        {seoAnalysis && (
          <>
            {/* Score bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--card-bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 5,
                  background: 'var(--border)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    borderRadius: 3,
                    width: `${seoAnalysis.score}%`,
                    background:
                      seoAnalysis.score >= 70 ? '#3B6D11' :
                      seoAnalysis.score >= 50 ? '#854F0B' : '#A32D2D',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color:
                    seoAnalysis.score >= 70 ? '#3B6D11' :
                    seoAnalysis.score >= 50 ? '#854F0B' : '#A32D2D',
                  minWidth: 28,
                  textAlign: 'right',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {seoAnalysis.score}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: dotBg[seoAnalysis.score >= 70 ? 'good' : seoAnalysis.score >= 50 ? 'warn' : 'bad'],
                  color: dotColor[seoAnalysis.score >= 70 ? 'good' : seoAnalysis.score >= 50 ? 'warn' : 'bad'],
                }}
              >
                {seoAnalysis.grade}
              </span>
            </div>

            {/* Checks */}
            <div style={{ marginBottom: 14 }}>
              {seoAnalysis.checks.map(check => (
                <div
                  key={check.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 7,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: dotColor[check.status],
                      flexShrink: 0,
                      marginTop: 3,
                    }}
                  />
                  <span>{check.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Focus keyword */}
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Focus keyword</FieldLabel>
          <FieldInput
            value={form.focusKeyword}
            onChange={e => set('focusKeyword', e.target.value)}
            placeholder="e.g. artificial intelligence"
          />
        </div>

        {/* SEO title */}
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>SEO title</FieldLabel>
          <FieldInput
            value={form.seoTitle}
            onChange={e => set('seoTitle', e.target.value)}
            placeholder="Override for search engines…"
          />
          <CharCount current={form.seoTitle.length} max={60} />
        </div>

        {/* Meta description */}
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Meta description</FieldLabel>
          <FieldTextarea
            value={form.metaDescription}
            onChange={e => set('metaDescription', e.target.value)}
            placeholder="Summarise the article for search engines…"
            rows={3}
          />
          <CharCount current={form.metaDescription.length} max={160} />
        </div>

        {/* URL slug */}
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>URL slug</FieldLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              /article/
            </span>
            <input
              value={slug}
              readOnly
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: 12,
                background: 'var(--hover-bg)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                outline: 'none',
                fontFamily: "'DM Mono', monospace",
              }}
            />
          </div>
        </div>

        {/* Canonical URL */}
        <div style={{ marginBottom: 0 }}>
          <FieldLabel>Canonical URL</FieldLabel>
          <FieldInput
            value={form.canonicalUrl}
            onChange={e => set('canonicalUrl', e.target.value)}
            placeholder="https://…"
            type="url"
            style={{ fontSize: 12, fontFamily: "'DM Mono', monospace" }}
          />
        </div>
      </SidebarPanel>

      {/* Social preview */}
      <SidebarPanel title="Social preview">
        {/* OG card mockup */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          <div
            style={{
              height: 90,
              background: 'var(--hover-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 11,
            }}
          >
            {form.ogImage || form.image ? 'OG image set ✓' : 'No OG image'}
          </div>
          <div
            style={{
              padding: '10px 12px',
              background: 'var(--card-bg)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 3,
              }}
            >
              yoursite.com
            </div>
            <div
              style={{
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 3,
                lineHeight: 1.35,
                fontSize: 13,
              }}
            >
              {form.seoTitle || form.title || 'Article title will appear here'}
            </div>
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: 11,
                lineHeight: 1.45,
              }}
            >
              {form.metaDescription || form.description || 'Meta description will appear here…'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <FieldLabel>OG image URL</FieldLabel>
          <FieldInput
            value={form.ogImage}
            onChange={e => set('ogImage', e.target.value)}
            placeholder="https://… (or uses featured image)"
            type="url"
            style={{ fontSize: 12 }}
          />
        </div>

        <div>
          <FieldLabel>Twitter card type</FieldLabel>
          <FieldSelect
            value={form.twitterCard}
            onChange={e => set('twitterCard', e.target.value as EditorForm['twitterCard'])}
          >
            <option value="summary_large_image">summary_large_image</option>
            <option value="summary">summary</option>
            <option value="app">app</option>
          </FieldSelect>
        </div>
      </SidebarPanel>
    </>
  )
}
