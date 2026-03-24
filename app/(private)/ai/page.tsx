'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import ParallaxaLogoSvg from '../../public/parallaxa-logo.svg'
import Image from 'next/image';
import {
  ArrowLeft,
  Share2,
  Printer,
  Twitter,
  Facebook,
  Linkedin,
  Link2,
  Check,
  ArrowRight,
  Eye,
  Clock,
  Bookmark,
  BookmarkCheck,
  Volume2,
  ChevronRight,
} from 'lucide-react'

export default function AiInterface(){
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header includeTinker  = {false}/>
      <main className = 'w-full h-full bg-gray-50 flex flex-col items-center justify-between py-4'>
        <div className = 'flex-1 h-full flex flex-row items-center justify-center gap-4'>
          <Image src = {ParallaxaLogoSvg} height = {35} alt= 'logo'/>
        </div>
        <div className = 'flex flex-row items-center gap-2 justify-center bg-white rounded-full w-full mx-6'>
          <input type = 'text' className='outline-none border-none bg-none w-full'>
            
          </input>
          <button className = 'rounded-full bg-gray-800 text-white p-2 px-4'>
            <ArrowRight className = 'w-5 h-5'/>
          </button>
        </div>
      </main>
      <Footer/>
    </div>
  )
}