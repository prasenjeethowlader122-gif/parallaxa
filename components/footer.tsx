'use client'
import Link from 'next/link'
import Image from 'next/image';
import profilePic from '../public/logo-text.png'
export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-12">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold tracking-tight"><Image src = {profilePic} alt='logo x' height='40'/></h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your trusted source for breaking news, in-depth analysis, and exclusive stories from around the world.
            </p>
          </div>

          {/* News Categories */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/category/Technology"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Technology
                </Link>
              </li>
              <li>
                <Link
                  href="/category/Business"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Business
                </Link>
              </li>
              <li>
                <Link
                  href="/category/Sports"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Sports
                </Link>
              </li>
              <li>
                <Link
                  href="/category/Entertainment"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Entertainment
                </Link>
              </li>
            </ul>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Sections</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/category/Science"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Science
                </Link>
              </li>
              <li>
                <Link
                  href="/category/Health"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Health
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Advertise
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} Parallaxa News. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Twitter
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Facebook
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
