import { getCloudflareContext } from '@opennextjs/cloudflare';
import { normalizeTitle } from '@/lib/epg';
import { cachedJson, cachedValue } from '@/lib/cached-json';
import { titleKey } from '@/lib/titles';

// Trailers and images in the Cloudflare R2 bucket "bantan-data":
//   bantan/<name> TRL.mp4       original trailer uploads (full quality)
//   web/<name> TRL.mp4          the same trailers made web-size (720p); used first
//   movies/<Movie title>/...    everything for one movie, laid out like a Drive
//                               folder: *POSTER*.jpg, *WIDE*.jpg, a trailer .mp4
// The site lists the bucket through the MEDIA_BUCKET binding (wrangler.jsonc).
// Where that binding is unavailable (during the build), it falls back to the
// trailer list of the bantan-tv-video-api Worker at /api/videos, which only
// covers bantan/. Override the Worker address with VIDEO_API_URL.
const VIDEO_API_URL = (
  process.env.VIDEO_API_URL || 'https://bantan-tv-video-api.duuganbadrakh69.workers.dev'
).replace(/\/+$/, '');

// Public address of the bucket. *.r2.dev links are rate-limited and not cached
// by Cloudflare; once a custom domain is connected to the bucket (e.g.
// https://media.bantan.tv), set R2_PUBLIC_URL to it.
const R2_DEV_URL = 'https://pub-5686e553eadb4f46b85ab1672a0c865a.r2.dev';
const r2PublicBase = () => (process.env.R2_PUBLIC_URL || R2_DEV_URL).replace(/\/+$/, '');

export const MOVIES_PREFIX = 'movies/';
const VIDEO = /\.(mp4|mov|webm)$/i;
const IMAGE = /\.(jpe?g|png|webp)$/i;

