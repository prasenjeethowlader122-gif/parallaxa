import type { Metadata, Viewport } from 'next'
import { Datatype } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ClientSessionProvider } from '@/components/session-provider'
import './globals.css'

const sora = Datatype({ subsets: ["latin"], variable: '--font-sora' });

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
    <html lang="en" className={sora.variable}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap" rel="stylesheet"/>
      <body className="font-sans antialiased bg-white text-gray-900">
        <ClientSessionProvider>
          {children}
          <Analytics />
        </ClientSessionProvider>
      </body>
    </html>
  )
}