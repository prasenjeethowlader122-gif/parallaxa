import type { Metadata, Viewport } from 'next'

import { Analytics } from '@vercel/analytics/next'
import { ClientSessionProvider } from '@/components/session-provider'
import './globals.css'
import {spacegrotesk , slabo} from '@/lib/font'


export const metadata: Metadata = {
  title: 'Parallaxa - Breaking News & Stories',
  description: 'Your trusted source for breaking news, in-depth analysis, and exclusive stories from around the world.',
  generator: 'v0.app',
  icons: {
    icon: [
    {
      url: '/icon-light-32x32.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      url: '/icon-dark-32x32.png',
      media: '(prefers-color-scheme: dark)',
    },
    {
      url: '/icon.svg',
      type: 'image/svg+xml',
    }, ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#000000',
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