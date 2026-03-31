'use client'

import { useState } from 'react'

interface Props {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function SidebarPanel({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }} className = 'bg-white'>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Syne', sans-serif",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary)',
          }}
        >
          {title}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: 'var(--text-tertiary)',
          }}
        >
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── Field helpers ─────────────────────────────────────────────────────────────

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--text-tertiary)',
        marginBottom: 5,
        fontFamily: "'Syne', sans-serif",
      }}
    >
      {children}
    </label>
  )
}

export function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '7px 10px',
        fontSize: 13,
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        outline: 'none',
        fontFamily: "'DM Mono', monospace",
        ...props.style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--text-secondary)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
    />
  )
}

export function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        padding: '7px 10px',
        fontSize: 13,
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        outline: 'none',
        cursor: 'pointer',
        fontFamily: "'DM Mono', monospace",
        ...props.style,
      }}
    />
  )
}

export function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        padding: '7px 10px',
        fontSize: 13,
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        outline: 'none',
        resize: 'vertical',
        fontFamily: "'DM Mono', monospace",
        minHeight: 72,
        ...props.style,
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--text-secondary)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
    />
  )
}

interface ToggleRowProps {
  label: string
  sub?: string
  checked: boolean
  onChange: (v: boolean) => void
}

export function ToggleRow({ label, sub, checked, onChange }: ToggleRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 0',
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{sub}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 34,
          height: 19,
          borderRadius: 10,
          border: 'none',
          cursor: 'pointer',
          background: checked ? '#3B6D11' : 'var(--border)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 17 : 2,
            width: 15,
            height: 15,
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s',
            display: 'block',
          }}
        />
      </button>
    </div>
  )
}

export function CharCount({
  current,
  max,
}: {
  current: number
  max: number
}) {
  const pct = current / max
  const color = pct > 1 ? '#b91c1c' : pct > 0.85 ? '#854F0B' : '#3B6D11'
  return (
    <div style={{ textAlign: 'right', fontSize: 11, color, marginTop: 3 }}>
      {current} / {max}
    </div>
  )
}
