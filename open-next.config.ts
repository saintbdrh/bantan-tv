import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

// Time-based ISR only (fetch(..., { next: { revalidate } })): R2 holds the
// cached pages/fetches, the Durable Object queue refreshes them in the
// background. No tag cache needed because the app never calls revalidateTag.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
});
