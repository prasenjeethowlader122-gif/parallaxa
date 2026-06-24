import { Switch, Route, Router as WouterRouter, Redirect } from 'wouter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import NotFound from '@/pages/not-found'
import Home from '@/pages/Home'
import ArticlePage from '@/pages/ArticlePage'
import SearchPage from '@/pages/SearchPage'
import SignInPage from '@/pages/SignInPage'
import SignUpPage from '@/pages/SignUpPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import Dashboard from '@/pages/Dashboard'
import WritePage from '@/pages/WritePage'
import CategoryPage from '@/pages/CategoryPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
})

function Router() {
  return (
    <Switch>
      {/* Root redirect to Bangla locale */}
      <Route path="/">
        <Redirect to="/bn" />
      </Route>

      {/* Locale-based routes */}
      <Route path="/:locale" component={Home} />
      <Route path="/:locale/article/:slug" component={ArticlePage} />
      <Route path="/:locale/search" component={SearchPage} />
      <Route path="/:locale/category/:slug" component={CategoryPage} />
      <Route path="/:locale/auth/signin" component={SignInPage} />
      <Route path="/:locale/auth/signup" component={SignUpPage} />
      <Route path="/:locale/auth/forgot-password" component={ForgotPasswordPage} />
      <Route path="/:locale/dashboard" component={Dashboard} />
      <Route path="/:locale/write" component={WritePage} />

      <Route component={NotFound} />
    </Switch>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') ?? ''}>
            <Router />
            <Toaster />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
