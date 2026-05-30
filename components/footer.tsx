'use client'
import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-white border-t border-gray-100 py-6 no-print">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Left: Branding & Copyright */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-serif font-bold uppercase tracking-tight text-gray-900">
            Parallaxa&apos;s Views
          </span>
          <span className="hidden md:inline h-4 w-px bg-gray-200" />
          <p className="text-[11px] text-gray-400 uppercase tracking-widest">
            &copy; {currentYear} All rights reserved
          </p>
        </div>

        {/* Right: Minimal Links */}
        <div className="flex items-center gap-6">
          {[
            { href: '#', text: 'Privacy' },
            { href: '#', text: 'Terms' },
            { href: '#', text: 'Contact' },
            { href: '#', text: 'Advertise' },
          ].map((link) => (
            <Link
              key={link.text}
              href={link.href}
              className="text-[11px] text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
            >
              {link.text}
            </Link>
          ))}
        </div>

      </div>
    </footer>
  )
}
