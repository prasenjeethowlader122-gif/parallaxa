'use client'

import { useState, useRef } from 'react'

interface Props {
  value: string
  onChange: (url: string) => void
}

export function FeaturedImageUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // Swap this fetch for your actual upload endpoint
      // const res = await fetch('/api/upload', { method: 'POST', body: formData })
      // const { url } = await res.json()
      // onChange(url)

      // Demo: create a local object URL
      const url = URL.createObjectURL(file)
      onChange(url)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  if (value) {
    return (
      <div
        style={{
          marginTop: 20,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Featured"
          style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--hover-bg)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span>Featured image</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--card-bg)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Replace
            </button>
            <button
              onClick={() => onChange('')}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                border: '1px solid #fca5a5',
                borderRadius: 6,
                background: 'transparent',
                color: '#b91c1c',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      style={{
        marginTop: 20,
        border: '1px dashed var(--border)',
        borderRadius: 8,
        padding: '28px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--text-secondary)'
        el.style.background = 'var(--hover-bg)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor = 'var(--border)'
        el.style.background = 'transparent'
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 6, color: 'var(--text-tertiary)' }}>⬚</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>
        {uploading ? 'Uploading…' : 'Add featured image'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        Click to upload or drag and drop · PNG, JPG, WebP up to 5 MB
      </div>

      {/* URL input fallback */}
      <div
        style={{ marginTop: 14 }}
        onClick={e => e.stopPropagation()}
      >
        <input
          type="url"
          placeholder="Or paste an image URL…"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onChange((e.target as HTMLInputElement).value)
            }
          }}
          style={{
            fontSize: 12,
            padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            width: '100%',
            maxWidth: 320,
            outline: 'none',
            fontFamily: "'DM Mono', monospace",
          }}
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
