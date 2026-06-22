'use client'
import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-background border-t border-border py-6 no-print">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Left: Branding & Copyright */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-sans font-bold uppercase tracking-tight text-foreground">
            Bangladesh Hindu Union
          </span>
          <span className="hidden md:inline h-4 w-px bg-gray-200" />
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
            &copy; {currentYear} Bangladesh Hindu Union. All rights reserved
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
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
            >
              {link.text}
            </Link>
          ))}
        </div>

      </div>
    </footer>
  )
}
