import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { Toaster } from '../components/ui/toaster'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '../contexts/AuthContext'
import { AppLayout } from '../components/layout/AppLayout'
import '../styles/globals.css'

const publicRoutes = ['/auth/login', '/auth/register', '/']

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const isPublicRoute = publicRoutes.includes(router.pathname)

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <AuthProvider>
        <div className="min-h-screen bg-background text-foreground">
          {isPublicRoute ? (
            <Component {...pageProps} />
          ) : (
            <AppLayout>
              <Component {...pageProps} />
            </AppLayout>
          )}

          <Toaster />
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}
