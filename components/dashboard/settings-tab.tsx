import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Icons } from './icons'
import { Card } from './ui'

interface Props {
  session: any
}

export function SettingsTab({ session }: Props) {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Account settings">
        <div className="p-5 flex flex-col gap-5">

          <div>
            <label
              htmlFor="displayName"
              className="block mb-1.5 uppercase tracking-widest"
              style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              defaultValue={session.user.name ?? ''}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color .15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--text-secondary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block mb-1.5 uppercase tracking-widest"
              style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              defaultValue={session.user.email ?? ''}
              disabled
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                background: 'var(--hover-bg)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                outline: 'none',
                cursor: 'not-allowed',
              }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Email cannot be changed here.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{
                background: saved ? '#3B6D11' : 'var(--text-primary)',
                color: 'var(--bg-primary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Danger zone">
        <div className="p-5">
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Irreversible actions. Be careful.
          </p>
          <button
            type="button"
            onClick={() => signOut({ redirect: true, redirectUrl: '/' })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
            style={{
              background: 'transparent',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {Icons.logout} Sign out
          </button>
        </div>
      </Card>
    </div>
  )
}
