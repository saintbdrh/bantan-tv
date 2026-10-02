import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { MovieCard } from '@/components/MovieCard';
import { GenreChips } from '@/components/GenreChips';
import { getMovies, withPosters } from '@/lib/movies';
import { getGenre } from '@/lib/genres';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug).toLowerCase();
  const movies = withPosters(await getMovies());
  const genre = getGenre(slug);
  // /category/<genre-slug> is the normal case; anything else falls back to the sheet's own category text.
  const categoryMovies = genre
    ? movies.filter((movie) => movie.genres.includes(genre.slug))
    : movies.filter((movie) => movie.category.toLowerCase() === slug);
  const heading = genre?.mn ?? categoryMovies[0]?.category ?? decodeURIComponent(params.slug);
  const available = Array.from(new Set(movies.flatMap((movie) => movie.genres)));

  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="page-hero">
          <p className="eyebrow">ТӨРӨЛ</p>
          <h1 className="page-title">{heading}</h1>
        </div>
        <GenreChips available={available} active={genre?.slug} />
        {categoryMovies.length ? (
          <div className="movie-grid">
            {categoryMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Тун удахгүй.</div>
        )}
      </div>
    </SiteShell>
  );
}
