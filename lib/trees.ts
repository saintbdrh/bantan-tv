export const ORNAMENTS = { bauble: '🔴', gift: '🎁', heart: '❤️', bell: '🔔', snow: '❄️', letter: '💌', star: '⭐' } as const;
export type OrnamentKind = keyof typeof ORNAMENTS;
export type Tree = { id: string; user_id: string|null; title: string; name: string; count: number };
export type Ornament = { id: string; author_id: string; name: string; slot: number; kind: OrnamentKind; message: string };
// One star plus six rows; the wider base has more places for friends' wishes.
export const TREE_SLOTS = [{ x: 50, y: 8 }, ...[2, 3, 4, 5, 5, 5].flatMap((count, row) =>
  Array.from({ length: count }, (_, i) => ({ x: 50 + (i - (count - 1) / 2) * (row < 2 ? 15 : 14), y: 27 + row * 11 }))
)];

export const COMMUNITY_TREE_ID = 'bantan-tv';
export const COMMUNITY_TREE_TITLE = 'Bantan TV-ийн их гацуур';
// 196 permanent places. A large, horizontally scrollable canvas keeps touch
// targets usable on phones instead of squeezing all positions into the viewport.
export const COMMUNITY_TREE_SLOTS = [{x:50,y:8}, ...Array.from({length:13},(_,row)=>{
  const count=3+row*2;
  const spread=13+row*5.2;
  return Array.from({length:count},(_,i)=>({x:50-spread/2+i*spread/(count-1),y:24+row*5.1}));
}).flat()];
export function treeSlots(id:string) { return id===COMMUNITY_TREE_ID?COMMUNITY_TREE_SLOTS:TREE_SLOTS; }
