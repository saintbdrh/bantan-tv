import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { EpgSection } from '@/components/EpgSection';

export default function SchedulePage() {
  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="page-hero">
          <p className="eyebrow">ХӨТӨЛБӨР</p>
          <h1 className="page-title">Хөтөлбөр</h1>
          <p className="page-lead">7 хоногийн телевизийн хуваарь.</p>
        </div>
        <EpgSection />
      </div>
    </SiteShell>
  );
}
