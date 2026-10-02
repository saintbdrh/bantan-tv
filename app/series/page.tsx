import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { MovieCard } from '@/components/MovieCard';
import { getMovies, withPosters } from '@/lib/movies';

export default async function SeriesPage() {
  const movies = withPosters(await getMovies());
  const series = movies.filter(
    (m) => /цуврал|series/i.test(m.category) || /цуврал|series/i.test(m.title)
  );

  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="page-hero">
          <p className="eyebrow">ЦУВРАЛ</p>
          <h1 className="page-title">Цуврал</h1>
          <p className="page-lead">Шинэ цувралууд удахгүй нэмэгдэнэ.</p>
        </div>
        {series.length ? (
          <div className="movie-grid">
            {series.map((movie) => (
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
