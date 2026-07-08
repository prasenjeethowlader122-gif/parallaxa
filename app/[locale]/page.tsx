
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import HomeView from '@/components/HomeView';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HomeView />
      <Footer />
    </div>
  );
}
