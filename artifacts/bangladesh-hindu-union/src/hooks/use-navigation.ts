import { useLocation, useParams as useWouterParams } from 'wouter'

export function useRouter() {
  const [, navigate] = useLocation()
  const router = {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => window.history.back(),
    refresh: () => window.location.reload(),
    prefetch: (_href: string) => {},
  }
  return router
}

export function usePathname() {
  const [location] = useLocation()
  return location
}

export function useSearchParams() {
  return new URLSearchParams(window.location.search)
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return useWouterParams<T>()
}

export function redirect(href: string) {
  window.location.href = href
}

export { useParams as useRouteParams }
