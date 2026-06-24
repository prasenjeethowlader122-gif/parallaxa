import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function WritePageClient({ session }: { session: any }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Write Article</h1>
        <p className="text-muted-foreground">Article editor — logged in as: {session?.user?.name ?? session?.user?.email}</p>
      </main>
      <Footer />
    </div>
  )
}
