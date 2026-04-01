'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FiSave, FiEye, FiSettings, FiX, FiChevronRight,
  FiTrash2, FiSend, FiBold, FiItalic, FiCode,
  FiList, FiLink, FiImage, FiMinus, FiAlertCircle,
  FiCheckCircle, FiInfo, FiCopy, FiCheck
} from 'react-icons/fi'
import { Copy, Check } from 'lucide-react'
import Markdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// ── Types ────────────────────────────────────────────────────────────────────

export interface EditorForm {
  title: string; description: string; content: string; category: string
  image: string; readTime: number; featured: boolean; breaking: boolean
  trending: boolean; date: string
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  visibility: 'public' | 'unlisted' | 'members'
  scheduledDate: string; scheduledTime: string; readTimeOverride: boolean
  seoTitle: string; metaDescription: string; focusKeyword: string
  canonicalUrl: string; ogImage: string
  twitterCard: 'summary_large_image' | 'summary' | 'app'
  noIndex: boolean; allowComments: boolean; showInRss: boolean
  ampEnabled: boolean; redirectUrl: string; cssClass: string
}

const defaultForm = (): EditorForm => ({
  title: '', description: '', content: '', category: 'Technology',
  image: '', readTime: 3, featured: false, breaking: false, trending: false,
  date: new Date().toISOString().split('T')[0],
  status: 'draft', visibility: 'public',
  scheduledDate: '', scheduledTime: '09:00', readTimeOverride: false,
  seoTitle: '', metaDescription: '', focusKeyword: '',
  canonicalUrl: '', ogImage: '', twitterCard: 'summary_large_image',
  noIndex: false, allowComments: true, showInRss: true,
  ampEnabled: false, redirectUrl: '', cssClass: '',
})

export function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-{2,}/g,'-').replace(/^-|-$/g,'')
}

// ── SEO Analyzer ─────────────────────────────────────────────────────────────

interface SeoCheck { id: string; label: string; status: 'good'|'warn'|'bad' }
interface SeoAnalysis { score: number; grade: string; checks: SeoCheck[] }

function analyzeSeo(f: Pick<EditorForm,'title'|'description'|'content'|'seoTitle'|'metaDescription'|'focusKeyword'> & {slug:string}): SeoAnalysis {
  const checks: SeoCheck[] = [
    { id:'title-len', label:'Title length (50–60 chars)', status: f.title.length>=50&&f.title.length<=60?'good':f.title.length>30?'warn':'bad' },
    { id:'desc', label:'Description present', status: f.description.length>50?'good':f.description.length>0?'warn':'bad' },
    { id:'content', label:'Content length (>300 words)', status: f.content.split(/\s+/).length>=300?'good':f.content.split(/\s+/).length>=100?'warn':'bad' },
    { id:'kw', label:'Focus keyword set', status: f.focusKeyword?'good':'warn' },
    { id:'meta', label:'Meta description (150–160)', status: f.metaDescription.length>=150&&f.metaDescription.length<=160?'good':f.metaDescription.length>0?'warn':'bad' },
    { id:'slug', label:'URL slug clean', status: f.slug.length>0&&!f.slug.includes(' ')?'good':'bad' },
  ]
  const score = Math.round(checks.reduce((a,c)=>a+(c.status==='good'?100:c.status==='warn'?50:0),0)/checks.length)
  const grade = score>=70?'Good':score>=50?'OK':'Poor'
  return { score, grade, checks }
}

// ── Markdown Components ──────────────────────────────────────────────────────

function CodeBlock({ children, className }: React.ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-','') ?? 'text'
  const code = typeof children==='string'?children:String(children??'')
  if (!className) return <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  return (
    <div className="my-3 rounded-lg overflow-hidden border border-gray-700 bg-gray-900 text-gray-100">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{lang}</span>
        <button onClick={()=>{navigator.clipboard.writeText(code.trim());setCopied(true);setTimeout(()=>setCopied(false),1800)}}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-400 transition-colors font-mono">
          {copied?<FiCheck size={11}/>:<FiCopy size={11}/>}{copied?'Copied':'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-7 font-mono"><code>{code}</code></pre>
    </div>
  )
}

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({children})=><h1 className="text-2xl font-bold text-gray-900 mt-5 mb-2 pb-2 border-b border-gray-200">{children}</h1>,
  h2: ({children})=><h2 className="text-lg font-semibold text-gray-800 mt-4 mb-1">{children}</h2>,
  h3: ({children})=><h3 className="text-base font-semibold text-gray-600 mt-3 mb-1">{children}</h3>,
  p: ({children})=><p className="text-sm text-gray-800 leading-7 my-1">{children}</p>,
  ul: ({children})=><ul className="pl-5 my-1 flex flex-col gap-0.5 text-sm text-gray-800 list-disc">{children}</ul>,
  ol: ({children})=><ol className="pl-5 my-1 flex flex-col gap-0.5 text-sm text-gray-800 list-decimal">{children}</ol>,
  li: ({children})=><li className="leading-7">{children}</li>,
  blockquote: ({children})=><blockquote className="border-l-4 border-gray-300 pl-4 my-2 text-gray-500 italic text-sm">{children}</blockquote>,
  table: ({children})=><div className="overflow-x-auto my-3 rounded-lg border border-gray-200"><table className="min-w-full text-sm border-collapse">{children}</table></div>,
  thead: ({children})=><thead className="bg-gray-50 text-gray-500">{children}</thead>,
  tr: ({children})=><tr className="border-b border-gray-200">{children}</tr>,
  th: ({children})=><th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">{children}</th>,
  td: ({children})=><td className="px-3 py-2 text-gray-800">{children}</td>,
  hr: ()=><hr className="my-4 border-gray-200"/>,
  strong: ({children})=><strong className="font-bold text-gray-900">{children}</strong>,
  em: ({children})=><em className="italic text-gray-600">{children}</em>,
  a: ({href,children})=><a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2">{children}</a>,
}

