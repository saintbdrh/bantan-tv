import Link from 'next/link';
import { GENRES } from '@/lib/genres';

/** Horizontally scrollable genre filter (swipeable on phones). Only genres that have titles are shown. */
export function GenreChips({ available, active }: { available: string[]; active?: string }) {
  const genres = GENRES.filter((genre) => available.includes(genre.slug));
  if (!genres.length) return null;

  return (
    <nav className="genre-pills genre-pills-scroll" aria-label="Төрөл">
      <Link href="/movies" className={`genre-pill${!active ? ' active' : ''}`}>
        Бүгд
      </Link>
      {genres.map((genre) => (
        <Link
          key={genre.slug}
          href={`/category/${genre.slug}`}
          className={`genre-pill${active === genre.slug ? ' active' : ''}`}
        >
          {genre.mn}
        </Link>
      ))}
    </nav>
  );
}
