import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { MovieRow } from '@/components/MovieRow';
import { Footer } from '@/components/Footer';
import { EpgSection } from '@/components/EpgSection';
import { GamesSection } from '@/components/GamesSection';
import { PartnerBanner } from '@/components/PartnerBanner';
import { getMovies, moviesWithTrailers, withPosters } from '@/lib/movies';
import { GENRES } from '@/lib/genres';

export default async function HomePage() {
  const movies = withPosters(await getMovies());

  const trailers = moviesWithTrailers(movies);
  const heroPool = trailers.length ? trailers : movies;
  // Movies with our own R2 trailer go first, so the hero plays from R2 rather than Drive.
  const heroMovies = heroPool
    .slice()
    .sort((a, b) => Number(!!b.trailerVideoUrl) - Number(!!a.trailerVideoUrl))
    .slice(0, 8);

  const genreRows = GENRES.map((genre) => ({
    genre,
    movies: movies.filter((m) => m.genres.includes(genre.slug)),
  })).filter((row) => row.movies.length > 0);

  const unclassified = movies.filter((m) => m.genres.length === 0);
  const gameMovies = movies.map(({ id, title, localTitle, description, year, genres, poster, backdrop }) => ({
    id,
    title,
    localTitle,
    description,
    year,
    genres,
    poster,
    backdrop,
  }));

  return (
    <div className="page-shell">
      <Navbar />
      <main>
        {heroMovies.length > 0 && <Hero movies={heroMovies} />}

        <section className="section" id="epg">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Хөтөлбөр</h2>
            </div>
            <EpgSection />
          </div>
        </section>

        {gameMovies.length > 0 && <GamesSection movies={gameMovies} />}

        {genreRows.map(({ genre, movies: list }) => (
          <section className="section" key={genre.slug}>
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">{genre.mn}</h2>
                <a href={`/category/${genre.slug}`} className="section-link">
                  Бүгдийг үзэх
                </a>
              </div>
              <MovieRow movies={list} />
            </div>
          </section>
        ))}

        {unclassified.length > 0 && (
          <section className="section">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">{genreRows.length ? 'Бусад' : 'Кино сан'}</h2>
                <a href="/movies" className="section-link">Бүгдийг үзэх</a>
              </div>
              <MovieRow movies={unclassified} />
            </div>
          </section>
        )}

        {!movies.length && (
          <section className="section">
            <div className="container">
              <div className="empty-state">Тун удахгүй.</div>
            </div>
          </section>
        )}

        <section className="section">
          <div className="container">
            <PartnerBanner />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
