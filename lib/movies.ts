import { Movie } from '@/types';
import { parseGenres } from '@/lib/genres';
import { GENRE_OVERRIDES } from '@/lib/genre-overrides';
import { fetchR2Media, R2MovieFolder } from '@/lib/r2';
import { catalogDescription, catalogGenresFor, getCatalogEntry } from '@/lib/catalog';
import { fetchEpgData, fetchAllMedia, fetchMovieInfo, fetchMovieLibrary, fetchSchedule } from '@/lib/epg-server';
import { normalizeTitle, isEmbedUrl, DAYS, EpgItem, MediaEntry } from '@/lib/epg';
import { Airing, airingsFor, normalizeAgeRating } from '@/lib/schedule';
import { titleKey } from '@/lib/titles';
import { rowFinder } from '@/lib/movie-library';

// Placeholder texts the sheets use when a programme has no real description.
const GENERIC_DESCRIPTIONS = new Set(['BANTAN TV-н хөтөлбөр']);

function slugify(title: string): string {
  return normalizeTitle(title).replace(/\s+/g, '-');
}

// Optional: host your own trailer files (Cloudflare R2, Vercel Blob, ...) at
//   <MEDIA_BASE_URL>/trailers/<movie-id>.mp4
// where <movie-id> is the slug in the /movie/<id> URL. Titles without a file
// simply fall back to the Drive/YouTube trailer.
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || '').replace(/\/+$/, '');

/**
 * Drive folders plus movies that only have a folder in R2 (movies/<Movie title>/).
 * When both exist for a title, the R2 poster and backdrop are used. A movie
 * with only a wide image in R2 uses it as its poster too.
 */
export function mergeMedia(drive: MediaEntry[], r2Folders: R2MovieFolder[]): MediaEntry[] {
  const merged = drive.slice();
  const indexByKey = new Map(merged.map((entry, i) => [titleKey(entry.title), i]));
  r2Folders.forEach((folder) => {
    const key = titleKey(folder.title);
    const i = indexByKey.get(key);
    if (i === undefined) {
      indexByKey.set(key, merged.length);
      merged.push({
        title: folder.title,
        poster: folder.poster ?? folder.backdrop ?? null,
        backdrop: folder.backdrop ?? null,
        trailer: null,
      });
    } else {
      const entry = merged[i];
      merged[i] = { ...entry, poster: folder.poster ?? entry.poster, backdrop: folder.backdrop ?? entry.backdrop };
    }
  });
  return merged;
}

