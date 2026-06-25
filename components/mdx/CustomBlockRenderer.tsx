import React from 'react'

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
  run: (props: any) => (
    <CustomBlockRenderer
      className="custom-block run-code"
      dataUrl=""
      htmlContent={props.htmlContent}
    />
  ),
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
