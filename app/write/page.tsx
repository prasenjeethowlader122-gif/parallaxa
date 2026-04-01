"use client";
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import React, { useState } from 'react';
import Head from 'next/head';
import {
  History,
  Eye,
  ChevronRight,
  Label,
  SearchCheck,
  Accessibility,
  Tag,
  Share2,
  Settings,
  HelpCircle,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Quote,
  Link,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Upload,
  Download
} from 'lucide-react';

const EditorPage = () => {
  const [title, setTitle] = useState('');
  
  return (
    <div className="min-h-screen bg-[#fbf9f9] text-[#313334] font-['Inter'] selection:bg-primary-container">
      {/* Top Navigation Bar */}
      <Header/>
      <header className="w-full sticky top-0 z-50 bg-[#fcf8f9]/80 backdrop-blur-md border-b border-outline-variant/10 flex justify-between items-center px-6 lg:px-12 py-4">
        <div className="flex items-center gap-8">
          <span className="text-xl font-['Newsreader'] italic font-bold">The Editorial Monolith</span>
          <nav className="hidden lg:flex items-center gap-6">
            {['Drafts', 'Archive', 'Analytics'].map((item) => (
              <a key={item} href="#" className="text-[#5e5f65] hover:text-[#313334] text-sm font-medium transition-colors">
                {item}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#5e5f61] bg-[#efedee] rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#585f64] animate-pulse"></span>
            Autosaved at 14:02
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-[#585f64] hover:bg-black/5 rounded-full transition-colors"><History size={20} /></button>
            <button className="p-2 text-[#585f64] hover:bg-black/5 rounded-full transition-colors"><Eye size={20} /></button>
          </div>
          <div className="h-6 w-[1px] bg-[#b1b2b3] mx-2 hidden sm:block"></div>
          <button className="hidden sm:block px-6 py-2 rounded-full bg-[#e1e2e5] text-[#3d4042] font-medium hover:brightness-95 transition-all">Save Draft</button>
          <button className="px-6 py-2 rounded-full bg-[#585f64] text-white font-medium hover:brightness-110 active:scale-95 transition-all">Publish</button>
          <div className="ml-4 overflow-hidden rounded-full h-10 w-10 ring-2 ring-[#e9e8e9] shrink-0">
            <img alt="Editor" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiCmjtsZALvP1tQr0IPjUcaqsYFQY3S8G4Cma3NZLzqpQUdjfmdfHe3TsowYcJ3X0VGaGOh2uaV4oX6tJ8535JAV_BmBWg7sqMokF0qk_LcJVWvSHdBdm8e2KwgxB_FKN7KpHX0fGjloGzeQPVYhuNm9z_tUJ6UvoEUxCidJiENA__bYPJfn0-j9n54JUvdtT0BThEP0uouEXA36jZhjXacHWxRs03PXFJVhIOeFR22NaAK4z6NKI9ei4Y0_QepD_HxkqDVhVcYZ8" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="hidden xl:flex h-[calc(100vh-76px)] w-72 sticky top-[76px] bg-[#f5f3f3] flex-col gap-6 py-8 px-4 overflow-y-auto">
          <div className="px-4 mb-4">
            <h2 className="font-['Newsreader'] text-xl font-bold">Editorial Settings</h2>
            <p className="text-xs text-[#5e5f61] opacity-70">Article ID: 8821</p>
          </div>
          
          <nav className="flex flex-col gap-1">
            <SidebarLink icon={<Label size={18}/>} label="Metadata" active />
            <SidebarLink icon={<SearchCheck size={18}/>} label="SEO" />
            <SidebarLink icon={<Accessibility size={18}/>} label="Accessibility" />
            <SidebarLink icon={<Tag size={18}/>} label="Tags" />
            <SidebarLink icon={<Share2 size={18}/>} label="Distribution" />
          </nav>

          <div className="mt-auto flex flex-col gap-1 pt-8 border-t border-outline-variant/20">
            <button className="w-full py-3 mb-2 rounded-full border border-[#b1b2b3] text-[#5e5f61] text-sm font-medium hover:bg-white transition-all">View History</button>
            <SidebarLink icon={<Settings size={18}/>} label="Settings" />
            <SidebarLink icon={<HelpCircle size={18}/>} label="Support" />
          </div>
        </aside>

        {/* Main Writing Canvas */}
        <main className="flex-1 flex flex-col items-center py-16 px-6 sm:px-8">
          <article className="max-w-3xl w-full flex flex-col gap-12">
            <div className="space-y-6">
              <textarea 
                className="w-full border-none bg-transparent font-['Newsreader'] text-5xl font-bold p-0 focus:ring-0 placeholder-[#e2e2e4] resize-none overflow-hidden" 
                placeholder="Article Title..." 
                rows={1}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="flex items-center gap-4 text-sm text-[#5e5f61]">
                <span className="font-medium text-[#585f64]">By Elena Vance</span>
                <span className="w-1 h-1 bg-[#b1b2b3] rounded-full"></span>
                <span>Estimated 8 min read</span>
              </div>
            </div>

            <div className="relative space-y-8 text-lg leading-relaxed">
              <p className="first-letter:text-7xl first-letter:font-['Newsreader'] first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-[#585f64]">
                The architecture of a modern digital narrative is shifting from static pages to living entities. As editors, our role is no longer just to polish text, but to sculpt an experience that flows seamlessly across devices.
              </p>
              
              <p>
                In this new era, the white space becomes as loud as the headline. We find beauty in the pauses, the deliberate rhythm of a well-placed image, and the subtle tonal shift of a pull quote. It's about building a "Fluid Monolith"—a design that feels heavy with authority yet light enough to breathe.
              </p>

              {/* Floating Toolbar */}
              <div className="sticky top-8 mx-auto w-fit bg-[#e2e2e4]/80 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-full flex items-center gap-1 shadow-2xl z-40">
                <ToolbarButton icon={<Bold size={18}/>} />
                <ToolbarButton icon={<Italic size={18}/>} />
                <ToolbarButton icon={<Heading1 size={18}/>} />
                <ToolbarButton icon={<Heading2 size={18}/>} />
                <div className="h-6 w-[1px] bg-[#b1b2b3]/30 mx-1"></div>
                <ToolbarButton icon={<Quote size={18}/>} />
                <ToolbarButton icon={<Link size={18}/>} />
                <ToolbarButton icon={<ImageIcon size={18}/>} />
              </div>

              <p>
                Every element on this canvas is designed to support the writer's flow. By removing the traditional noise of buttons and borders, we allow the narrative to take center stage. The editor becomes a quiet partner in the creative process.
              </p>

              <figure className="relative group my-12">
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-[#f5f3f3]">
                  <img 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP8txUWk5tT-_w_5Y1wxT2q445k8WI8-i5SNpzqmSGVMhs7PyLeNEO2DoXlvSfwhfGrxwVSoVf_QgWm4i6VYGHR9pcUPw3Vx2wBhy74UCUAzeRx08W-d-57tovmm3ZmexNHH5c3mJnbftKTFz9wji4pZhogrLxhkXGoF4X0b9q54WG9qwhhKkPv2bfrpxDaBWeALpy89lRjamd6AU0JwTyrx8PtGwkRzba3l2vHYmzUYq7BJgG0B8WrjlI95Jmd-zmQj8sBHLazEI" 
                    alt="Abstract architecture"
                  />
                </div>
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="px-6 py-2 bg-white/90 backdrop-blur rounded-full text-sm font-semibold shadow-xl">Edit Asset</button>
                </div>
                <figcaption className="mt-4 text-sm text-center text-[#5e5f61] font-['Newsreader'] italic">
                  Fig 1.1 — The symbiosis of modern and classic aesthetics.
                </figcaption>
              </figure>
            </div>
          </article>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:flex w-80 h-[calc(100vh-76px)] sticky top-[76px] bg-[#f5f3f3] flex-col p-6 gap-8 overflow-y-auto">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5e5f61]">Assistant</h3>
              <span className="text-[10px] px-2 py-0.5 bg-[#c7d9f3] text-[#3b4c61] rounded-full font-bold">PRO</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-black/5 shadow-sm space-y-4">
              <div>
                <p className="text-xs text-[#5e5f61] mb-2 font-medium">Tone Analysis</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Sophisticated & Academic</span>
                  <CheckCircle2 size={16} className="text-[#585f64]" fill="currentColor" />
                </div>
              </div>
              <div className="h-1 w-full bg-[#efedee] rounded-full overflow-hidden">
                <div className="h-full bg-[#585f64] w-[85%] rounded-full"></div>
              </div>
              <p className="text-xs leading-relaxed text-[#5e5f61]">
                Your reading ease score is <span className="font-bold text-[#313334]">62/100</span>. Consider breaking the second paragraph for better mobile readability.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5e5f61]">Asset Manager</h3>
              <PlusCircle size={18} className="text-[#5e5f61] cursor-pointer hover:text-[#585f64]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[2, 3, 4].map((id) => (
                <div key={id} className="aspect-square rounded-lg overflow-hidden bg-[#efedee] group relative">
                  <img className="w-full h-full object-cover group-hover:brightness-75 transition-all" src={`http://googleusercontent.com/profile/picture/${id}`} alt="Asset" />
                  <div className="absolute bottom-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download size={12} />
                  </div>
                </div>
              ))}
              <div className="aspect-square rounded-lg border-2 border-dashed border-[#b1b2b3] flex flex-col items-center justify-center text-[#5e5f61] gap-1 hover:border-[#585f64] hover:text-[#585f64] transition-all cursor-pointer">
                <Upload size={16} />
                <span className="text-[10px] font-bold">UPLOAD</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5e5f61]">SEO Health</h3>
            <div className="space-y-3">
              <SEOItem success text='Title includes target keyword "Narrative Architecture"' />
              <SEOItem success text="Meta description is optimal length" />
              <SEOItem success={false} text="Alt text missing for image Fig 1.1" />
            </div>
          </section>
        </aside>
      </div>
      <Footer/>
    </div>
  );
};

// Sub-components for cleaner JSX
const SidebarLink = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active ? : boolean }) => (
  <button className={`flex items-center gap-3 px-6 py-3 rounded-full transition-all text-sm tracking-wide ${
    active ? 'bg-white text-[#585f64] font-semibold shadow-sm' : 'text-[#5e5f65] hover:bg-black/5'
  }`}>
    {icon}
    <span>{label}</span>
  </button>
);

const ToolbarButton = ({ icon }: { icon: React.ReactNode }) => (
  <button className="p-2 hover:bg-[#dce3e9] rounded-full transition-colors text-[#585f64]">
    {icon}
  </button>
);

const SEOItem = ({ success, text }: { success: boolean, text: string }) => (
  <div className="flex items-start gap-3 text-sm">
    {success ? (
      <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" fill="currentColor" />
    ) : (
      <AlertCircle size={16} className="text-[#9f403d] mt-0.5 shrink-0" fill="currentColor" />
    )}
    <span className={success ? 'text-[#313334]' : 'text-[#313334]'}>{text}</span>
  </div>
);

export default EditorPage;