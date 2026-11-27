import { SiteShell } from '@/components/SiteShell';
import { ChristmasTrees } from '@/components/ChristmasTrees';
import type { Metadata } from 'next';
import { getSharedTree, TREE_SHARE_ORIGIN } from '@/lib/tree-sharing';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;
  const tree=await getSharedTree(id);
  if(!tree)return {title:'Гацуур олдсонгүй · Bantan TV',robots:{index:false}};
  const url=`${TREE_SHARE_ORIGIN}/trees/${encodeURIComponent(id)}`;
  const image=`${TREE_SHARE_ORIGIN}/images/tree-link-preview.png`;
  const title=`${tree.title} · Bantan TV`;
  const description='Миний гацуурыг чимэглээд нэг дулаахан мэндчилгээ үлдээгээрэй.';
  return {title,description,alternates:{canonical:url},openGraph:{title,description,url,type:'website',siteName:'Bantan TV',images:[{url:image,width:1200,height:630,alt:'Bantan TV · Гацуураа хамтдаа чимэглэе'}]},twitter:{card:'summary_large_image',title,description,images:[image]}};
}
export default async function TreePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  return <SiteShell><div className="container community-page"><ChristmasTrees id={id}/></div></SiteShell>;
}
