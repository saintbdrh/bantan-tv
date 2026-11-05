// Worker entry point (wrangler.jsonc "main"). It wraps the worker that
// `opennextjs-cloudflare build` generates and adds edge caching and a safe
// fallback for optimized images (/_next/image).
//
// OpenNext serves /_next/image through the Cloudflare Images binding but does
// not cache the result, so without this every page view would download each
// poster from Google Drive and resize it again. Here every optimized variant is
// kept in Cloudflare's cache for a day (same as minimumCacheTTL on Vercel).
// The Cache API only works on a custom domain (e.g. bantan.tv); on
// *.workers.dev images are still optimized, just not cached.
// Response header x-image-cache: HIT | MISS | FALLBACK shows what happened.

// @ts-expect-error `.open-next/worker.js` is generated at build time
import { default as handler } from './.open-next/worker.js';

const IMAGE_PATH = '/_next/image';
const IMAGE_TTL_SECONDS = 24 * 60 * 60;
const BROWSER_STALE_SECONDS = 7 * 24 * 60 * 60;
// Where the fallback may send browsers when optimization fails: the hosts the
// posters actually live on (keep in sync with remotePatterns in next.config.mjs,
// minus hosts anyone can upload to).
const FALLBACK_HOSTS = new Set([
  'drive.google.com',
  'drive.usercontent.google.com',
  'lh3.googleusercontent.com',
  'images.unsplash.com',
  'pub-5686e553eadb4f46b85ab1672a0c865a.r2.dev', // R2 bucket bantan-data
  'media.bantan.tv',
]);
// The adapter's 400 answers that mean "the source misbehaved" (e.g. Drive sent
// an HTML throttling page instead of a picture), as opposed to a bad request.
const UPSTREAM_400_PREFIX = '"url" parameter is valid but';

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === IMAGE_PATH) {
      return cachedImage(request, url, env, ctx);
    }
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;

async function cachedImage(
  request: Request,
  url: URL,
  env: CloudflareEnv,
  ctx: ExecutionContext
): Promise<Response> {
  const cacheKey = imageCacheKey(request, url);
  // Workers' caches.default (the DOM typings in this project don't know it).
  const cache = (caches as unknown as { default: Cache }).default;

  try {
    const hit = await cache.match(cacheKey);
    if (hit) return withHeaders(hit, 'HIT');
  } catch {
    // Cache unavailable: fall through to a fresh optimization.
  }

  let response: Response;
  try {
    response = await handler.fetch(request, env, ctx);
  } catch (err) {
    console.error('Image optimization failed', url.searchParams.get('url'), err);
    response = new Response('Image optimization failed', { status: 500 });
  }

  if (response.status !== 200 || !response.body) {
    // Drive refused, throttled or timed out, Images quota used up, etc.: send
    // the browser to the original picture (as before optimization) instead of
    // showing a broken image. A 400 for a malformed request gets no fallback.
    let upstreamFailed = response.status !== 400;
    if (response.status === 400) {
      const text = await response.text();
      upstreamFailed = text.startsWith(UPSTREAM_400_PREFIX);
      response = new Response(text, { status: 400, headers: response.headers });
    }
    const fallback = upstreamFailed ? originalImageRedirect(url) : null;
    return fallback ?? response;
  }

  const headers = new Headers(response.headers);
  if (!headers.has('Cache-Control')) {
    headers.set(
      'Cache-Control',
      `public, max-age=${IMAGE_TTL_SECONDS}, stale-while-revalidate=${BROWSER_STALE_SECONDS}`
    );
  }
  // The format is already part of the cache key; Cloudflare's cache does not vary on Accept.
  const cacheHeaders = new Headers(headers);
  cacheHeaders.delete('Vary');

  const [forCache, forClient] = response.body.tee();
  ctx.waitUntil(
    cache
      .put(cacheKey, new Response(forCache, { status: 200, headers: cacheHeaders }))
      .catch((err: unknown) => console.warn('Image cache write failed', err))
  );
  headers.set('x-image-cache', 'MISS');
  return new Response(forClient, { status: 200, headers });
}

/**
 * Only the parameters the optimizer uses go into the key, so extra query
 * strings cannot be used to bypass the cache. The format is the most specific
 * one the browser accepts; that stays correct even if AVIF is later added to
 * images.formats in next.config.mjs.
 */
function imageCacheKey(request: Request, url: URL): Request {
  const accept = request.headers.get('Accept') || '';
  const format = accept.includes('image/avif') ? 'avif' : accept.includes('image/webp') ? 'webp' : 'orig';
  const key = new URL(IMAGE_PATH, url.origin);
  key.searchParams.set('url', url.searchParams.get('url') ?? '');
  key.searchParams.set('w', url.searchParams.get('w') ?? '');
  key.searchParams.set('q', url.searchParams.get('q') ?? '');
  key.searchParams.set('fmt', format);
  return new Request(key.toString(), { method: 'GET' });
}

/**
 * 302 to the unoptimized picture. The decision is made on the *parsed* URL, so
 * tricks like "/\evil.example" (which a URL parser reads as another host) can't
 * turn this into an open redirect: only this site or the poster hosts qualify.
 */
function originalImageRedirect(url: URL): Response | null {
  const src = url.searchParams.get('url');
  if (!src) return null;
  let target: URL;
  try {
    target = new URL(src, url.origin);
  } catch {
    return null;
  }
  const sameSite = target.origin === url.origin;
  const posterHost = target.protocol === 'https:' && FALLBACK_HOSTS.has(target.hostname);
  if (!sameSite && !posterHost) return null;
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      // Cloudflare's asset router only lets image/* or text/plain answers
      // through /_next/image for non-<img> requests (open-proxy protection).
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'x-image-cache': 'FALLBACK',
    },
  });
}

function withHeaders(response: Response, cacheStatus: string): Response {
  const copy = new Response(response.body, response);
  copy.headers.set('Vary', 'Accept');
  copy.headers.set('x-image-cache', cacheStatus);
  return copy;
}

// Durable Object used by the ISR revalidation queue (open-next.config.ts).
// @ts-expect-error `.open-next/worker.js` is generated at build time
export { DOQueueHandler } from './.open-next/worker.js';
