import React from 'react'
import { Link as WouterLink } from 'wouter'

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
  prefetch?: boolean
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(({
  href,
  children,
  prefetch,
  replace,
  scroll,
  shallow,
  ...props
}, ref) => {
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return <a ref={ref} href={href} {...props}>{children}</a>
  }
  return (
    <WouterLink href={href} ref={ref as any} replace={replace} {...props}>
      {children}
    </WouterLink>
  )
})

Link.displayName = 'Link'
export default Link
