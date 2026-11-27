import { getSharedTree } from '@/lib/tree-sharing';

// Existing shared URLs keep working without runtime PNG rendering on Workers Free.
// Stories are rendered on the device; link cards use pre-rendered public artwork.
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const tree=await getSharedTree(id);
  if(!tree)return new Response('Tree not found',{status:404});
  return Response.redirect(new URL('/images/tree-link-preview.png',request.url),307);
}