// ── Callout ──────────────────────────────────────────────────────────────────

function Callout({variant='info',children}:{variant?:'info'|'warn'|'success'|'error';children?:React.ReactNode}) {
  const map = {
    info:    {Icon:FiInfo,      cls:'bg-blue-50 border-blue-200 text-blue-800'},
    warn:    {Icon:FiAlertCircle,cls:'bg-yellow-50 border-yellow-200 text-yellow-800'},
    success: {Icon:FiCheckCircle,cls:'bg-green-50 border-green-200 text-green-800'},
    error:   {Icon:FiAlertCircle,cls:'bg-red-50 border-red-200 text-red-800'},
  }
  const {Icon,cls}=map[variant]
  return (
    <div className={`flex gap-2.5 rounded-lg border p-3 my-2 ${cls}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0"/>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function Steps({children}:{children?:React.ReactNode}) {
  return <ol className="flex flex-col gap-2.5 my-3 p-0 list-none">{children}</ol>
}
function Step({title,children}:{title?:string;children?:React.ReactNode}) {
  return (
    <li className="flex gap-2.5 items-start">
      <span className="shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">✓</span>
      <div className="flex flex-col gap-0.5">
        {title&&<span className="font-semibold text-sm text-gray-900">{title}</span>}
        <span className="text-sm text-gray-600 leading-relaxed">{children}</span>
      </div>
    </li>
  )
}
function Tabs({labels='',children}:{labels?:string;children?:React.ReactNode}) {
  const tabs=labels.split(',').map(l=>l.trim())
  const [active,setActive]=useState(0)
  const panels=Array.isArray(children)?children:[children]
  return (
    <div className="my-3 rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((label,i)=>(
          <button key={i} onClick={()=>setActive(i)}
            className={`px-4 py-2 text-xs font-semibold transition-colors ${i===active?'bg-white text-gray-900 border-b-2 border-gray-900 -mb-px':'text-gray-400 hover:text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="p-3">{panels[active]}</div>
    </div>
  )
}
function Tab({children}:{children?:React.ReactNode}){return <div>{children}</div>}

// ── Directive Parser ─────────────────────────────────────────────────────────

type Chunk={kind:'md';text:string}|{kind:'callout';variant:string;body:string}|{kind:'steps';items:{title:string;body:string}[]}|{kind:'tabs';labels:string;panels:string[]}

function parseAttrs(raw:string){const a:Record<string,string>={};const re=/(\w+)="([^"]*)"/g;let m;while((m=re.exec(raw))!==null)a[m[1]]=m[2];return a}

function splitDirectives(raw:string):Chunk[] {
  const chunks:Chunk[]=[]; let cursor=0
  const re=/^::(callout|steps|tabs)(\{[^}]*\})?\n([\s\S]*?)^::/gm; let match:RegExpExecArray|null
  while((match=re.exec(raw))!==null) {
    if(match.index>cursor)chunks.push({kind:'md',text:raw.slice(cursor,match.index)})
    const tag=match[1],attrs=parseAttrs(match[2]??''),body=match[3]
    if(tag==='callout')chunks.push({kind:'callout',variant:attrs.variant??'info',body:body.trim()})
    else if(tag==='steps'){
      const sr=/::step(\{[^}]*\})?\n([\s\S]*?)(?=::step|$)/g,items:{title:string;body:string}[]=[];let sm
      while((sm=sr.exec(body))!==null)items.push({title:parseAttrs(sm[1]??'').title??'',body:sm[2].trim()})
      if(!items.length)body.split('\n').filter(Boolean).forEach(l=>items.push({title:'',body:l.replace(/^[-*]\s*/,'')}))
      chunks.push({kind:'steps',items})
    } else if(tag==='tabs')chunks.push({kind:'tabs',labels:attrs.labels??'',panels:body.split(/^::tab\n/m).filter(Boolean)})
    cursor=match.index+match[0].length
  }
  if(cursor<raw.length)chunks.push({kind:'md',text:raw.slice(cursor)})
  return chunks
}

