'use client'
import Link from 'next/link'
import Image from 'next/image'
import profilePic from '../public/logo-text.png'

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">

        {/* Main content */}
        <div className="flex flex-wrap gap-8 justify-between items-start py-10 border-b border-white/10">

          {/* Brand */}
          <div className="max-w-[240px] space-y-3">
            <Image
              src={profilePic}
              alt="Parallaxa News"
              height={32}
              style={{ filter: 'invert(100%) brightness(1)' }}
            />
            <p className="text-[11px] text-white/35 leading-relaxed font-sans tracking-wide">
              Breaking news, in-depth analysis, and exclusive stories from around the world — delivered with clarity.
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex flex-wrap gap-10">

            {[
              {
                label: 'Categories',
                links: [
                  { href: '/category/Technology', text: 'Technology' },
                  { href: '/category/Business', text: 'Business' },
                  { href: '/category/Sports', text: 'Sports' },
                  { href: '/category/Entertainment', text: 'Entertainment' },
                ],
              },
              {
                label: 'Sections',
                links: [
                  { href: '/category/Science', text: 'Science' },
                  { href: '/category/Health', text: 'Health' },
                  { href: '#', text: 'About Us' },
                  { href: '#', text: 'Contact' },
                ],
              },
              {
                label: 'Legal',
                links: [
                  { href: '#', text: 'Privacy Policy' },
                  { href: '#', text: 'Terms of Service' },
                  { href: '#', text: 'Cookie Policy' },
                  { href: '#', text: 'Advertise' },
                ],
              },
            ].map((col) => (
              <div key={col.label} className="space-y-3">
                <p className="text-[10px] tracking-[0.12em] uppercase text-[#c9a84c] font-sans font-medium">
                  {col.label}
                </p>
                <ul className="space-y-[9px]">
                  {col.links.map((link) => (
                    <li key={link.text}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-white/50 hover:text-white transition-colors font-sans"
                      >
                        {link.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap gap-4 justify-between items-center py-4">
          <p className="text-[11px] text-white/25 font-sans tracking-wide">
            &copy; {currentYear} Parallaxa News. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {['X / Twitter', 'Facebook', 'Instagram'].map((platform, i, arr) => (
              <span key={platform} className="flex items-center gap-4">
                
          <a href="#"
                  className="text-[11px] text-white/30 hover:text-[#c9a84c] transition-colors font-sans tracking-widest uppercase"
                >
                  {platform}
                </a>
                {i < arr.length - 1 && (
                  <span className="w-[3px] h-[3px] rounded-full bg-white/15 inline-block" />
                )}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}