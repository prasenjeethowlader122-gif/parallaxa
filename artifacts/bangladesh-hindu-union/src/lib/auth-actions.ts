import { setToken } from '@/hooks/use-session'

export async function registerAction(formData: FormData) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    }),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error }
  return { success: true, redirect: '/bn/auth/signin?registered=true' }
}

export async function loginAction(formData: FormData) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.get('email'),
      password: formData.get('password'),
    }),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error }
  setToken(data.token)
  return { success: true, redirect: '/dashboard' }
}

export async function logoutAction() {
  setToken(null)
  window.location.href = '/bn/auth/signin'
}

export async function forgotPasswordAction(formData: FormData) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.get('email') }),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error }
  return { success: 'Password reset link sent.' }
}

export async function resetPasswordAction(formData: FormData) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: formData.get('token'),
      password: formData.get('password'),
    }),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error }
  return { success: true, redirect: '/bn/auth/signin?reset=true' }
}
