import { SiteShell } from '@/components/SiteShell';
import { TetrisGame } from '@/components/TetrisGame';

export default function GamesPage() {
  return <SiteShell><div className="container community-page"><div className="community-heading"><p className="eyebrow">PRESS PLAY · BANTAN TV</p><h1>Завсарлагаар <span>тоглоё.</span></h1><p>Өнгөө тааруул. Мөрөө дүүргэ. Рекордоо шинэчил.</p></div><TetrisGame /></div></SiteShell>;
}
