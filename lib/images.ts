// next/image throws for hosts that are not listed in next.config.mjs.
// Keep this list in sync with images.remotePatterns there. Anything else
// is rendered as-is (unoptimized) instead of crashing the page.
const OPTIMIZABLE_HOSTS = new Set([
  'drive.google.com',
  'drive.usercontent.google.com',
  'lh3.googleusercontent.com',
  'images.unsplash.com',
]);

export function canOptimize(src?: string | null): boolean {
  if (!src) return false;
  if (src.startsWith('/')) return true;
  try {
    const { hostname } = new URL(src);
    return OPTIMIZABLE_HOSTS.has(hostname) || hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}
