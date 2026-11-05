import Link from 'next/link';
import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { MovieRow } from '@/components/MovieRow';
import { getMovies, withPosters } from '@/lib/movies';
import { GENRES } from '@/lib/genres';

export default async function MoviesPage() {
  const movies = withPosters(await getMovies());

  const genreRows = GENRES.map((genre) => ({
    genre,
    movies: movies.filter((m) => m.genres.includes(genre.slug)),
  })).filter((row) => row.movies.length > 0);

  const unclassified = movies.filter((m) => m.genres.length === 0);

  return (
    <SiteShell>
      <section className="kino-san-hero" aria-label="Кино сан">
        <div className="kino-san-hero-bg" />
        <div className="container kino-san-hero-copy">
          <p className="eyebrow">BANTAN TV</p>
          <h1 className="page-title">Кино сан</h1>
          <p className="page-lead">Шилдэг кинонуудыг төрлөөр нь үзээрэй.</p>
        </div>
      </section>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <HomeBack />

        {genreRows.length > 0 && (
          <div className="genre-pills" style={{ marginBottom: 28 }}>
            {genreRows.map(({ genre }) => (
              <a key={genre.slug} href={`#genre-${genre.slug}`} className="genre-pill">
                {genre.mn}
              </a>
            ))}
          </div>
        )}

        {genreRows.map(({ genre, movies: list }) => (
          <section className="section" key={genre.slug} id={`genre-${genre.slug}`}>
            <div className="section-header">
              <h2 className="section-title">{genre.mn}</h2>
              <Link href={`/category/${genre.slug}`} className="section-link">
                Бүгдийг харах
              </Link>
            </div>
            <MovieRow movies={list} />
          </section>
        ))}

        {unclassified.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">{genreRows.length ? 'Бусад' : 'Кино'}</h2>
            </div>
            <MovieRow movies={unclassified} />
          </section>
        )}

        {movies.length === 0 && <div className="empty-state">Тун удахгүй.</div>}
      </div>
    </SiteShell>
  );
}