function RenderChunks({text}:{text:string}) {
  return <>
    {splitDirectives(text).map((c,i)=>{
      if(c.kind==='md')return <Markdown key={i} remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[rehypeKatex]} components={mdComponents}>{c.text}</Markdown>
      if(c.kind==='callout')return <Callout key={i} variant={c.variant as any}><Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{c.body}</Markdown></Callout>
      if(c.kind==='steps')return <Steps key={i}>{c.items.map((it,j)=><Step key={j} title={it.title}><Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{it.body}</Markdown></Step>)}</Steps>
      if(c.kind==='tabs')return <Tabs key={i} labels={c.labels}>{c.panels.map((p,j)=><Tab key={j}><Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{p.trim()}</Markdown></Tab>)}</Tabs>
      return null
    })}
  </>
}

// ── Rich Editor ──────────────────────────────────────────────────────────────

const TOOLS=[
  {g:'fmt',items:[
    {label:<FiBold/>,title:'Bold',wrap:['**','**'] as[string,string]},
    {label:<FiItalic/>,title:'Italic',wrap:['*','*'] as[string,string]},
    {label:<span className="line-through text-xs">S</span>,title:'Strike',wrap:['~~','~~'] as[string,string]},
  ]},
  {g:'head',items:[
    {label:<span className="text-xs font-bold">H1</span>,title:'H1',prefix:'# '},
    {label:<span className="text-xs font-bold">H2</span>,title:'H2',prefix:'## '},
    {label:<span className="text-xs font-bold">H3</span>,title:'H3',prefix:'### '},
  ]},
  {g:'block',items:[
    {label:<span className="text-xs">❝</span>,title:'Quote',prefix:'> '},
    {label:<FiCode/>,title:'Inline code',wrap:['`','`'] as[string,string]},
    {label:<span className="font-mono text-xs">```</span>,title:'Code block',wrap:['```\n','\n```'] as[string,string]},
  ]},
  {g:'list',items:[
    {label:<FiList/>,title:'Bullet',prefix:'- '},
    {label:<span className="text-xs font-mono">1.</span>,title:'Ordered',prefix:'1. '},
  ]},
  {g:'ins',items:[
    {label:<FiLink/>,title:'Link',insert:'[text](https://)'},
    {label:<FiImage/>,title:'Image',insert:'![alt](https://)'},
    {label:<FiMinus/>,title:'HR',insert:'\n---\n'},
  ]},
]

function RichEditor({value,onChange,placeholder,minHeight=340}:{value:string;onChange:(v:string)=>void;placeholder?:string;minHeight?:number}) {
  const taRef=useRef<HTMLTextAreaElement>(null)
  const [tab,setTab]=useState<'write'|'preview'>('write')

  function applyTool(tool:{wrap?:[string,string];prefix?:string;insert?:string}) {
    const ta=taRef.current; if(!ta) return
    const s=ta.selectionStart,e=ta.selectionEnd,sel=value.slice(s,e)
    let next=value,cursor=s
    if(tool.insert){next=value.slice(0,s)+tool.insert+value.slice(e);cursor=s+tool.insert.length}
    else if(tool.wrap){const[pre,post]=tool.wrap;next=value.slice(0,s)+pre+sel+post+value.slice(e);cursor=s+pre.length+sel.length+post.length}
    else if(tool.prefix){const lines=sel?sel.split('\n').map(l=>tool.prefix+l).join('\n'):tool.prefix!;next=value.slice(0,s)+lines+value.slice(e);cursor=s+lines.length}
    onChange(next)
    requestAnimationFrame(()=>{ta.focus();ta.setSelectionRange(cursor,cursor)})
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-gray-50 flex-wrap">
        {TOOLS.map((grp,gi)=>(
          <div key={grp.g} className="flex items-center gap-0.5">
            {gi>0&&<div className="w-px h-4 bg-gray-200 mx-1"/>}
            {grp.items.map((t,i)=>(
              <button key={i} title={t.title}
                onMouseDown={ev=>{ev.preventDefault();applyTool(t)}}
                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all text-sm">
                {t.label}
              </button>
            ))}
          </div>
        ))}
        <div className="flex-1"/>
        <div className="flex border border-gray-200 rounded-md overflow-hidden">
          {(['write','preview'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-3 py-1 text-xs font-semibold capitalize transition-colors ${tab===t?'bg-gray-900 text-white':'text-gray-400 hover:text-gray-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab==='write'?(
        <textarea ref={taRef} value={value} onChange={e=>onChange(e.target.value)}
          onKeyDown={e=>{if(e.key==='Tab'){e.preventDefault();applyTool({insert:'  '})}}}
          placeholder={placeholder??'Start writing…\n\n**bold**  *italic*  ## Heading  > blockquote'}
          className="w-full p-5 text-sm leading-8 text-gray-900 bg-white border-none outline-none resize-y font-mono block focus:bg-gray-50 transition-colors"
          style={{minHeight}}/>
      ):(
        <div className="p-5 bg-white overflow-y-auto" style={{minHeight}}>
          {value.trim()?<RenderChunks text={value}/>:<p className="text-sm text-gray-400 italic text-center mt-16">Nothing to preview yet.</p>}
        </div>
      )}

      <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex gap-4 flex-wrap">
        <span className="text-xs text-gray-400 font-mono">**bold** · *italic* · ## heading · ```code``` · $math$</span>
        <span className="text-xs text-gray-400 font-mono">::callout · ::steps · ::tabs</span>
      </div>
    </div>
  )
}

// ── Featured Image Uploader ──────────────────────────────────────────────────

function FeaturedImageUploader({value,onChange}:{value:string;onChange:(url:string)=>void}) {
  const [uploading,setUploading]=useState(false)
  const inputRef=useRef<HTMLInputElement>(null)

  async function handleFile(file:File) {
    setUploading(true)
    try { const url=URL.createObjectURL(file); onChange(url) }
    finally { setUploading(false) }
  }

  if(value) return (
    <div className="mt-5 rounded-xl overflow-hidden border border-gray-200">
      <img src={value} alt="Featured" className="w-full h-48 object-cover block"/>
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 text-xs text-gray-500">
        <span>Featured image</span>
        <div className="flex gap-2">
          <button onClick={()=>inputRef.current?.click()} className="px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-100 transition-colors">Replace</button>
          <button onClick={()=>onChange('')} className="px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Remove</button>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
    </div>
  )

  return (
    <div onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith('image/'))handleFile(f)}}
      onDragOver={e=>e.preventDefault()} onClick={()=>inputRef.current?.click()}
      className="mt-5 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all group">
      <div className="text-3xl mb-2 text-gray-300 group-hover:text-gray-400">⬚</div>
      <p className="text-sm font-semibold text-gray-500 mb-1">{uploading?'Uploading…':'Add featured image'}</p>
      <p className="text-xs text-gray-400">Click to upload or drag & drop · PNG, JPG, WebP up to 5MB</p>
      <div className="mt-4" onClick={e=>e.stopPropagation()}>
        <input type="url" placeholder="Or paste an image URL…"
          onKeyDown={e=>{if(e.key==='Enter')onChange((e.target as HTMLInputElement).value)}}
          className="text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 w-full max-w-xs outline-none focus:border-gray-400 font-mono transition-colors"/>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}}/>
    </div>
  )
}

// ── Sidebar Panel ─────────────────────────────────────────────────────────────

function Panel({title,open:defaultOpen=false,children}:{title:string;open?:boolean;children:React.ReactNode}) {
  const [open,setOpen]=useState(defaultOpen)
  return (
    <div className="border-b border-gray-100">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
        <FiChevronRight className={`text-gray-300 transition-transform duration-200 ${open?'rotate-90':''}`} size={14}/>
      </button>
      {open&&<div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

const Lbl=({children}:{children:React.ReactNode})=><label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">{children}</label>

const Inp=(p:React.InputHTMLAttributes<HTMLInputElement>)=>(
  <input {...p} className={`w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg outline-none focus:border-gray-400 font-mono transition-colors ${p.className??''}`}/>
)

const Sel=(p:React.SelectHTMLAttributes<HTMLSelectElement>)=>(
  <select {...p} className={`w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg outline-none cursor-pointer font-mono transition-colors ${p.className??''}`}/>
)

const Textarea=(p:React.TextareaHTMLAttributes<HTMLTextAreaElement>)=>(
  <textarea {...p} className={`w-full px-3 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg outline-none resize-y font-mono min-h-[72px] transition-colors focus:border-gray-400 ${p.className??''}`}/>
)

function Toggle({label,sub,checked,onChange}:{label:string;sub?:string;checked:boolean;onChange:(v:boolean)=>void}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm text-gray-700">{label}</div>
        {sub&&<div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
      <button role="switch" aria-checked={checked} onClick={()=>onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked?'bg-green-600':'bg-gray-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${checked?'left-[18px]':'left-0.5'}`}/>
      </button>
    </div>
  )
}

function CharCount({current,max}:{current:number;max:number}) {
  const pct=current/max
  return <div className={`text-right text-xs mt-1 ${pct>1?'text-red-600':pct>0.85?'text-yellow-600':'text-green-600'}`}>{current}/{max}</div>
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string,string> = {
  draft:     'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  archived:  'bg-gray-100 text-gray-500',
}

const CATEGORIES = ['Technology','Business','Politics','Sports','Entertainment','Science','Health','World']

// ── Publish Panel ─────────────────────────────────────────────────────────────

function PublishPanel({form,set,tags,setTags,onDelete}:{form:EditorForm;set:<K extends keyof EditorForm>(k:K,v:EditorForm[K])=>void;tags:string[];setTags:(t:string[])=>void;onDelete?:()=>void}) {
  const [tagInput,setTagInput]=useState('')

  function addTag(e:React.KeyboardEvent<HTMLInputElement>) {
    if(e.key!=='Enter') return
    const v=tagInput.trim()
    if(v&&!tags.includes(v)) setTags([...tags,v])
    setTagInput('')
  }

  return (
    <>
      <Panel title="Publish" open>
        <div className="mb-3">
          <Lbl>Status</Lbl>
          <Sel value={form.status} onChange={e=>set('status',e.target.value as any)}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="archived">Archived</option>
          </Sel>
        </div>
        <div className="mb-3">
          <Lbl>Schedule publish</Lbl>
          <div className="flex gap-2">
            <Inp type="date" value={form.scheduledDate} onChange={e=>set('scheduledDate',e.target.value)} className="flex-1 text-xs!"/>
            <Inp type="time" value={form.scheduledTime} onChange={e=>set('scheduledTime',e.target.value)} className="flex-1 text-xs!"/>
          </div>
        </div>
        <div className="mb-3">
          <Lbl>Publish date</Lbl>
          <Inp type="date" value={form.date} onChange={e=>set('date',e.target.value)}/>
        </div>
        <div>
          <Lbl>Visibility</Lbl>
          <Sel value={form.visibility} onChange={e=>set('visibility',e.target.value as any)}>
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="members">Members only</option>
          </Sel>
        </div>
      </Panel>

      <Panel title="Labels" open>
        <div className="mb-3">
          <Lbl>Category</Lbl>
          <Sel value={form.category} onChange={e=>set('category',e.target.value)}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </Sel>
        </div>
        <div className="mb-3">
          <Lbl>Tags</Lbl>
          <Inp value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Add tag + Enter" className="mb-2"/>
          {tags.length>0&&(
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag=>(
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600">
                  {tag}
                  <button onClick={()=>setTags(tags.filter(t=>t!==tag))} className="text-gray-400 hover:text-gray-700 leading-none text-base">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mb-3">
          <Lbl>Flags</Lbl>
          <div className="flex gap-2 flex-wrap mt-1">
            {(['featured','breaking','trending'] as const).map(flag=>{
              const active=form[flag]
              const cls={featured:'border-yellow-400 bg-yellow-50 text-yellow-800',breaking:'border-red-400 bg-red-50 text-red-800',trending:'border-blue-400 bg-blue-50 text-blue-800'}
              return (
                <button key={flag} onClick={()=>set(flag,!active)}
                  className={`text-xs px-3 py-1 rounded-full border font-semibold transition-all ${active?cls[flag]:'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}>
                  {flag.charAt(0).toUpperCase()+flag.slice(1)}
                </button>
              )
            })}
          </div>
        </div>
        <Toggle label="Read time override" sub="Auto-calculated otherwise" checked={form.readTimeOverride} onChange={v=>set('readTimeOverride',v)}/>
        {form.readTimeOverride&&<Inp type="number" value={form.readTime} min={1} max={60} onChange={e=>set('readTime',parseInt(e.target.value))} placeholder="Minutes" className="mt-2"/>}
      </Panel>

      <Panel title="Advanced">
        <Toggle label="Index by search engines" sub="Adds noindex meta if off" checked={!form.noIndex} onChange={v=>set('noIndex',!v)}/>
        <Toggle label="Allow comments" checked={form.allowComments} onChange={v=>set('allowComments',v)}/>
        <Toggle label="Show in RSS feed" checked={form.showInRss} onChange={v=>set('showInRss',v)}/>
        <Toggle label="AMP version" sub="Faster on mobile" checked={form.ampEnabled} onChange={v=>set('ampEnabled',v)}/>
        <div className="mt-3 mb-3">
          <Lbl>301 Redirect URL</Lbl>
          <Inp value={form.redirectUrl} onChange={e=>set('redirectUrl',e.target.value)} placeholder="https://…" type="url"/>
        </div>
        <div className="mb-4">
          <Lbl>Custom CSS class</Lbl>
          <Inp value={form.cssClass} onChange={e=>set('cssClass',e.target.value)} placeholder="my-article special"/>
        </div>
        {onDelete&&(
          <button onClick={onDelete}
            className="w-full py-2 text-sm font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
            <FiTrash2 size={14}/> Delete article
          </button>
        )}
      </Panel>
    </>
  )
}

// ── SEO Panel ────────────────────────────────────────────────────────────────

function SeoPanel({form,set,seoAnalysis}:{form:EditorForm;set:<K extends keyof EditorForm>(k:K,v:EditorForm[K])=>void;seoAnalysis:SeoAnalysis|null}) {
  const slug=slugify(form.title)
  const dotCls={good:'bg-green-600',warn:'bg-yellow-500',bad:'bg-red-500'}

  return (
    <>
      <Panel title="SEO" open>
        {seoAnalysis&&(
          <>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${seoAnalysis.score>=70?'bg-green-600':seoAnalysis.score>=50?'bg-yellow-500':'bg-red-500'}`} style={{width:`${seoAnalysis.score}%`}}/>
              </div>
              <span className={`text-sm font-bold ${seoAnalysis.score>=70?'text-green-700':seoAnalysis.score>=50?'text-yellow-700':'text-red-700'}`}>{seoAnalysis.score}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${seoAnalysis.score>=70?'bg-green-100 text-green-700':seoAnalysis.score>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{seoAnalysis.grade}</span>
            </div>
            <div className="mb-4 space-y-2">
              {seoAnalysis.checks.map(c=>(
                <div key={c.id} className="flex items-start gap-2 text-xs text-gray-600">
                  <div className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${dotCls[c.status]}`}/>
                  {c.label}
                </div>
              ))}
            </div>
          </>
        )}
        <div className="mb-3"><Lbl>Focus keyword</Lbl><Inp value={form.focusKeyword} onChange={e=>set('focusKeyword',e.target.value)} placeholder="e.g. artificial intelligence"/></div>
        <div className="mb-3"><Lbl>SEO title</Lbl><Inp value={form.seoTitle} onChange={e=>set('seoTitle',e.target.value)} placeholder="Override for search engines…"/><CharCount current={form.seoTitle.length} max={60}/></div>
        <div className="mb-3"><Lbl>Meta description</Lbl><Textarea value={form.metaDescription} onChange={e=>set('metaDescription',e.target.value)} placeholder="Summarise the article…" rows={3}/><CharCount current={form.metaDescription.length} max={160}/></div>
        <div className="mb-3">
          <Lbl>URL slug</Lbl>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 font-mono whitespace-nowrap">/article/</span>
            <input value={slug} readOnly className="flex-1 px-2 py-1.5 text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded-lg font-mono outline-none"/>
          </div>
        </div>
        <div><Lbl>Canonical URL</Lbl><Inp value={form.canonicalUrl} onChange={e=>set('canonicalUrl',e.target.value)} placeholder="https://…" type="url"/></div>
      </Panel>

      <Panel title="Social preview">
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="h-24 bg-gray-100 flex items-center justify-center text-xs text-gray-400">{form.ogImage||form.image?'OG image set ✓':'No OG image'}</div>
          <div className="p-3 bg-white">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">yoursite.com</p>
            <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{form.seoTitle||form.title||'Article title'}</p>
            <p className="text-xs text-gray-500 leading-snug">{form.metaDescription||form.description||'Meta description…'}</p>
          </div>
        </div>
        <div className="mb-3"><Lbl>OG image URL</Lbl><Inp value={form.ogImage} onChange={e=>set('ogImage',e.target.value)} placeholder="https://…" type="url"/></div>
        <div><Lbl>Twitter card</Lbl>
          <Sel value={form.twitterCard} onChange={e=>set('twitterCard',e.target.value as any)}>
            <option value="summary_large_image">summary_large_image</option>
            <option value="summary">summary</option>
            <option value="app">app</option>
          </Sel>
        </div>
      </Panel>
    </>
  )
}

// ── Main Article Editor ───────────────────────────────────────────────────────

export interface NewsArticle {
  id: string; title: string; description: string; content: string; category: string
  image: string; readTime: number; featured?: boolean; breaking?: boolean; trending?: boolean
  date: Date; status?: string; visibility?: string; scheduledAt?: Date; updatedAt?: Date
  seoTitle?: string; metaDescription?: string; focusKeyword?: string; canonicalUrl?: string
  ogImage?: string; twitterCard?: string; noIndex?: boolean; allowComments?: boolean
  showInRss?: boolean; ampEnabled?: boolean; redirectUrl?: string; cssClass?: string; slug?: string
}

export function ArticleEditor({editingArticle=null}:{editingArticle?:NewsArticle|null}) {
  const [form,setForm]=useState<EditorForm>(defaultForm())
  const [tags,setTags]=useState<string[]>([])
  const [saving,setSaving]=useState(false)
  const [publishing,setPublishing]=useState(false)
  const [lastSaved,setLastSaved]=useState<Date|null>(null)
  const [seoAnalysis,setSeoAnalysis]=useState<SeoAnalysis|null>(null)
  const [activeTab,setActiveTab]=useState<'write'|'preview'>('write')
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const autoSaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null)

  const set=useCallback(<K extends keyof EditorForm>(k:K,v:EditorForm[K])=>setForm(p=>({...p,[k]:v})),[])

  useEffect(()=>{
    if(!editingArticle) return
    setForm({
      title:editingArticle.title, description:editingArticle.description, content:editingArticle.content,
      category:editingArticle.category, image:editingArticle.image, readTime:editingArticle.readTime,
      featured:editingArticle.featured??false, breaking:editingArticle.breaking??false, trending:editingArticle.trending??false,
      date:new Date(editingArticle.date).toISOString().split('T')[0],
      status:(editingArticle.status as any)?? 'draft', visibility:(editingArticle.visibility as any)?? 'public',
      scheduledDate:editingArticle.scheduledAt?new Date(editingArticle.scheduledAt).toISOString().split('T')[0]:'',
      scheduledTime:editingArticle.scheduledAt?new Date(editingArticle.scheduledAt).toTimeString().slice(0,5):'09:00',
      readTimeOverride:false,
      seoTitle:editingArticle.seoTitle??'', metaDescription:editingArticle.metaDescription??'',
      focusKeyword:editingArticle.focusKeyword??'', canonicalUrl:editingArticle.canonicalUrl??'',
      ogImage:editingArticle.ogImage??'', twitterCard:(editingArticle.twitterCard as any)?? 'summary_large_image',
      noIndex:editingArticle.noIndex??false, allowComments:editingArticle.allowComments??true,
      showInRss:editingArticle.showInRss??true, ampEnabled:editingArticle.ampEnabled??false,
      redirectUrl:editingArticle.redirectUrl??'', cssClass:editingArticle.cssClass??'',
    })
  },[editingArticle])

  useEffect(()=>{
    setSeoAnalysis(analyzeSeo({title:form.title,description:form.description,content:form.content,seoTitle:form.seoTitle||undefined,metaDescription:form.metaDescription||undefined,focusKeyword:form.focusKeyword||undefined,slug:slugify(form.title)}))
  },[form.title,form.description,form.content,form.seoTitle,form.metaDescription,form.focusKeyword])

  useEffect(()=>{
    if(autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    if(!form.title.trim()) return
    autoSaveTimer.current=setTimeout(()=>saveDraft(true),30000)
    return ()=>{ if(autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  },[form]) // eslint-disable-line

  const wordCount=form.content.trim().split(/\s+/).filter(Boolean).length
  const readTimeCalc=Math.max(1,Math.round(wordCount/200))

  function buildPayload(overrideStatus?:EditorForm['status']) {
    const scheduledAt=form.scheduledDate&&form.scheduledTime?new Date(`${form.scheduledDate}T${form.scheduledTime}`).toISOString():null
    return {...form,status:overrideStatus??form.status,readTime:form.readTimeOverride?form.readTime:readTimeCalc,scheduledAt,seoTitle:form.seoTitle||null,metaDescription:form.metaDescription||null,focusKeyword:form.focusKeyword||null,canonicalUrl:form.canonicalUrl||null,ogImage:form.ogImage||null,redirectUrl:form.redirectUrl||null,cssClass:form.cssClass||null}
  }

  async function saveDraft(silent=false) {
    if(!form.title.trim()) return
    if(!silent) setSaving(true)
    try {
      await fetch(editingArticle?`/api/articles/${editingArticle.id}`:'/api/articles',{method:editingArticle?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(buildPayload('draft'))})
      setLastSaved(new Date())
    } catch(e){ console.error('Save failed',e) }
    finally{ if(!silent) setSaving(false) }
  }

  async function publishArticle() {
    if(!form.title.trim()||!form.content.trim()) return
    setPublishing(true)
    try {
      const res=await fetch(editingArticle?`/api/articles/${editingArticle.id}`:'/api/articles',{method:editingArticle?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(buildPayload('published'))})
      if(res.ok){const a=await res.json();set('status','published');setLastSaved(new Date());window.location.href=`/article/${a.slug}`}
    } catch(e){ console.error('Publish failed',e) }
    finally{ setPublishing(false) }
  }

  async function deleteArticle() {
    if(!editingArticle||!confirm('Delete this article? This cannot be undone.')) return
    await fetch(`/api/articles/${editingArticle.id}`,{method:'DELETE'})
    window.location.href='/dashboard'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-200 flex-wrap gap-y-2">
        {/* Left */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <nav className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
            <a href="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</a>
            <FiChevronRight size={12}/>
            <a href="/dashboard" className="hover:text-gray-600 transition-colors">Articles</a>
            <FiChevronRight size={12}/>
            <span className="text-gray-600 truncate">{editingArticle?'Edit article':'New article'}</span>
          </nav>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize shrink-0 ${STATUS_STYLES[form.status]??STATUS_STYLES.draft}`}>{form.status}</span>
          {lastSaved&&<span className="text-xs text-gray-400 shrink-0">Saved {lastSaved.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={()=>setSidebarOpen(o=>!o)}
            className={`md:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${sidebarOpen?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
            <FiSettings size={13}/> Settings
          </button>
          <button onClick={()=>saveDraft()} disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:border-gray-400 transition-all disabled:opacity-50">
            <FiSave size={13}/>{saving?'Saving…':'Save'}
          </button>
          <button onClick={()=>window.open(`/article/${slugify(form.title)}?preview=true`,'_blank')}
            className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:border-gray-400 transition-all">
            <FiEye size={13}/> Preview
          </button>
          <button onClick={publishArticle} disabled={publishing||!form.title.trim()||!form.content.trim()}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-gray-900 text-white font-bold hover:bg-gray-700 transition-all disabled:opacity-50">
            <FiSend size={12}/>{publishing?'Publishing…':form.status==='published'?'Update':form.status==='scheduled'?'Schedule':'Publish'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 min-w-0">
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-4 text-xs text-gray-400 flex-wrap gap-2">
            <span><strong className="text-gray-600">{wordCount}</strong> words · <strong className="text-gray-600">{readTimeCalc}</strong> min read</span>
            {seoAnalysis&&(
              <span className="flex items-center gap-1.5">SEO:
                <span className={`font-bold ${seoAnalysis.score>=70?'text-green-600':seoAnalysis.score>=50?'text-yellow-600':'text-red-600'}`}>{seoAnalysis.score}/100</span>
              </span>
            )}
          </div>

          <input value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Article title…" maxLength={120}
            className="w-full text-2xl md:text-3xl font-bold border-none outline-none bg-transparent text-gray-900 leading-snug mb-3 pb-4 border-b border-gray-200 placeholder:text-gray-300"/>

          <textarea value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Write a short description for previews and SEO…" rows={2}
            className="w-full text-sm border-none outline-none bg-transparent text-gray-500 resize-none leading-relaxed my-3 mb-5 font-mono placeholder:text-gray-300"/>

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 mb-4">
            {(['write','preview'] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)}
                className={`text-sm px-4 py-2 font-semibold capitalize transition-colors ${activeTab===tab?'text-gray-900 border-b-2 border-gray-900 -mb-px':'text-gray-400 hover:text-gray-600'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab==='write'?(
            <>
              <RichEditor value={form.content} onChange={v=>set('content',v)} placeholder="Start writing your article…" minHeight={360}/>
              <FeaturedImageUploader value={form.image} onChange={v=>set('image',v)}/>
            </>
          ):(
            <div className="border border-gray-200 rounded-xl p-6 min-h-96 bg-white">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{form.title||'(No title)'}</h1>
              <p className="text-sm text-gray-500 mb-5 leading-relaxed">{form.description||'(No description)'}</p>
              <div className="text-sm leading-8 text-gray-800 whitespace-pre-wrap break-words">{form.content||'(No content yet)'}</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className={`
          bg-white border-l border-gray-200 overflow-y-auto pb-6
          md:w-72 md:shrink-0 md:static md:translate-x-0
          fixed top-0 right-0 bottom-0 w-80 z-50 transition-transform duration-200
          ${sidebarOpen?'translate-x-0':'translate-x-full md:translate-x-0'}
        `}>
          <div className="md:hidden flex justify-end px-4 pt-4">
            <button onClick={()=>setSidebarOpen(false)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
              <FiX size={13}/> Close
            </button>
          </div>
          <PublishPanel form={form} set={set} tags={tags} setTags={setTags} onDelete={editingArticle?deleteArticle:undefined}/>
          <SeoPanel form={form} set={set} seoAnalysis={seoAnalysis}/>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen&&(
          <div onClick={()=>setSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black/40 z-40"/>
        )}
      </div>
    </div>
  )
}

// ── Write Page ────────────────────────────────────────────────────────────────

export default function WritePage() {
  const [editingArticle]=useState<NewsArticle|null>(null) // Replace with actual data fetching
  return <ArticleEditor editingArticle={editingArticle}/>
}