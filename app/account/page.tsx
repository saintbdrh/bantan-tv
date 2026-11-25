import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { SiteShell } from '@/components/SiteShell';
import { LogoutButton } from '@/components/LogoutButton';
export default async function AccountPage() {
  const user=await getSession();
  if(!user) redirect('/login?next=/account');
  return <SiteShell><div className="container community-page"><div className="community-heading"><p className="eyebrow">MY BANTAN</p><h1>Сайн уу, <span>{user.fullName}.</span></h1><p>{user.email} · ✓ Баталгаажсан</p></div><div className="community-panel account-panel"><h2>Таны Bantan булан</h2><p>Тоглож, рекордоо хадгалаад, найзуудаа баярлуулаарай.</p><div className="community-actions"><Link href="/games" className="live-button">Тетрис ба миний оноо ↗</Link><Link href="/trees" className="ghost-button">Миний гацуур ↗</Link><LogoutButton/></div><p className="community-muted">Таны имэйл хаяг баталгаажсан. Нууц үг болон баталгаажуулах кодоо бусдад бүү дамжуулаарай.</p></div></div></SiteShell>;
}