/** "ГЭМТ ХЭРГИЙН ХОТ: ЗУГТАХ ЗАМГҮЙ" -> "Гэмт хэргийн хот: Зугтах замгүй"; other text unchanged. */
function sentenceCase(text?: string): string | undefined {
  if (!text || /[a-zа-яөүё]/.test(text)) return text;
  return text
    .toLowerCase()
    .replace(/(^|[:.!?]\s+)([a-zа-яөүё])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
}

export async function getMovies(): Promise<Movie[]> {
  const [epgData, schedule, driveMedia, r2, sheetRows, libraryRows] = await Promise.all([
    fetchEpgData(),
    fetchSchedule(),
    fetchAllMedia(),
    fetchR2Media(),
    fetchMovieInfo(),
    fetchMovieLibrary(),
  ]);
  const media = mergeMedia(driveMedia, r2.folders);

  // The TV's film list («Movie list монгол») and the website's movie info sheet,
  // matched by title (small typos in folder names are tolerated).
  const libraryFor = rowFinder(libraryRows);
  const sheetFor = rowFinder(sheetRows);
  // Mongolian titles shared by two films (both COBWEBs are «Аалзны тор») can't
  // tell the schedule's programmes apart.
  const localTitleCount = new Map<string, number>();
  libraryRows.forEach((row) => {
    const key = row.localTitle ? titleKey(row.localTitle) : '';
    if (key) localTitleCount.set(key, (localTitleCount.get(key) ?? 0) + 1);
  });
  const uniqueLocalTitle = (title?: string) =>
    title && localTitleCount.get(titleKey(title)) === 1 ? title : undefined;

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
    const sheet = sheetFor(entry.title);
    const library = libraryFor(entry.title, sheet?.scheduleTitle);
    const airings = airingsFor(
      schedule,
      sheet?.scheduleTitle,
      entry.title,
      library?.title,
      ...(library?.aliases ?? []),
      uniqueLocalTitle(library?.localTitle)
    );
    const fromAiring = <K extends keyof Airing>(field: K): Airing[K] | undefined =>
      airings.find((airing) => airing[field])?.[field];
    const poster = entry.poster || match?.image || '';
    // Prefer original Drive trailer; fall back to sheet trailer URL
    const driveTrailer = entry.trailer || undefined;
    const sheetTrailer = match?.trailerUrl;
    const trailerUrl = driveTrailer || sheetTrailer;
    const youtubeId = match?.youtubeId;

    const id = slugify(entry.title);
    const catalog = getCatalogEntry(entry.title);
    // Genres: manual override, then the film list's «Ангилал», then the old
    // catalogue, then the schedule's category.
    const fromOverride = GENRE_OVERRIDES[id];
    const fromLists = parseGenres(library?.genres || sheet?.genres);
    const fromCatalog = catalogGenresFor(entry.title);
    const fromSchedule = parseGenres(match?.category);
    let genres =
      (fromOverride && fromOverride.length ? fromOverride : null) ??
      (fromLists.length ? fromLists : null) ??
      (fromCatalog.length ? fromCatalog : null) ??
      fromSchedule ??
      [];
    // "Экшн" removed from site — treat as adventure
    genres = genres.map((g) => (g === 'action' ? 'adventure' : g));
    genres = genres.filter((g, i, arr) => arr.indexOf(g) === i);

    const sheetDescription = match?.description && !GENERIC_DESCRIPTIONS.has(match.description) ? match.description : '';

    return {
      id,
      title: entry.title,
      // The schedule spells Mongolian titles as shown on air; the film list has some in capitals.
      localTitle: fromAiring('localTitle') || sheet?.localTitle || sentenceCase(library?.localTitle),
      // The channel's own synopsis (film list, then this week's schedule) before the drafts.
      description:
        library?.description ||
        fromAiring('description') ||
        sheet?.description ||
        catalogDescription(entry.title) ||
        sheetDescription,
      // The rating the channel broadcasts with (schedule) first.
      ageRating:
        fromAiring('ageRating') || library?.ageRating || sheet?.ageRating || normalizeAgeRating(catalog?.rating),
      imdb: library?.imdb ?? fromAiring('imdb') ?? sheet?.imdb,
      year: library?.year || sheet?.year || catalog?.year,
      category: match?.category || catalog?.genres?.split(',')[0]?.trim() || 'Кино',
      genres,
      poster,
      backdrop: entry.backdrop || match?.backdropUrl || match?.image || poster,
      trailerUrl,
      // R2 trailer first (web-size copy if there is one); MEDIA_BASE_URL only as a fallback.
      trailerVideoUrl:
        r2.trailerFor(entry.title) ??
        (MEDIA_BASE_URL
          ? `${MEDIA_BASE_URL}/trailers/${encodeURIComponent(slugify(entry.title))}.mp4`
          : undefined),
      youtubeId,
      // Raw video file only (not Drive /preview embeds)
      video: trailerUrl && !isEmbedUrl(trailerUrl) ? trailerUrl : undefined,
      airings: airings.length ? airings : undefined,
    };
  });
}

export async function getMovieById(id: string): Promise<Movie | undefined> {
  // Route params arrive URL-encoded, so Cyrillic slugs ("миний-нүд") must be decoded.
  let key = id;
  try {
    key = decodeURIComponent(id);
  } catch {
    /* malformed escape: use as-is */
  }
  const all = await getMovies();
  return all.find((movie) => movie.id === key);
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
  return movies.filter((m) => m.trailerVideoUrl || m.trailerUrl || m.youtubeId);
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
