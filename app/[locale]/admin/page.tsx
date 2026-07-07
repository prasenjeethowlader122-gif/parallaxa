'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Gear, Cube, Newspaper, User, ArrowRight } from '@phosphor-icons/react/dist/ssr'

export default function AdminDashboardPage() {
  const params = useParams()
  const locale = params?.locale as string || 'bn'

  const adminModules = [
    {
      title: 'System Settings',
      description: 'Configure AI, social media, and site parameters.',
      icon: Gear,
      href: `/${locale}/admin/settings`,
      color: 'bg-blue-500',
    },
    {
      title: 'Block Manager',
      description: 'Create and manage custom MDX content blocks.',
      icon: Cube,
      href: `/${locale}/admin/blocks`,
      color: 'bg-emerald-500',
    },
    {
      title: 'Article Moderation',
      description: 'Review and manage all submitted articles.',
      icon: Newspaper,
      href: `/${locale}/dashboard`,
      color: 'bg-amber-500',
    },
    {
      title: 'User Management',
      description: 'Manage authors, editors, and administrators.',
      icon: User,
      href: '#',
      color: 'bg-indigo-500',
      disabled: true,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Administration Panel</h1>
          <p className="mt-2 text-slate-500">Global system controls and content management hub.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminModules.map((module) => (
            <Link
              key={module.title}
              href={module.disabled ? '#' : module.href}
              className={`group p-6 bg-white rounded-3xl border border-slate-200 shadow-sm transition-all ${
                module.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-1 hover:border-slate-300'
              }`}
            >
              <div className={`w-12 h-12 ${module.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-${module.color.split('-')[1]}-500/20`}>
                <module.icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {module.description}
              </p>
              {!module.disabled && (
                <div className="mt-6 flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                  <span>Manage Module</span>
                  <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
