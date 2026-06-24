'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest ? : string }
  reset: () => void
}) {
  // FIX: stack trace শুধু development-এ দেখানো হচ্ছে
  // production-এ internal file paths ও line numbers hide করা হয়েছে
  const isDev = process.env.NODE_ENV === 'development'
  
  return (
    <html>
      <body style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: '#dc2626' }}>Something went wrong!</h2>

        {isDev ? (
          // Development: full details দেখান
          <pre style={{
            background: '#f5f5f5', padding: '1rem', borderRadius: '8px',
            fontSize: '12px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        ) : (
          // Production: generic message, no internal details
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            An unexpected error occurred. Please try again or contact support if the problem persists.
            {error.digest && (
              <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                Error ID: {error.digest}
              </span>
            )}
          </p>
        )}

        <button
          onClick={() => reset()}
          style={{
            marginTop: '1rem', padding: '8px 16px', background: '#111827',
            color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}