import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell">
      <Navbar />
      <main className="inner-main">{children}</main>
      <Footer />
    </div>
  );
}
