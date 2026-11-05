import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { MovieCard } from '@/components/MovieCard';
import { getMovies, withPosters } from '@/lib/movies';

export default async function ShowsPage() {
  const movies = withPosters(await getMovies());
  const shows = movies.filter(
    (m) => /шоу|нэвтрүүлэг|show/i.test(m.category) || /шоу|нэвтрүүлэг/i.test(m.title)
  );

  return (
    <SiteShell>
      <div className="container">
        <HomeBack />
        <div className="page-hero">
          <p className="eyebrow">НЭВТРҮҮЛЭГ</p>
          <h1 className="page-title">Нэвтрүүлэг</h1>
          <p className="page-lead">Нэвтрүүлгүүд удахгүй нэмэгдэнэ.</p>
        </div>
        {shows.length ? (
          <div className="movie-grid">
            {shows.map((movie) => (
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
