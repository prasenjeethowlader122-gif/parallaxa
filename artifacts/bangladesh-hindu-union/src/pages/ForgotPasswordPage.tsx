import { useState } from 'react'
import { forgotPasswordAction } from '@/lib/auth-actions'
import Link from '@/components/ui/next-link-shim'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setIsLoading(true)
    const formData = new FormData()
    formData.append('email', email)
    const result = await forgotPasswordAction(formData)
    if (result?.error) setError(result.error)
    if (result?.success) setSuccess(result.success as string)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <Link href="/bn/auth/signin" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground mt-1 text-sm">We'll send you a reset link</p>
        </div>
        {error && <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg text-sm"><AlertCircle className="h-4 w-4" />{error}</div>}
        {success && <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm"><CheckCircle className="h-4 w-4" />{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50">
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  )
}
