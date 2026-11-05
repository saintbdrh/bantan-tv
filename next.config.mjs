import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `next dev` (Next 16) refuses its live-reload connection to pages opened via a
  // network address such as http://192.168.x.x:3000, and the page then never
  // becomes interactive (no trailers, no posters, dead buttons). Allow office/home
  // LAN addresses for testing on phones and other computers. Dev only.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*'],
  // Removed pages: send old links and bookmarks somewhere useful instead of a
  // "not found" page. Temporary (307), so the pages can come back later.
  async redirects() {
    return [
      { source: '/live', destination: '/schedule', permanent: false },
      { source: '/sanal', destination: '/', permanent: false },
    ];
  },
  images: {
    // On Cloudflare, next/image is served by the Images binding (see
    // wrangler.jsonc) and cached at the edge by custom-worker.ts.
    // WebP only: Cloudflare cannot encode AVIF wider than 1,200px (hero
    // backdrops are wider), and each extra format or width is another
    // "unique transformation" counted against the monthly allowance.
    formats: ['image/webp'],
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [256, 384],
    qualities: [75, 80],
    // Drive posters rarely change; keep optimized copies for a day
    // (applies to `next start`; the Worker uses the same one-day TTL).
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'drive.usercontent.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      // Posters and backdrops in the R2 bucket bantan-data (see lib/r2.ts):
      // its r2.dev address and the planned custom domain.
      { protocol: 'https', hostname: 'pub-5686e553eadb4f46b85ab1672a0c865a.r2.dev' },
      { protocol: 'https', hostname: 'media.bantan.tv' },
    ],
  },
};

export default nextConfig;

// Gives `next dev` local copies of the Cloudflare bindings (D1, R2, Images).
initOpenNextCloudflareForDev();
