import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * The D1 database (binding "DB" in wrangler.jsonc) that stores accounts and
 * ad bookings. Works in production, in `npm run preview`, and in `next dev`
 * (next.config.mjs calls initOpenNextCloudflareForDev, which provides a local
 * copy under .wrangler/). Run `npm run db:migrate:local` once before dev.
 */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) {
    throw new Error('D1 binding "DB" is missing — check d1_databases in wrangler.jsonc');
  }
  return env.DB;
}
