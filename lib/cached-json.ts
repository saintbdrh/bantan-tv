import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * JSON (or text) from slow sources (the Google Apps Script answers in 2–3
 * seconds) with a stale-while-revalidate cache, so visitors do not wait for it.
 * cachedValue() does the same for anything else that is slow or costs a
 * request each time, such as listing an R2 bucket.
 *
 * On Cloudflare the data is kept in memory per Worker instance and in R2
 * (shared by all instances). Once a copy is older than `maxAgeSeconds` it is
 * still served immediately and refreshed in the background (ctx.waitUntil).
 * Next.js's own fetch cache is not used there: its writes can be cut off when
 * the response finishes, which made every movie page wait for the Apps Script.
 *
 * In `next dev` / `next build` (Node.js) URLs fall back to Next's fetch cache
 * and cachedValue() simply runs its loader.
 * Server-only: do not import from client components.
 */

type Entry = { data: unknown; fetchedAt: number };
type Kind = 'json' | 'text';
type Bucket = {
  get(key: string): Promise<{ json(): Promise<unknown> } | null>;
  put(key: string, value: string, options?: unknown): Promise<unknown>;
};
type Waiter = { waitUntil(promise: Promise<unknown>): void };

const memory = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();
const R2_PREFIX = 'app-data/';

function inWorkersRuntime(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
}

// Plain fetch, bypassing Next's patched fetch (its data cache and its
// static/dynamic bookkeeping); this module does its own caching.
function rawFetch(url: string, init: RequestInit): Promise<Response> {
  const patched = globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch };
  return (patched._nextOriginalFetch ?? patched)(url, init);
}

export function cachedJson<T>(
  url: string,
  maxAgeSeconds: number,
  headers?: Record<string, string>
): Promise<T> {
  return cachedUrl<T>(url, maxAgeSeconds, 'json', headers);
}

/** Same, for text such as a CSV export. An HTML page (e.g. a sign-in page) counts as an error. */
export function cachedText(
  url: string,
  maxAgeSeconds: number,
  headers?: Record<string, string>
): Promise<string> {
  return cachedUrl<string>(url, maxAgeSeconds, 'text', headers);
}

/**
 * Any other slow value, kept under `name`. The value must survive
 * JSON.stringify. Outside the Workers runtime it is not cached.
 */
export function cachedValue<T>(name: string, maxAgeSeconds: number, load: () => Promise<T>): Promise<T> {
  if (!inWorkersRuntime()) return load();
  return staleWhileRevalidate<T>(`value:${name}`, maxAgeSeconds, load);
}

async function read(res: Response, url: string, kind: Kind): Promise<unknown> {
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  if (kind === 'json') return res.json();
  if (/text\/html/i.test(res.headers.get('content-type') ?? '')) {
    throw new Error(`${url} returned a web page, not data (is it shared?)`);
  }
  return res.text();
}

async function cachedUrl<T>(
  url: string,
  maxAgeSeconds: number,
  kind: Kind,
  headers?: Record<string, string>
): Promise<T> {
  if (!inWorkersRuntime()) {
    const res = await fetch(url, { headers, next: { revalidate: maxAgeSeconds } });
    return (await read(res, url, kind)) as T;
  }
  return staleWhileRevalidate<T>(url, maxAgeSeconds, async () =>
    (await read(await rawFetch(url, { headers }), url, kind)) as T
  );
}

// `id` is the URL for fetched data (so copies stored by earlier versions stay
// valid) or "value:<name>" for cachedValue().
async function staleWhileRevalidate<T>(
  id: string,
  maxAgeSeconds: number,
  load: () => Promise<T>
): Promise<T> {
  const { env, ctx } = getCloudflareContext();
  const bucket = (env as unknown as { NEXT_INC_CACHE_R2_BUCKET?: Bucket }).NEXT_INC_CACHE_R2_BUCKET;
  const key = R2_PREFIX + encodeURIComponent(id);

  let entry = memory.get(id);
  if (!entry && bucket) {
    try {
      const stored = await bucket.get(key);
      if (stored) {
        entry = (await stored.json()) as Entry;
        memory.set(id, entry);
      }
    } catch {
      // Unreadable copy: treat as a miss.
    }
  }

  if (entry) {
    if (Date.now() - entry.fetchedAt > maxAgeSeconds * 1000) {
      ctx.waitUntil(
        refresh(id, load, bucket, key, ctx).catch((err: unknown) =>
          console.warn('Background refresh failed', id, err)
        )
      );
    }
    return entry.data as T;
  }

  return (await refresh(id, load, bucket, key, ctx)) as T;
}

function refresh(
  id: string,
  load: () => Promise<unknown>,
  bucket: Bucket | undefined,
  key: string,
  ctx: Waiter
): Promise<unknown> {
  const running = inFlight.get(id);
  if (running) return running;

  const job = (async () => {
    const data = await load();
    const entry: Entry = { data, fetchedAt: Date.now() };
    memory.set(id, entry);
    if (bucket) {
      // waitUntil: the write has to outlive the response.
      ctx.waitUntil(
        bucket
          .put(key, JSON.stringify(entry), { httpMetadata: { contentType: 'application/json' } })
          .catch((err: unknown) => console.warn('Could not store', id, err))
      );
    }
    return data;
  })().finally(() => inFlight.delete(id));

  inFlight.set(id, job);
  return job;
}
