import Link from 'next/link';
import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';

/**
 * «Санал» — movie election / vote entry.
 * Assets from design pack in /public/sanal.
 * Full live voting + stream can plug in here later.
 */
export default function SanalPage() {
  return (
    <SiteShell>
      <div className="container sanal-page">
        <HomeBack />

        <div className="sanal-hero">
          <img
            src="/sanal/sanal-wordmark-lg.svg"
            alt="САНАЛ"
            className="sanal-wordmark"
          />
          <p className="page-lead sanal-lead">
            Үзэгчдийн санал — дараагийн кино сонголт. Удахгүй шууд санал хураалт нээгдэнэ.
          </p>
        </div>

        <div className="sanal-actions">
          <Link href="/live" className="sanal-btn sanal-btn-primary">
            <span>ШУУД ҮЗЭХ</span>
            <img src="/sanal/arrow.svg" alt="" width={28} height={28} />
          </Link>
          <Link href="/schedule" className="sanal-btn sanal-btn-outline">
            <span>ХӨТӨЛБӨР</span>
          </Link>
        </div>

        <p className="sanal-note">Тун удахгүй · кино сонголт · санал хураалт</p>
      </div>
    </SiteShell>
  );
}
