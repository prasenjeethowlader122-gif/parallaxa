import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next'
import { ClientSessionProvider } from '@/components/session-provider'
import './globals.css'


const philosopher = localFont({
  src: [
  {
    path: './local/philosopher-font/Philosopher-Regular.ttf',
    weight: '400',
    style: 'normal',
  },
  {
    path: './local/philosopher-font/Philosopher-Italic.ttf',
    weight: '400',
    style: 'italic',
  },
  {
    path: './/local/philosopher-font/Philosopher-Bold.ttf',
    weight: '700',
    style: 'normal',
  }, ]
});


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
    <html lang="en" className={philosopher.className}>
     
      <body className="font-sans antialiased bg-white text-gray-900">
        <ClientSessionProvider>
          {children}
          <Analytics />
        </ClientSessionProvider>
      </body>
    </html>
  )
}