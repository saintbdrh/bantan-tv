export type Movie = {
  id: string;
  title: string;
  description: string;
  /** Raw type/category from the sheet (Кино, Цуврал, Шоу ...) */
  category: string;
  /** Genre slugs (see lib/genres.ts), main genre first */
  genres: string[];
  poster: string;
  backdrop: string;
  video?: string;
  director?: string;
  cast?: string[];
  /** Drive preview URL or direct video file, preferred */
  trailerUrl?: string;
  /** Own-hosted trailer file (mp4) built from MEDIA_BASE_URL; tried first, falls back to trailerUrl */
  trailerVideoUrl?: string;
  /** YouTube video id fallback when no Drive trailer */
  youtubeId?: string;
  airTimes?: { day: string; start: string; end: string }[];
};
