import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { MovieCard } from '@/components/MovieCard';
import { getMovies, withPosters } from '@/lib/movies';
import { SearchBox } from '@/components/SearchBox';
import { displayCategory } from '@/lib/genres';

export default async function SearchPage({
  searchParams
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? '').trim().toLowerCase();
  const movies = withPosters(await getMovies());
  const results = q
    ? movies.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          displayCategory(m).toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      )
    : movies;

  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="page-hero">
          <p className="eyebrow">ХАЙЛТ</p>
          <h1 className="page-title">Хайх</h1>
        </div>
        <SearchBox initialQuery={searchParams.q ?? ''} />
        {results.length ? (
          <div className="movie-grid" style={{ marginTop: 28 }}>
            {results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: 28 }}>
            Илэрц олдсонгүй. Тун удахгүй шинэ контент нэмэгдэнэ.
          </div>
        )}
      </div>
    </SiteShell>
  );
}
