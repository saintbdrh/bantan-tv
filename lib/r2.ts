import { normalizeTitle } from '@/lib/epg';

// Trailers stored in Cloudflare R2 (bucket bantan-data, prefix bantan/) and
// listed by the bantan-tv-video-api Worker at /api/videos. Override the Worker
// address with VIDEO_API_URL in Vercel if it ever moves (e.g. to a custom domain).
const VIDEO_API_URL = (
  process.env.VIDEO_API_URL || 'https://bantan-tv-video-api.duuganbadrakh69.workers.dev'
).replace(/\/+$/, '');

type R2Video = { title: string; key: string; url: string };

const EXT = /\.(mp4|mov|webm)$/i;
const baseName = (key: string) => key.split('/').pop()!.replace(EXT, '');

// Same matching rules as the Worker: "COBWEB TRL DUB.mp4" -> "cobweb".
const MARK = /\b(trl|trailer|teaser|tvspot|tv spot)\b.*$/;
const TAIL = /\s+(dub|dubbed|dubbing|final|mn)$/;
const cleanKey = (key: string) =>
  normalizeTitle(baseName(key)).replace(MARK, '').trim().replace(TAIL, '').trim();
const isDub = (key: string) => /\bdub(bed|bing)?\b/.test(normalizeTitle(baseName(key)));

function candidates(title: string): string[] {
  const out = new Set([normalizeTitle(title)]);
  const paren = title.match(/\(([^)]+)\)/);
  if (paren) {
    out.add(normalizeTitle(paren[1]));
    out.add(normalizeTitle(title.replace(/\([^)]*\)/g, '')));
  }
  return Array.from(out).filter(Boolean);
}

/** title -> public R2 trailer URL. Empty map if the Worker is unreachable. */
export async function fetchR2TrailerIndex(): Promise<(title: string) => string | undefined> {
  let videos: R2Video[] = [];
  try {
    const res = await fetch(`${VIDEO_API_URL}/api/videos`, {
      next: { revalidate: 300 },
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      videos = Array.isArray(data?.videos) ? data.videos : [];
    }
  } catch {
    // fall through: no R2 trailers, site uses Drive/YouTube as before
  }

  const usable = videos.filter((v) => v?.key && v?.url && EXT.test(v.key));
  return (title: string) => {
    const cands = candidates(title);
    const hits = usable.filter((v) => cands.includes(cleanKey(v.key)));
    if (!hits.length) return undefined;
    return (hits.find((v) => isDub(v.key)) || hits[0]).url; // prefer the dubbed version
  };
}
