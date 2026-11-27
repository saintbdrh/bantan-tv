import { randomBytes, randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ApiError, apiError, limitRequests, privateJson, readBody } from '@/lib/api';
import { replay, RULES_VERSION, type Move } from '@/lib/tetris';
import { replay as legacyReplay } from '@/lib/tetris-legacy';

export async function GET() {
  try {
    const user = await getSession();
    const db = await getDb();
    const leaders = await db.prepare(`SELECT u.full_name AS name, MAX(r.score) AS score FROM tetris_runs r JOIN users u ON u.id=r.user_id WHERE r.completed_at IS NOT NULL GROUP BY r.user_id ORDER BY score DESC, name ASC LIMIT 10`).all();
    const best = user ? await db.prepare('SELECT MAX(score) AS score FROM tetris_runs WHERE user_id=? AND completed_at IS NOT NULL').bind(user.id).first<{score:number|null}>() : null;
    return privateJson({ leaders: leaders.results, best: best?.score ?? 0, authenticated: !!user });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request, 600000);
    const user = await getSession();
    if (!user) throw new ApiError('Оноогоо хадгалахын тулд нэвтэрнэ үү.', 401);
    const db = await getDb();
    if (body.action === 'start') {
      const version=body.rulesVersion ?? 1;
      if(version!==1 && version!==RULES_VERSION)throw new ApiError('Тоглоомоо дахин ачаална уу.');
      await limitRequests('tetris-start', user.id, 30);
      const id = randomUUID();
      const seed = randomBytes(4).readUInt32LE();
      await db.prepare('INSERT INTO tetris_runs (id,user_id,seed,started_at,rules_version) VALUES (?,?,?,?,?)').bind(id, user.id, seed, Date.now(),version).run();
      return privateJson({ id, seed, rulesVersion:version });
    }
    if (body.action !== 'finish' || typeof body.id !== 'string' || body.id.length > 64 || !Array.isArray(body.moves)) throw new ApiError('Тоглолтын мэдээлэл буруу.');
    await limitRequests('tetris-finish', user.id, 40);
    const run = await db.prepare('SELECT seed,started_at,completed_at,score,rules_version FROM tetris_runs WHERE id=? AND user_id=?').bind(body.id, user.id).first<{seed:number;started_at:number;completed_at:number|null;score:number;rules_version:number}>();
    if (!run) throw new ApiError('Тоглолт олдсонгүй.', 404);
    if (run.completed_at !== null) return privateJson({ score: run.score, saved: true });
    const ticks = body.ticks;
    if (typeof ticks !== 'number' || ticks * 60 > Date.now() - run.started_at + 3000 || Date.now() - run.started_at > 24 * 60 * 60 * 1000) throw new ApiError('Тоглолтын хугацаа буруу.');
    let result;
    try { result = run.rules_version===RULES_VERSION?replay(run.seed,body.moves as Move[],ticks):legacyReplay(run.seed,body.moves as Parameters<typeof legacyReplay>[1],ticks); } catch { throw new ApiError('Тоглолтыг баталгаажуулж чадсангүй.'); }
    await db.prepare('UPDATE tetris_runs SET completed_at=?,score=?,lines=? WHERE id=? AND user_id=? AND completed_at IS NULL').bind(Date.now(), result.score, result.lines, body.id, user.id).run();
    return privateJson({ score: result.score, lines: result.lines, saved: true });
  } catch (error) { return apiError(error); }
}
