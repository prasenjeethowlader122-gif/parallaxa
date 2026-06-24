import React from 'react'

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  quality?: number
  placeholder?: string
  blurDataURL?: string
  unoptimized?: boolean
  sizes?: string
  style?: React.CSSProperties
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(({
  src,
  alt,
  width,
  height,
  fill,
  priority,
  quality,
  placeholder,
  blurDataURL,
  unoptimized,
  style,
  ...props
}, ref) => {
  const imgStyle: React.CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }
    : style ?? {}

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      style={imgStyle}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  )
})

Image.displayName = 'Image'
export default Image
