import type { Metadata, Viewport } from 'next'

import { Analytics } from '@vercel/analytics/next'
import { ClientSessionProvider } from '@/components/session-provider'
import './globals.css'
import {spacegrotesk , slabo} from '@/lib/font'


export const metadata: Metadata = {
  title: 'Parallaxa - International News Portal',
  description: 'Your trusted source for breaking news, in-depth analysis, and exclusive stories from around the world.',
  icons: {
    icon: [
    {
      url: '/placeholder.svg',
      media: '(prefers-color-scheme: light)',
    },
    {
      url: '/placeholder.svg',
      media: '(prefers-color-scheme: dark)',
    },
    {
      url: '/placeholder.svg',
      type: 'image/svg+xml',
    }, ],
    apple: '/placeholder.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly < {
  children: React.ReactNode
} > ) {
  return (
    <html lang="en" className={`${spacegrotesk.className} ${slabo.className}`}>
     
      <body className={`${spacegrotesk.className} antialiased bg-white text-gray-900`}>
        <ClientSessionProvider>
          {children}
          <Analytics />
        </ClientSessionProvider>
      </body>
    </html>
  )
}