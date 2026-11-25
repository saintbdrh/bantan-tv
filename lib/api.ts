import { createHash } from 'crypto';
import { getDb } from '@/lib/db';

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function sameOrigin(request: Request) {
  const origin=request.headers.get('origin');
  if(!origin) return true;
  try {
    const source=new URL(origin);
    const target=new URL(request.url);
    // Next dev may normalize request.url to localhost even when opened at 127.0.0.1.
    return source.host === (request.headers.get('host') || target.host) && source.protocol === target.protocol;
  } catch { return false; }
}

export async function readBody(request: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  if (!sameOrigin(request)) throw new ApiError('Хүсэлтийн эх сурвалж буруу.', 403);
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError('JSON шаардлагатай.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('Мэдээлэл оруулна уу.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new ApiError('Мэдээлэл хэт урт.', 413); }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body;
  } catch { throw new ApiError('JSON буруу байна.'); }
}

export function textField(body: Record<string, unknown>, key: string, max: number): string {
  const value = body[key];
  if (typeof value !== 'string' || value.length > max) throw new ApiError(`${key}: мэдээлэл буруу байна.`);
  return value.trim();
}

export async function limitRequests(scope: string, identity: string, max: number, seconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / seconds);
  const key = createHash('sha256').update(`${scope}:${identity}:${window}`).digest('hex');
  const db = await getDb();
  const row = await db.prepare(
    'INSERT INTO request_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count'
  ).bind(key, now + seconds).first<{count: number}>();
  // Bounded retention, also removes expired buckets from previous windows.
  await db.prepare('DELETE FROM request_limits WHERE key IN (SELECT key FROM request_limits WHERE expires_at < ? LIMIT 100)').bind(now).run();
  if (!row || row.count > max) throw new ApiError('Түр хүлээгээд дахин оролдоно уу.', 429);
}

export function apiError(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  console.error('Community API error', error);
  return Response.json({ error: 'Үйлчилгээ түр боломжгүй байна. Дахин оролдоно уу.' }, { status: 503 });
}

export function privateJson(data: unknown) {
  return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
}
