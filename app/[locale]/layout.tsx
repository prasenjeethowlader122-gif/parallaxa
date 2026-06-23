// app/[locale]/layout.tsx
import { sansFont, serifFont, monoFont, banglaFont } from '@/lib/font'
import { ClientSessionProvider } from '@/components/session-provider'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import '../globals.css'
export const metadata: Metadata = {
  title: 'বাংলাদেশ হিন্দু ইউনিয়ন - ঐক্য, সংস্কৃতি এবং সংবাদ',
  description: 'বাংলাদেশ হিন্দু ইউনিয়ন-এর অফিশিয়াল প্ল্যাটফর্ম, যা প্রদান করে বাংলাদেশের সকল প্রান্তের সর্বশেষ সংবাদ, সাংস্কৃতিক আপডেট এবং কমিউনিটি হাইলাইটস।',
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
    <html lang={locale} className={`${sansFont.variable} ${serifFont.variable} ${monoFont.variable} ${banglaFont.variable}`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className={`${locale === 'bn' ? banglaFont.className : sansFont.className} antialiased bg-background text-foreground`}>
        <ClientSessionProvider>
          {children}
          <Analytics />
        </ClientSessionProvider>
      </body>
    </html>
  )
}