import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name?: string | null
  role?: string
}

interface Session {
  user: User
}

let cachedSession: Session | null = null
let cachedToken: string | null = localStorage.getItem('auth_token')

const listeners: Set<() => void> = new Set()

function notifyListeners() {
  listeners.forEach(fn => fn())
}

export function getToken() {
  return cachedToken
}

export function setToken(token: string | null) {
  cachedToken = token
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
    cachedSession = null
  }
  notifyListeners()
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(cachedSession)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>(
    cachedToken ? 'loading' : 'unauthenticated'
  )

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setStatus('unauthenticated')
      return
    }

    if (cachedSession) {
      setSession(cachedSession)
      setStatus('authenticated')
      return
    }

    fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          cachedSession = { user: data.user }
          setSession(cachedSession)
          setStatus('authenticated')
        } else {
          setStatus('unauthenticated')
          setToken(null)
        }
      })
      .catch(() => {
        setStatus('unauthenticated')
      })
  }, [])

  useEffect(() => {
    const handler = () => {
      setSession(cachedSession)
      setStatus(cachedSession ? 'authenticated' : 'unauthenticated')
    }
    listeners.add(handler)
    return () => { listeners.delete(handler) }
  }, [])

  return { data: session, status }
}

export async function signIn(_provider: string, options?: { email?: string; password?: string; redirectTo?: string; callbackUrl?: string }) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: options?.email, password: options?.password }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error }
    setToken(data.token)
    cachedSession = { user: data.user }
    notifyListeners()
    const redirect = options?.redirectTo || options?.callbackUrl || '/'
    window.location.href = redirect
    return { ok: true }
  } catch {
    return { error: 'Login failed' }
  }
}

export async function signOut(options?: { redirectTo?: string }) {
  setToken(null)
  cachedSession = null
  notifyListeners()
  window.location.href = options?.redirectTo || '/bn/auth/signin'
}
