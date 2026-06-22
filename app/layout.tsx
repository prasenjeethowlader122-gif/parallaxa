// app/[locale]/layout.tsx
import { sansFont, serifFont, monoFont } from '@/lib/font'
import { ClientSessionProvider } from '@/components/session-provider'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bangladesh Hindu Union - Unity, Culture, and News',
  description: 'The official platform for the Bangladesh Hindu Union, providing the latest news, cultural updates, and community highlights from across Bangladesh.',
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
    <html lang={locale} className={`${sansFont.variable} ${serifFont.variable} ${monoFont.variable}`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className={`${sansFont.className} antialiased bg-background text-foreground`}>
        <ClientSessionProvider>
          {children}
          <Analytics />
        </ClientSessionProvider>
      </body>
    </html>
  )
}