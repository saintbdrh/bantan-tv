import { createHash } from 'crypto';
import { getDb } from '@/lib/db';
import { COMMUNITY_TREE_ID, COMMUNITY_TREE_TITLE, type OrnamentKind } from '@/lib/trees';

export type SharedTree = { id:string; title:string; name:string; ornaments:{slot:number;kind:OrnamentKind}[] };
export const TREE_SHARE_ORIGIN='https://www.bantan.tv';

export async function getSharedTree(id:string):Promise<SharedTree|null> {
  if(!/^[\w-]{1,64}$/.test(id))return null;
  const db=await getDb();
  if(id===COMMUNITY_TREE_ID){
    const ornaments=await db.prepare('SELECT slot,kind FROM community_tree_ornaments ORDER BY slot LIMIT 196').all<{slot:number;kind:OrnamentKind}>();
    return {id,title:COMMUNITY_TREE_TITLE,name:'Bantan TV',ornaments:ornaments.results};
  }
  const tree=await db.prepare('SELECT t.id,t.title,u.full_name AS name FROM trees t JOIN users u ON u.id=t.user_id WHERE t.id=?').bind(id).first<{id:string;title:string;name:string}>();
  if(!tree)return null;
  // Export only public decoration positions. Do not put wishes, author names,
  // account identifiers or email addresses into the generated image payload.
  const ornaments=await db.prepare('SELECT slot,kind FROM tree_ornaments WHERE tree_id=? ORDER BY slot').bind(id).all<{slot:number;kind:OrnamentKind}>();
  return {...tree,ornaments:ornaments.results};
}

export function sharedTreeRevision(tree:SharedTree){
  return createHash('sha256').update(JSON.stringify(tree)).digest('hex').slice(0,16);
}
