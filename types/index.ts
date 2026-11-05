import type { Airing } from '@/lib/schedule';

export type Movie = {
  id: string;
  title: string;
  /** Mongolian title (movie info sheet, or the weekly schedule) */
  localTitle?: string;
  description: string;
  /** As the channel shows it, e.g. "+12" */
  ageRating?: string;
  /** IMDb score, e.g. 7.4 */
  imdb?: number;
  year?: number;
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
  /** This week's broadcasts on BANTAN TV, in order */
  airings?: Airing[];
};
