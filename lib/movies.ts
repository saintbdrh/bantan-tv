import { Movie } from '@/types';
import { parseGenres } from '@/lib/genres';
import { GENRE_OVERRIDES } from '@/lib/genre-overrides';
import { fetchR2TrailerIndex } from '@/lib/r2';
import { catalogDescription, catalogGenresFor, getCatalogEntry } from '@/lib/catalog';
import {
  fetchEpgData,
  fetchAllMedia,
  getAirTimesForTitle,
  normalizeTitle,
  isEmbedUrl,
  DAYS,
  EpgItem,
} from '@/lib/epg';

function slugify(title: string): string {
  return normalizeTitle(title).replace(/\s+/g, '-');
}

// Optional: host your own trailer files (Cloudflare R2, Vercel Blob, ...) at
//   <MEDIA_BASE_URL>/trailers/<movie-id>.mp4
// where <movie-id> is the slug in the /movie/<id> URL. Titles without a file
// simply fall back to the Drive/YouTube trailer.
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || '').replace(/\/+$/, '');

export async function getMovies(): Promise<Movie[]> {
  const [epgData, media, r2Trailer] = await Promise.all([
    fetchEpgData(),
    fetchAllMedia(),
    fetchR2TrailerIndex(),
  ]);

  const byTitle = new Map<string, EpgItem>();
  DAYS.forEach((day) => {
    (epgData[day] ?? []).forEach((item) => {
      const key = normalizeTitle(item.title);
      if (!byTitle.has(key)) {
        byTitle.set(key, item);
      }
    });
  });

  return media.map((entry): Movie => {
    const match = byTitle.get(normalizeTitle(entry.title));
    const airTimes = getAirTimesForTitle(epgData, entry.title);
    const poster = entry.poster || match?.image || '';
    // Prefer original Drive trailer; fall back to sheet trailer URL
    const driveTrailer = entry.trailer || undefined;
    const sheetTrailer = match?.trailerUrl;
    const trailerUrl = driveTrailer || sheetTrailer;
    const youtubeId = match?.youtubeId;

    const id = slugify(entry.title);
    const catalog = getCatalogEntry(entry.title);
    const fromOverride = GENRE_OVERRIDES[id];
    const fromCatalog = catalogGenresFor(entry.title);
    const fromSheet = parseGenres(match?.category);
    let genres =
      (fromOverride && fromOverride.length ? fromOverride : null) ??
      (fromCatalog.length ? fromCatalog : null) ??
      fromSheet ??
      [];
    // "Экшн" removed from site — treat as adventure
    genres = genres.map((g) => (g === 'action' ? 'adventure' : g));
    genres = genres.filter((g, i, arr) => arr.indexOf(g) === i);

    return {
      id,
      title: entry.title,
      description:
        catalogDescription(entry.title) ||
        match?.description ||
        'Тун удахгүй дэлгэрэнгүй мэдээлэл нэмэгдэнэ.',
      category: match?.category || catalog?.genres?.split(',')[0]?.trim() || 'Кино',
      genres,
      poster,
      backdrop: entry.backdrop || match?.backdropUrl || match?.image || poster,
      trailerUrl,
      // R2 trailer (via the Worker) first; MEDIA_BASE_URL only as a fallback.
      trailerVideoUrl:
        r2Trailer(entry.title) ??
        (MEDIA_BASE_URL
          ? `${MEDIA_BASE_URL}/trailers/${encodeURIComponent(slugify(entry.title))}.mp4`
          : undefined),
      youtubeId,
      // Raw video file only (not Drive /preview embeds)
      video: trailerUrl && !isEmbedUrl(trailerUrl) ? trailerUrl : undefined,
      airTimes: airTimes.length ? airTimes : undefined,
    };
  });
}

export async function getMovieById(id: string): Promise<Movie | undefined> {
  const all = await getMovies();
  return all.find((movie) => movie.id === id);
}

export async function getCategories(): Promise<string[]> {
  const all = await getMovies();
  const seen = new Set<string>();
  const ordered: string[] = [];
  all.forEach((movie) => {
    if (!seen.has(movie.category)) {
      seen.add(movie.category);
      ordered.push(movie.category);
    }
  });
  return ordered;
}

/** Movies that have a playable trailer (Drive embed, direct file, or YouTube) */
export function moviesWithTrailers(movies: Movie[]): Movie[] {
  return movies.filter((m) => m.trailerUrl || m.youtubeId);
}

export function getTrailerEmbedSrc(movie: Movie): string | null {
  if (movie.trailerUrl) {
    // Drive preview is already an embeddable URL
    if (isEmbedUrl(movie.trailerUrl)) return movie.trailerUrl;
    // Direct mp4 — use as video src, not iframe
    return null;
  }
  if (movie.youtubeId) {
    return `https://www.youtube.com/embed/${movie.youtubeId}?rel=0&modestbranding=1&playsinline=1`;
  }
  return null;
}


/** True when Drive/API provided a real poster URL (not empty). */
export function hasRealPoster(movie: Movie): boolean {
  const p = (movie.poster || '').trim();
  if (!p) return false;
  // Ignore known placeholder stock images
  if (p.includes('images.unsplash.com')) return false;
  return true;
}

export function withPosters(movies: Movie[]): Movie[] {
  return movies.filter(hasRealPoster);
}
