import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ApiError, apiError, limitRequests, privateJson, readBody, textField } from '@/lib/api';
import { ORNAMENTS } from '@/lib/trees';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id && !/^[\w-]{1,64}$/.test(id)) throw new ApiError('Гацуурын хаяг буруу.');
    const user = await getSession();
    const db = await getDb();
    if (id) {
      const tree = await db.prepare('SELECT t.id,t.user_id,t.title,u.full_name AS name FROM trees t JOIN users u ON u.id=t.user_id WHERE t.id=?').bind(id).first();
      if (!tree) throw new ApiError('Гацуур олдсонгүй.', 404);
      const ornaments = await db.prepare('SELECT o.id,o.author_id,o.slot,o.kind,o.message,u.full_name AS name FROM tree_ornaments o JOIN users u ON u.id=o.author_id WHERE o.tree_id=? ORDER BY o.slot').bind(id).all();
      return privateJson({ tree, ornaments: ornaments.results, userId: user?.id ?? null });
    }
    const trees = await db.prepare(`SELECT t.id,t.user_id,t.title,u.full_name AS name,COUNT(o.id) AS count FROM trees t JOIN users u ON u.id=t.user_id LEFT JOIN tree_ornaments o ON o.tree_id=t.id GROUP BY t.id ORDER BY t.created_at DESC LIMIT 30`).all();
    const mine = user ? await db.prepare('SELECT id FROM trees WHERE user_id=?').bind(user.id).first() : null;
    return privateJson({ trees: trees.results, mine, userId: user?.id ?? null });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const user = await getSession();
    if (!user) throw new ApiError('Гацуур чимэглэхийн тулд нэвтэрнэ үү.', 401);
    await limitRequests('trees', user.id, 40);
    const db = await getDb();
    if (body.action === 'create') {
      const title = textField(body, 'title', 60);
      if (!title) throw new ApiError('Гацууртаа нэр өгнө үү.');
      const id = randomUUID();
      await db.prepare('INSERT INTO trees (id,user_id,title,created_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO NOTHING').bind(id,user.id,title,new Date().toISOString()).run();
      const mine = await db.prepare('SELECT id FROM trees WHERE user_id=?').bind(user.id).first();
      return privateJson(mine);
    }
    const treeId = textField(body, 'treeId', 64);
    const tree = await db.prepare('SELECT user_id FROM trees WHERE id=?').bind(treeId).first<{user_id:string}>();
    if (!tree) throw new ApiError('Гацуур олдсонгүй.', 404);
    if (body.action === 'remove') {
      const ornamentId = textField(body,'ornamentId',64);
      const result = await db.prepare('DELETE FROM tree_ornaments WHERE id=? AND tree_id=? AND (author_id=? OR ?=?)').bind(ornamentId,treeId,user.id,tree.user_id,user.id).run();
      if (!result.meta.changes) throw new ApiError('Энэ чимэглэлийг устгах эрхгүй.', 403);
      return privateJson({ ok:true });
    }
    if (body.action !== 'decorate') throw new ApiError('Үйлдэл буруу.');
    const kind = textField(body,'kind',20);
    const message = textField(body,'message',240);
    const slot = body.slot;
    if (!Object.hasOwn(ORNAMENTS, kind) || typeof slot !== 'number' || !Number.isInteger(slot) || slot < 0 || slot > 24 || (slot === 0) !== (kind === 'star')) throw new ApiError('Чимэглэл эсвэл байрлал буруу.');
    // Atomic quota check and slot claim: concurrent requests cannot exceed five gifts.
    const result = await db.prepare(`INSERT INTO tree_ornaments (id,tree_id,author_id,slot,kind,message,created_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM tree_ornaments WHERE tree_id=? AND author_id=?) < 5 ON CONFLICT(tree_id,slot) DO NOTHING`).bind(randomUUID(),treeId,user.id,slot,kind,message,new Date().toISOString(),treeId,user.id).run();
    if (!result.meta.changes) throw new ApiError('Энэ байрлал дүүрсэн эсвэл таны 5 чимэглэлийн хязгаарт хүрсэн байна.',409);
    return privateJson({ ok:true });
  } catch (error) { return apiError(error); }
}
