'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  FacebookLogo,
  TwitterLogo,
  InstagramLogo,
  YoutubeLogo,
  Globe,
  Envelope,
  Phone
} from '@phosphor-icons/react'
import { banglaFontlogo, banglaFont } from '@/lib/font'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const params = useParams()
  const locale = params?.locale || 'bn'

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 py-12 px-6 no-print">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

        {/* Column 1: Brand & Socials */}
        <div className="space-y-4">
          <Link href="/" className="inline-block select-none">
            <h2 className={`${banglaFontlogo.className} text-3xl font-[900] text-white leading-none`}>
              অনলি্হিন্দু™
            </h2>
          </Link>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
            সত্য, সনাতন ও মানবতার কল্যাণে সদা জাগ্রত। অনলি হিন্দু একটি প্রগতিশীল নিউজ প্ল্যাটফর্ম যা সর্বদা সঠিক খবর পরিবেশন করে।
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a href="#" className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl hover:text-white transition-all" aria-label="Facebook">
              <FacebookLogo size={18} weight="fill" />
            </a>
            <a href="#" className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl hover:text-white transition-all" aria-label="Twitter">
              <TwitterLogo size={18} weight="fill" />
            </a>
            <a href="#" className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl hover:text-white transition-all" aria-label="Instagram">
              <InstagramLogo size={18} weight="fill" />
            </a>
            <a href="#" className="p-2 bg-slate-800 hover:bg-red-600 rounded-xl hover:text-white transition-all" aria-label="Youtube">
              <YoutubeLogo size={18} weight="fill" />
            </a>
          </div>
        </div>

        {/* Column 2: Sections */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">খবরের বিভাগসমূহ</h3>
          <ul className="space-y-2 text-xs">
            {[
              { href: '/category/World', label: 'বিশ্ব সংবাদ (World)' },
              { href: '/category/Technology', label: 'প্রযুক্তি (Technology)' },
              { href: '/category/Business', label: 'ব্যবসা ও বাণিজ্য (Business)' },
              { href: '/category/Sports', label: 'খেলাধুলা (Sports)' },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  href={`/${locale}${link.href}`}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Corporate Links */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">প্রয়োজনীয় লিংক</h3>
          <ul className="space-y-2 text-xs">
            {[
              { href: '#', label: 'গোপনীয়তা নীতি (Privacy Policy)' },
              { href: '#', label: 'ব্যবহারের শর্তাবলী (Terms)' },
              { href: '#', label: 'আমাদের সাথে যোগাযোগ (Contact)' },
              { href: '#', label: 'বিজ্ঞাপন দিন (Advertise)' },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: Contact / Newsletter */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">যোগাযোগ ও জিজ্ঞাসা</h3>
          <div className="space-y-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Envelope size={16} className="text-slate-500" />
              <span>info@onlyhindu.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-slate-500" />
              <span>+৮৮০ ১২৩৪৫৬৭৮৯</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-slate-500" />
              <span>www.onlyhindu.com</span>
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>
          &copy; {currentYear} অনলি্হিন্দু™। সর্বস্বত্ব সংরক্ষিত।
        </p>
        <p className="flex items-center gap-1">
          Developed for humanity with <span className="text-red-500">♥</span>
        </p>
      </div>
    </footer>
  )
}
