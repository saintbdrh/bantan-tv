import type { Movie } from '@/types';

export type Genre = {
  slug: string;
  /** Label shown on the site (Mongolian) */
  mn: string;
  en: string;
  /** Spellings that may appear in the Google Sheet (English or Mongolian), lowercase */
  aliases: string[];
};

// Classic genre list, in the order they appear on the site.
export const GENRES: Genre[] = [
  { slug: 'adventure', mn: 'Адал явдал', en: 'Adventure', aliases: ['adventure', 'action', 'экшн', 'адал явдал', 'адал явдалт', 'адал явдалтай', 'үйл явдал', 'тулаант', 'тулааны'] },
  { slug: 'comedy', mn: 'Инээдмийн', en: 'Comedy', aliases: ['comedy', 'инээдмийн', 'инээдэм', 'комеди'] },
  { slug: 'drama', mn: 'Драма', en: 'Drama', aliases: ['drama', 'драма', 'жүжиг'] },
  { slug: 'romance', mn: 'Романтик', en: 'Romance', aliases: ['romance', 'romantic', 'романтик', 'хайр дурлал', 'дурлалын', 'мелодрам'] },
  { slug: 'horror', mn: 'Аймшгийн', en: 'Horror', aliases: ['horror', 'аймшгийн', 'аймшиг', 'хорор'] },
  { slug: 'thriller', mn: 'Триллер', en: 'Thriller', aliases: ['thriller', 'триллер', 'сэтгэл түгшээх'] },
  { slug: 'mystery', mn: 'Нууцлаг', en: 'Mystery', aliases: ['mystery', 'detective', 'нууцлаг', 'детектив'] },
  { slug: 'crime', mn: 'Гэмт хэргийн', en: 'Crime', aliases: ['crime', 'гэмт хэргийн', 'гэмт хэрэг', 'криминал'] },
  { slug: 'sci-fi', mn: 'Шинжлэх ухааны зөгнөлт', en: 'Sci-Fi', aliases: ['sci-fi', 'sci fi', 'scifi', 'science fiction', 'шинжлэх ухааны зөгнөлт', 'шинжлэх ухааны уран зөгнөлт', 'сай фай'] },
  { slug: 'fantasy', mn: 'Уран зөгнөлт', en: 'Fantasy', aliases: ['fantasy', 'уран зөгнөлт', 'фэнтэзи'] },
  { slug: 'animation', mn: 'Хүүхэлдэйн кино', en: 'Animation', aliases: ['animation', 'animated', 'cartoon', 'anime', 'хүүхэлдэйн', 'хүүхэлдэйн кино', 'анимэйшн', 'анимаци', 'анимэ'] },
  { slug: 'family', mn: 'Гэр бүлийн', en: 'Family', aliases: ['family', 'гэр бүлийн', 'гэр бүл', 'хүүхдийн'] },
  { slug: 'documentary', mn: 'Баримтат', en: 'Documentary', aliases: ['documentary', 'баримтат', 'баримтат кино'] },
  { slug: 'history', mn: 'Түүхэн', en: 'History', aliases: ['history', 'historical', 'түүхэн', 'түүх'] },
  { slug: 'war', mn: 'Дайны', en: 'War', aliases: ['war', 'дайны', 'дайн'] },
  { slug: 'biography', mn: 'Намтар', en: 'Biography', aliases: ['biography', 'biopic', 'намтар', 'намтарт'] },
  { slug: 'musical', mn: 'Хөгжимт', en: 'Musical', aliases: ['musical', 'music', 'хөгжимт', 'хөгжим'] },
];

const BY_SLUG = new Map(GENRES.map((genre) => [genre.slug, genre]));

export function getGenre(slug: string): Genre | undefined {
  return BY_SLUG.get(slug);
}

function clean(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9\u0400-\u04ff]+/g, ' ').trim()} `;
}

/** Maps a raw sheet value like "Horror, Thriller" or "Аймшгийн / Триллер" to genre slugs (max 3). */
export function parseGenres(raw?: string | null): string[] {
  if (!raw) return [];
  const found: string[] = [];
  raw
    .split(/[,;/|]+/)
    .map(clean)
    .forEach((token) => {
      GENRES.forEach((genre) => {
        if (found.includes(genre.slug)) return;
        if (genre.aliases.some((alias) => token.includes(clean(alias)))) found.push(genre.slug);
      });
    });
  return found.slice(0, 3);
}

export function genreLabel(slug: string): string {
  return BY_SLUG.get(slug)?.mn ?? slug;
}

/** Label for a raw sheet category: the proper genre name when it is a genre, else the raw text. */
export function labelForCategory(raw: string): string {
  const slugs = parseGenres(raw);
  return slugs.length ? genreLabel(slugs[0]) : raw;
}

/** What to print under a title: up to two genres, else the sheet's own category. */
export function displayCategory(movie: Pick<Movie, 'genres' | 'category'>): string {
  const labels = (movie.genres ?? []).slice(0, 2).map(genreLabel);
  return labels.length ? labels.join(' · ') : movie.category;
}
