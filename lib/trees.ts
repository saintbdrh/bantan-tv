export const ORNAMENTS = { bauble: '🔴', gift: '🎁', heart: '❤️', bell: '🔔', snow: '❄️', letter: '💌', star: '⭐' } as const;
export type OrnamentKind = keyof typeof ORNAMENTS;
export type Tree = { id: string; user_id: string; title: string; name: string; count: number };
export type Ornament = { id: string; author_id: string; name: string; slot: number; kind: OrnamentKind; message: string };
// One star plus six rows; the wider base has more places for friends' wishes.
export const TREE_SLOTS = [{ x: 50, y: 8 }, ...[2, 3, 4, 5, 5, 5].flatMap((count, row) =>
  Array.from({ length: count }, (_, i) => ({ x: 50 + (i - (count - 1) / 2) * (row < 2 ? 15 : 14), y: 27 + row * 11 }))
)];
