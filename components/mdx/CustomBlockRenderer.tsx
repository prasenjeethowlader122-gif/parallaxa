import React from 'react'
import { Info, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Book, StickyNote } from 'lucide-react'

interface CustomBlockProps {
  className: string
  dataUrl: string
  htmlContent?: string
  children?: React.ReactNode
}

export const CustomBlockRenderer: React.FC<CustomBlockProps> = ({
  className,
  dataUrl,
  htmlContent,
  children,
}) => {
  const blockType = (className || '').split(' ')[1] || 'generic'

  return (
    <div className={`custom-block-wrapper ${blockType}-wrapper`}>
      {htmlContent ? (
        <div
          className={className}
          data-url={dataUrl}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : (
        <div className={className} data-url={dataUrl}>
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Renderer for user-created DB blocks.
 * hName is 'dbblock', props: blockname, htmlcontent
 */
export const DBBlockRenderer: React.FC<{ blockname?: string; htmlcontent?: string; children?: React.ReactNode }> = ({
  blockname = '',
  htmlcontent = '',
}) => (
  <div
    className={`custom-block db-block db-block--${blockname}`}
    data-block={blockname}
    dangerouslySetInnerHTML={{ __html: htmlcontent }}
  />
)

export const customBlockComponents = {
  embed: (props: any) => (
    <CustomBlockRenderer
      className={props.className || 'custom-block embed'}
      dataUrl={props.dataUrl}
      htmlContent={props.htmlContent}
    />
  ),
  run: (props: any) => {
    const sandbox = "allow-scripts allow-popups allow-forms";
    const srcDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; font-family: sans-serif; }
          </style>
        </head>
        <body>
          ${props.htmlContent}
        </body>
      </html>
    `;
    return (
      <div className="my-6 rounded-none overflow-hidden border border-gray-200 bg-white">
        <iframe
          title="Custom Code"
          sandbox={sandbox}
          srcDoc={srcDoc}
          style={{ width: '100%', height: 'auto', minHeight: '300px', border: 'none' }}
        />
      </div>
    );
  },
  style: (props: any) => (
    <CustomBlockRenderer
      className="custom-block custom-style"
      dataUrl=""
      htmlContent={props.htmlContent}
    />
  ),
  dbblock: (props: any) => (
    <DBBlockRenderer blockname={props.blockname} htmlcontent={props.htmlcontent} />
  ),
  goal: (props: any) => {
    const current = parseFloat(props.current) || 0
    const total = parseFloat(props.total) || 100
    const percentage = Math.min(100, Math.max(0, (current / total) * 100))
    return (
      <div className="my-6 p-5 bg-white border border-gray-100 rounded-none shadow-none">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" />
            {props.title}
          </h4>
          <span className="text-xs font-bold text-gray-500 tabular-nums">
            {props.current} / {props.total} {props.unit}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-none overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  },
  callout: (props: any) => {
    const icons: Record<string, any> = {
      info: <Info size={18} className="text-blue-500" />,
      warning: <AlertTriangle size={18} className="text-amber-500" />,
      success: <CheckCircle2 size={18} className="text-emerald-500" />,
      error: <XCircle size={18} className="text-red-500" />,
    }
    const bgColors: Record<string, string> = {
      info: 'bg-blue-50 border-blue-100',
      warning: 'bg-amber-50 border-amber-100',
      success: 'bg-emerald-50 border-emerald-100',
      error: 'bg-red-50 border-red-100',
    }
    const textColors: Record<string, string> = {
      info: 'text-blue-900',
      warning: 'text-amber-900',
      success: 'text-emerald-900',
      error: 'text-red-900',
    }
    return (
      <div className={`my-6 p-4 rounded-none border flex gap-3 ${bgColors[props.type] || bgColors.info}`}>
        <div className="shrink-0 mt-0.5">
          {icons[props.type] || icons.info}
        </div>
        <div>
          {props.title && <p className="text-sm font-bold mb-1">{props.title}</p>}
          <p className={`text-sm leading-relaxed ${textColors[props.type] || textColors.info}`}>{props.message}</p>
        </div>
      </div>
    )
  },
  button: (props: any) => (
    <div className="my-6">
      <a
        href={props.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-6 py-2.5 rounded-none text-white text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-none"
        style={{ backgroundColor: props.color || '#1a1b1c' }}
      >
        {props.text}
      </a>
    </div>
  ),
  badge: (props: any) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700',
      emerald: 'bg-emerald-100 text-emerald-700',
      red: 'bg-red-100 text-red-700',
      amber: 'bg-amber-100 text-amber-700',
      gray: 'bg-gray-100 text-gray-700',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider ${colors[props.color] || colors.gray}`}>
        {props.text}
      </span>
    )
  },
  infobox: (props: any) => {
    const icons: Record<string, any> = {
      info: <Info size={18} className="text-blue-500" />,
      warning: <AlertTriangle size={18} className="text-amber-500" />,
    }
    const bgColors: Record<string, string> = {
      info: 'bg-blue-50 border-blue-100',
      warning: 'bg-amber-50 border-amber-100',
    }
    return (
      <div className={`my-6 p-5 rounded-none border ${bgColors[props.type] || bgColors.info} shadow-none`}>
        <div className="flex items-center gap-2 mb-2">
          {icons[props.type] || icons.info}
          <h4 className="text-sm font-bold text-gray-900">{props.title || 'Information'}</h4>
        </div>
        <div className="text-sm leading-relaxed text-gray-800">
          {props.content}
        </div>
      </div>
    )
  },
  reference: (props: any) => (
    <div className="my-4 p-4 bg-gray-50 border border-gray-100 rounded-none flex items-start gap-3">
      <Book size={16} className="text-gray-400 mt-1 shrink-0" />
      <div className="text-xs text-gray-600 italic">
        <span className="font-bold text-gray-900 not-italic">{props.author}</span> {props.year ? `(${props.year})` : ''}.
        {props.url ? (
          <a href={props.url} target="_blank" rel="noopener noreferrer" className="mx-1 text-blue-600 hover:underline">
            {props.text}
          </a>
        ) : (
          <span className="mx-1">{props.text}</span>
        )}
      </div>
    </div>
  ),
  tika: (props: any) => (
    <div className="my-4 p-4 bg-yellow-50/50 border-l-4 border-yellow-400 rounded-none flex items-start gap-3">
      <StickyNote size={16} className="text-yellow-600 mt-1 shrink-0" />
      <div className="text-sm text-yellow-900">
        <span className="font-bold block mb-1 text-[10px] uppercase tracking-wider text-yellow-600">টিকা</span>
        {props.text}
      </div>
    </div>
  ),
  customtable: (props: any) => {
    const headers = (props.headers || '').split(',').filter(Boolean)
    const rows = (props.rows || '').split('|').map((row: string) => row.split(','))
    return (
      <div className="my-6 overflow-x-auto rounded-none border border-gray-200">
        {props.title && (
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
            {props.title}
          </div>
        )}
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {headers.map((h: string, i: number) => (
                <th key={i} className="px-4 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row: string[], i: number) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {row.map((cell: string, j: number) => (
                  <td key={j} className="px-4 py-3 text-gray-600">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
  // Backward compatibility
  fbpost: (props: any) => (
    <CustomBlockRenderer className="custom-block fbpost-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  tweet: (props: any) => (
    <CustomBlockRenderer className="custom-block tweet-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  youtube: (props: any) => (
    <CustomBlockRenderer className="custom-block youtube-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  tiktok: (props: any) => (
    <CustomBlockRenderer className="custom-block tiktok-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  instagram: (props: any) => (
    <CustomBlockRenderer className="custom-block instagram-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  reddit: (props: any) => (
    <CustomBlockRenderer className="custom-block reddit-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  vimeo: (props: any) => (
    <CustomBlockRenderer className="custom-block vimeo-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  codepen: (props: any) => (
    <CustomBlockRenderer className="custom-block codepen-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
  gist: (props: any) => (
    <CustomBlockRenderer className="custom-block gist-embed" dataUrl={props.dataUrl} htmlContent={props.htmlContent} />
  ),
}
