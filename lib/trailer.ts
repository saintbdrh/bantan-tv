import type { Movie } from '@/types';
import { isEmbedUrl } from '@/lib/epg';

/** Skip blank/logo intro at the start of every hero Drive trailer (seconds). */
export const TRAILER_SKIP_SECONDS = Number(process.env.NEXT_PUBLIC_DRIVE_TRAILER_SKIP_SECONDS ?? 4) || 4;

/** @deprecated use TRAILER_SKIP_SECONDS */
export const DRIVE_SKIP_SECONDS = TRAILER_SKIP_SECONDS;

export function driveFileId(url?: string | null): string | null {
  if (!url) return null;
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?#]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
    /drive\.google\.com\/uc\?.*[?&]id=([^&]+)/,
    /drive\.usercontent\.google\.com\/download\?[^#]*id=([^&]+)/,
    /[?&]id=([\w-]{25,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * Same-origin stream URL so <video> can seek (Range requests).
 * Direct drive.google.com URLs often ignore currentTime = 3.
 */
export function driveStreamUrl(url?: string | null): string | null {
  const id = driveFileId(url);
  return id ? `/api/drive-stream?id=${encodeURIComponent(id)}` : null;
}

/** @deprecated prefer driveStreamUrl for <video> */
export function driveDirectUrl(url?: string | null): string | null {
  return driveStreamUrl(url);
}

export type VideoKind = 'own' | 'sheet' | 'drive';
export type VideoSource = { src: string; startAt: number; kind: VideoKind };

function isDirectFile(url?: string | null): boolean {
  return !!url && !isEmbedUrl(url) && !/youtube\.com|youtu\.be|drive\.google\.com|drive\.usercontent/.test(url);
}

function isDriveUrl(url?: string | null): boolean {
  return !!url && (/drive\.google\.com|drive\.usercontent/.test(url) || !!driveFileId(url));
}

/**
 * Prefer a real <video> source so we can skip the first N seconds.
 * Drive files go through /api/drive-stream (seekable).
 */
export function pickVideo(movie: Movie, failed: Record<string, boolean>): VideoSource | null {
  const startAt = TRAILER_SKIP_SECONDS;

  if (movie.trailerVideoUrl && !failed[`${movie.id}:own`]) {
    return { src: movie.trailerVideoUrl, startAt, kind: 'own' };
  }

  // Sheet / API may store a Drive link as trailerUrl — treat as Drive
  if (isDriveUrl(movie.trailerUrl) && !failed[`${movie.id}:drive`]) {
    const src = driveStreamUrl(movie.trailerUrl);
    if (src) return { src, startAt, kind: 'drive' };
  }

  if (isDirectFile(movie.trailerUrl) && !failed[`${movie.id}:sheet`]) {
    return { src: movie.trailerUrl as string, startAt, kind: 'sheet' };
  }

  return null;
}
