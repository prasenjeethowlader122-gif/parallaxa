// app/[locale]/layout.tsx
import { spacegrotesk, slabo } from '@/lib/font'
import { ClientSessionProvider } from '@/components/session-provider'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Parallaxa - International News Portal',
  description: 'Your trusted source for breaking news and analysis.',
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <html lang={locale} className={`${spacegrotesk.className} ${slabo.className}`}>
      <body className="antialiased bg-white text-gray-900">
        <ClientSessionProvider>
          {children}
          <Analytics />
        </ClientSessionProvider>
      </body>
    </html>
  )
}