import { useSession } from '@/hooks/use-session'
import { useEffect } from 'react'
import { useLocation } from 'wouter'
import WritePageClient from '@/app/write-client'

export default function WritePage() {
  const { data: session, status } = useSession()
  const [, navigate] = useLocation()

  useEffect(() => {
    if (status === 'unauthenticated') navigate('/bn/auth/signin')
  }, [status, navigate])

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!session) return null

  return <WritePageClient session={session} />
}
