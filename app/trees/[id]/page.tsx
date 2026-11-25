import { SiteShell } from '@/components/SiteShell';
import { ChristmasTrees } from '@/components/ChristmasTrees';
export default async function TreePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  return <SiteShell><div className="container community-page"><ChristmasTrees id={id}/></div></SiteShell>;
}
