import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { PartnerBanner } from '@/components/PartnerBanner';

export default function AdvertisePage() {
  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="page-hero">
          <p className="eyebrow">Брэнд, байгууллагад</p>
          <h1 className="page-title">BANTAN-ТАЙ ХАМТРАН АЖИЛЛАХ</h1>
          <p className="page-lead">
            Таны брэндийг Монголын телевизийн үзэгчдэд хүргэх боломж.
          </p>
        </div>
        <PartnerBanner />
      </div>
    </SiteShell>
  );
}
