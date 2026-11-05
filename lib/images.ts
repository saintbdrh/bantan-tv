// next/image throws for hosts that are not listed in next.config.mjs.
// Keep this list in sync with images.remotePatterns there. Anything else
// is rendered as-is (unoptimized) instead of crashing the page.
const OPTIMIZABLE_HOSTS = new Set([
  'drive.google.com',
  'drive.usercontent.google.com',
  'lh3.googleusercontent.com',
  'images.unsplash.com',
  // R2 bucket bantan-data (movies/<title>/ posters): r2.dev address, planned custom domain
  'pub-5686e553eadb4f46b85ab1672a0c865a.r2.dev',
  'media.bantan.tv',
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