/** Public link for an object key such as "web/SLEEP TRL DUB.mp4". */
export function r2PublicUrl(key: string): string {
  return `${r2PublicBase()}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

// The video-api Worker returns *.r2.dev links; serve them from R2_PUBLIC_URL when set.
function publicTrailerUrl(url: string): string {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
  if (!base) return url;
  try {
    const u = new URL(url);
    return u.hostname.endsWith('.r2.dev') ? `${base}${u.pathname}${u.search}` : url;
  } catch {
    return url;
  }
}

const fileName = (key: string) => key.split('/').pop() ?? key;
const baseName = (key: string) => fileName(key).replace(VIDEO, '');

// Same matching rules as the video-api Worker: "COBWEB TRL DUB.mp4" -> "cobweb".
const MARK = /\b(trl|trailer|teaser|tvspot|tv spot)\b.*$/;
const TAIL = /\s+(dub|dubbed|dubbing|final|mn)$/;
const cleanKey = (key: string) =>
  normalizeTitle(baseName(key)).replace(MARK, '').trim().replace(TAIL, '').trim();
const isDub = (key: string) => /\bdub(bed|bing)?\b/.test(normalizeTitle(baseName(key)));
// Web-size copies before the original uploads.
const rank = (key: string) => (key.startsWith('web/') ? 0 : 1);

function candidates(title: string): string[] {
  const out = new Set([normalizeTitle(title)]);
  const paren = title.match(/\(([^)]+)\)/);
  if (paren) {
    out.add(normalizeTitle(paren[1]));
    out.add(normalizeTitle(title.replace(/\([^)]*\)/g, '')));
  }
  return Array.from(out).filter(Boolean);
}

type ListedBucket = {
  list(options?: {
    cursor?: string;
    limit?: number;
  }): Promise<{ objects: { key: string }[]; truncated: boolean; cursor?: string }>;
};

function mediaBucket(): ListedBucket | undefined {
  try {
    return (getCloudflareContext().env as unknown as { MEDIA_BUCKET?: ListedBucket }).MEDIA_BUCKET;
  } catch {
    return undefined; // not running on Workers (e.g. during the build)
  }
}

/** Every key in the media bucket, or null if it cannot be listed (or is empty, as in local dev). */
async function listMediaKeys(): Promise<string[] | null> {
  const bucket = mediaBucket();
  if (!bucket) return null;
  try {
    const keys = await cachedValue('media-bucket-keys', 300, async () => {
      const all: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await bucket.list({ cursor, limit: 1000 });
        page.objects.forEach((object) => all.push(object.key));
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return all;
    });
    return keys.length ? keys : null;
  } catch (error) {
    console.warn('Media bucket could not be listed; using the video-api Worker.', error);
    return null;
  }
}

type Trailer = { key: string; url: string };

async function videoApiTrailers(): Promise<Trailer[]> {
  try {
    const data = await cachedJson<{ videos?: unknown }>(`${VIDEO_API_URL}/api/videos`, 300, {
      Accept: 'application/json',
    });
    const videos = Array.isArray(data?.videos) ? (data.videos as { key?: string; url?: string }[]) : [];
    return videos
      .filter((v): v is Trailer => !!v?.key && !!v?.url && VIDEO.test(v.key))
      .map((v) => ({ key: v.key, url: publicTrailerUrl(v.url) }));
  } catch {
    return []; // no R2 trailers: the site uses Drive/YouTube as before
  }
}

export type R2MovieFolder = { title: string; poster?: string; backdrop?: string; trailer?: string };

const BACKDROP_WORD = /wide|banner|backdrop|(^|[^a-z])bg([^a-z]|$)/i;

// movies/<Movie title>/<any subfolders>/<files>, grouped by movie title. Picks
// files the way the Apps Script does in Drive: the poster is an image with
// "poster" in its name (else the first image that is not a backdrop), the
// backdrop one with "wide"/"banner"/"backdrop"/"bg", the trailer a video (a
// dubbed one first).
export function movieFolders(keys: string[]): R2MovieFolder[] {
  const groups = new Map<string, string[]>();
  keys.forEach((key) => {
    if (!key.startsWith(MOVIES_PREFIX)) return;
    const rest = key.slice(MOVIES_PREFIX.length);
    const slash = rest.indexOf('/');
    const title = slash > 0 ? rest.slice(0, slash).trim() : '';
    if (!title) return; // files directly in movies/ belong to no movie
    const files = groups.get(title) ?? [];
    files.push(key);
    groups.set(title, files);
  });

  const byName = (a: string, b: string) => fileName(a).localeCompare(fileName(b));
  return Array.from(groups, ([title, files]) => {
    const images = files.filter((key) => IMAGE.test(key)).sort(byName);
    const videos = files.filter((key) => VIDEO.test(key)).sort(byName);
    const poster =
      images.find((key) => /poster/i.test(fileName(key))) ??
      images.find((key) => !BACKDROP_WORD.test(fileName(key)));
    const backdrop = images.find((key) => key !== poster && BACKDROP_WORD.test(fileName(key)));
    const trailer = videos.find(isDub) ?? videos[0];
    return {
      title,
      poster: poster ? r2PublicUrl(poster) : undefined,
      backdrop: backdrop ? r2PublicUrl(backdrop) : undefined,
      trailer: trailer ? r2PublicUrl(trailer) : undefined,
    };
  });
}

export type R2Media = {
  /** The movie catalog and artwork in movies/<Movie title>/. */
  folders: R2MovieFolder[];
  /** Best R2 trailer for a title: its movie folder, then web-size copies, then originals. */
  trailerFor(title: string): string | undefined;
};

export function buildR2Media(keys: string[] | null, fallbackTrailers: Trailer[] = []): R2Media {
  const loose: Trailer[] = keys
    ? keys
        .filter((key) => VIDEO.test(key) && !key.startsWith(MOVIES_PREFIX))
        .map((key) => ({ key, url: r2PublicUrl(key) }))
    : fallbackTrailers;
  const folders = keys ? movieFolders(keys) : [];
  const folderByKey = new Map(folders.map((folder) => [titleKey(folder.title), folder]));

  return {
    folders,
    trailerFor(title: string) {
      const own = folderByKey.get(titleKey(title))?.trailer;
      if (own) return own;
      const cands = candidates(title);
      const hits = loose.filter((video) => cands.includes(cleanKey(video.key)));
      if (!hits.length) return undefined;
      hits.sort((a, b) => rank(a.key) - rank(b.key) || Number(isDub(b.key)) - Number(isDub(a.key)));
      return hits[0].url;
    },
  };
}

/** Everything the site uses from R2. Never throws; empty when R2 is unreachable. */
export async function fetchR2Media(): Promise<R2Media> {
  const keys = await listMediaKeys();
  return buildR2Media(keys, keys ? [] : await videoApiTrailers());
}
