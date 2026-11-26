import { getCloudflareContext } from '@opennextjs/cloudflare';
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
    const {env}=await getCloudflareContext({async:true});
    const renderer=(env as unknown as {TREE_SHARE_IMAGES?:Fetcher}).TREE_SHARE_IMAGES;
    if(!renderer)return new Response('Image service unavailable',{status:503});
    const image=await renderer.fetch('https://tree-share/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tree,story})});
    if(!image.ok)return new Response('Image temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'2'}});
    const response=new Response(image.body,{headers:{
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
