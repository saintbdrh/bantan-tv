import { ImageResponse } from 'next/og';
import { TreeShareCard } from '@/components/TreeShareCard';
import { getSharedTree, sharedTreeRevision, TREE_SHARE_ORIGIN } from '@/lib/tree-sharing';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params;
    const tree=await getSharedTree(id);
    if(!tree)return new Response('Tree not found',{status:404});
    const story=new URL(request.url).searchParams.get('format')==='story';
    const format=story?'story':'card';
    const revision=sharedTreeRevision(tree);
    const cache=typeof caches!=='undefined'?(caches as unknown as {default?:Cache}).default:undefined;
    const key=new Request(`${TREE_SHARE_ORIGIN}/trees/${encodeURIComponent(id)}/share-image?format=${format}&v=${revision}`);
    try { const hit=await cache?.match(key);if(hit)return hit; } catch { /* Cache API is optional in local preview. */ }
    const image=new ImageResponse(TreeShareCard({tree,story}),{width:story?1080:1200,height:story?1920:630});
    const response=new Response(await image.arrayBuffer(),{headers:{
      'Content-Type':'image/png',
      'Cache-Control':'public, max-age=300, stale-while-revalidate=60',
      'Content-Disposition':`inline; filename="bantan-tree-${format}.png"`,
      'ETag':`"${revision}-${format}"`,
      'X-Content-Type-Options':'nosniff',
    }});
    try { await cache?.put(key,response.clone()); } catch { /* Serve the image even if edge caching is unavailable. */ }
    return response;
  }catch(error){console.error('Tree share image generation failed',error instanceof Error?error.message:'Unknown error');return new Response('Image temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});}
}
