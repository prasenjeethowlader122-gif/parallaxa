'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { AlertCircle } from 'lucide-react'

export default function BlockManagerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16 text-center flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Custom Block Manager is Disabled
        </h1>
        <p className="text-slate-500 max-w-md">
          কাস্টম ব্লক অ্যাড এবং ম্যানেজমেন্ট সিস্টেমটি নিষ্ক্রিয় করা হয়েছে। আপনি নতুন কোনো কাস্টম ব্লক তৈরি বা সম্পাদনা করতে পারবেন না।
        </p>
      </main>
      <Footer />
    </div>
  )
}
