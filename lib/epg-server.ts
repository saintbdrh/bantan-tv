// Server-side loaders for the Google Sheet data (weekly schedule via the Apps
// Script, movie list, movie info sheet). Kept apart from lib/epg.ts, which
// client components also import.
import { cachedJson, cachedText } from '@/lib/cached-json';
import { MovieInfo, MOVIE_INFO_CSV_URL, parseMovieInfo } from '@/lib/movie-info';
import { mergeLibrary, MOVIE_LIBRARY_CSV_URL } from '@/lib/movie-library';
import { extractAirings, WeekSchedule } from '@/lib/schedule';
import {
  DayKey,
  EpgItem,
  EPG_ENDPOINT,
  EPG_REVALIDATE_SECONDS,
  FALLBACK_EPG,
  MediaEntry,
  normalizeEpgPayload,
} from '@/lib/epg';

const ACCEPT = { Accept: 'application/json, text/plain, */*' };

function fetchEpgPayload(): Promise<unknown> {
  return cachedJson<unknown>(EPG_ENDPOINT, EPG_REVALIDATE_SECONDS, ACCEPT);
}

// Server-side fetch (used by lib/movies.ts and any server component that
// needs the schedule). Always returns a full week, falling back to the
// bundled placeholder schedule if the sheet is unreachable.
export async function fetchEpgData(): Promise<Record<DayKey, EpgItem[]>> {
  try {
    return normalizeEpgPayload(await fetchEpgPayload());
  } catch (error) {
    console.warn('Google EPG endpoint unavailable; using fallback schedule.', error);
    return FALLBACK_EPG;
  }
}

// The deployment serves poster/backdrop/trailer for every movie folder in
// Drive at ?media=all (see Code.gs -> mediaResponse). EPG_ENDPOINT already
// carries ?with_media=1, so swap the query rather than appending to it.
function getMediaListUrl(): string {
  return `${EPG_ENDPOINT.split('?')[0]}?media=all`;
}

// This is the real movie catalog: whatever folders actually exist in your
// Drive "Bantan web" folder, not a hand-written list. Returns [] (rather
// than made-up placeholder movies) if the sheet/script is unreachable.
export async function fetchAllMedia(): Promise<MediaEntry[]> {
  try {
    const payload = await cachedJson<unknown>(getMediaListUrl(), EPG_REVALIDATE_SECONDS, ACCEPT);
    return Array.isArray(payload)
      ? payload.filter(
          (item): item is MediaEntry =>
            !!item && typeof item.title === 'string' && item.title.trim().length > 0
        )
      : [];
  } catch (error) {
    console.warn('Drive media list unavailable.', error);
    return [];
  }
}

// This week's programmes with exact start times, for "when does this movie
// air" (same Apps Script response as above).
export async function fetchSchedule(): Promise<WeekSchedule> {
  try {
    return extractAirings(await fetchEpgPayload());
  } catch (error) {
    console.warn('Google EPG endpoint unavailable; no air times.', error);
    return { airings: [] };
  }
}

// After a failure (e.g. the sheet is not shared yet) wait before trying again,
// so pages are not slowed down by a request that keeps failing.
let movieInfoFailedAt = 0;

let libraryFailedAt = 0;
const BUILT_IN = mergeLibrary([]);

/**
 * The TV's film list («Movie list монгол»): the live CSV when MOVIE_LIBRARY_CSV_URL
 * is set and readable, laid over the copy that ships with the site.
 */
export async function fetchMovieLibrary(): Promise<MovieInfo[]> {
  if (!MOVIE_LIBRARY_CSV_URL || Date.now() - libraryFailedAt < EPG_REVALIDATE_SECONDS * 1000) return BUILT_IN;
  try {
    const rows = parseMovieInfo(await cachedText(MOVIE_LIBRARY_CSV_URL, EPG_REVALIDATE_SECONDS));
    if (!rows.length) throw new Error('no film rows (has the header row changed?)');
    return mergeLibrary(rows);
  } catch (error) {
    libraryFailedAt = Date.now();
    console.warn('Film list CSV unavailable; using the built-in copy.', error);
    return BUILT_IN;
  }
}

/** Rows of the movie info sheet; [] when it cannot be read. */
export async function fetchMovieInfo(): Promise<MovieInfo[]> {
  if (Date.now() - movieInfoFailedAt < EPG_REVALIDATE_SECONDS * 1000) return [];
  try {
    const rows = parseMovieInfo(await cachedText(MOVIE_INFO_CSV_URL, EPG_REVALIDATE_SECONDS));
    if (!rows.length) throw new Error('no movie rows (has the header row changed?)');
    return rows;
  } catch (error) {
    movieInfoFailedAt = Date.now();
    console.warn('Movie info sheet unavailable; using the built-in descriptions.', error);
    return [];
  }
}
