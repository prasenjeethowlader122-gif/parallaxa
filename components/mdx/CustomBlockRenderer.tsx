import React from 'react'

interface CustomBlockProps {
  className: string
  dataUrl: string
  dangerouslySetInnerHTML?: string
  children?: React.ReactNode
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CUSTOM BLOCK RENDERER
 * ═══════════════════════════════════════════════════════════════════════════
 * সকল custom MDX blocks render করার জন্য unified component
 */

export const CustomBlockRenderer: React.FC<CustomBlockProps> = ({
  className,
  dataUrl,
  dangerouslySetInnerHTML,
  children,
}) => {
  const blockType = className.split(' ')[1]

  return (
    <div className={`custom-block-wrapper ${blockType}-wrapper`}>
      {dangerouslySetInnerHTML ? (
        <div
          className={className}
          data-url={dataUrl}
          dangerouslySetInnerHTML={{ __html: dangerouslySetInnerHTML }}
        />
      ) : (
        <div className={className} data-url={dataUrl}>
          {children}
        </div>
      )}
    </div>
  )
}

// Custom MDX component handlers
export const customBlockComponents = {
  fbpost: (props: any) => (
    <CustomBlockRenderer
      className="custom-block fbpost-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  tweet: (props: any) => (
    <CustomBlockRenderer
      className="custom-block tweet-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  youtube: (props: any) => (
    <CustomBlockRenderer
      className="custom-block youtube-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  tiktok: (props: any) => (
    <CustomBlockRenderer
      className="custom-block tiktok-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  instagram: (props: any) => (
    <CustomBlockRenderer
      className="custom-block instagram-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  reddit: (props: any) => (
    <CustomBlockRenderer
      className="custom-block reddit-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  vimeo: (props: any) => (
    <CustomBlockRenderer
      className="custom-block vimeo-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  codepen: (props: any) => (
    <CustomBlockRenderer
      className="custom-block codepen-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
  gist: (props: any) => (
    <CustomBlockRenderer
      className="custom-block gist-embed"
      dataUrl={props.dataUrl}
      dangerouslySetInnerHTML={props.dangerouslySetInnerHTML}
    />
  ),
}
