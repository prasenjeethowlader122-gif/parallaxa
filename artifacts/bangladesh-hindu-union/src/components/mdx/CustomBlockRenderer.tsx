import React from 'react'

/**
 * Props come from the remark/rehype pipeline via hProperties data-* attributes.
 * rehype lowercases camelCase keys, so we use data-html and data-url instead of
 * htmlContent/dataUrl to ensure reliable pass-through.
 */
interface CustomBlockProps {
  className?: string
  'data-url'?: string
  'data-html'?: string
  children?: React.ReactNode
  [key: string]: unknown
}

export const CustomBlockRenderer: React.FC<CustomBlockProps> = (props) => {
  const html = props['data-html'] as string | undefined
  const url = props['data-url'] as string | undefined
  const className = (props.className as string) || 'custom-block'
  const blockType = className.split(' ')[1] || 'generic'

  return (
    <div className={`custom-block-wrapper ${blockType}-wrapper my-4`}>
      {html ? (
        <div
          className={className}
          data-url={url}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className={className} data-url={url}>
          {props.children}
        </div>
      )}
    </div>
  )
}

/**
 * Component map for react-markdown.
 * Keys must match the hName set in block handlers (e.g. 'customembed', 'customrun', etc.)
 * because react-markdown uses the element tag name as the component key.
 */
export const customBlockComponents: Record<string, React.FC<any>> = {
  customembed: (props) => <CustomBlockRenderer {...props} />,
  customrun: (props) => <CustomBlockRenderer {...props} />,
  customstyle: (props) => <CustomBlockRenderer {...props} />,
  // Legacy shorthand blocks
  customfbpost: (props) => <CustomBlockRenderer {...props} />,
  customtweet: (props) => <CustomBlockRenderer {...props} />,
  customyoutube: (props) => <CustomBlockRenderer {...props} />,
  customtiktok: (props) => <CustomBlockRenderer {...props} />,
  custominstagram: (props) => <CustomBlockRenderer {...props} />,
  customreddit: (props) => <CustomBlockRenderer {...props} />,
  customvimeo: (props) => <CustomBlockRenderer {...props} />,
  customcodepen: (props) => <CustomBlockRenderer {...props} />,
  customgist: (props) => <CustomBlockRenderer {...props} />,
}
