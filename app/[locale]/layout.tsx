// app/[locale]/layout.tsx
import { sansFont, serifFont, monoFont,banglaFontlogo, banglaFont } from '@/lib/font'
import { ClientSessionProvider } from '@/components/session-provider'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import type { Metadata } from 'next'
import '../globals.css'
export const metadata: Metadata = {
  title: 'Only Hindu - ঐক্য, সংস্কৃতি এবং সংবাদ',
  description: 'Only Hindu-এর অফিশিয়াল প্ল্যাটফর্ম, যা প্রদান করে বাংলাদেশের সকল প্রান্তের সর্বশেষ সংবাদ, সাংস্কৃতিক আপডেট এবং কমিউনিটি হাইলাইটস।',
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
    <html lang={locale} className={`${sansFont.variable} ${serifFont.variable} ${banglaFontlogo.variable} ${monoFont.variable} ${banglaFont.variable}`}>
      <body className={`antialiased bg-background text-foreground`}>
        <ClientSessionProvider>
          {children}
          <Toaster />
          <Analytics />
        </ClientSessionProvider>
      </body>
    </html>
  )
}
