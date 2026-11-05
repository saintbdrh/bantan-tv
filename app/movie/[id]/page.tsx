import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { MovieDetailTrailer } from '@/components/MovieDetailTrailer';
import { MovieMeta } from '@/components/MovieMeta';
import { AirTimes } from '@/components/AirTimes';
import { getMovieById } from '@/lib/movies';
import { canOptimize } from '@/lib/images';
import { getGenre } from '@/lib/genres';

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getMovieById(id);
  if (!movie) notFound();

  const genres = movie.genres
    .map((slug) => getGenre(slug)?.mn)
    .filter((name): name is string => !!name)
    .slice(0, 2);
  const hasTrailer = !!(movie.trailerUrl || movie.trailerVideoUrl || movie.youtubeId);

  return (
    <SiteShell>
      <div className="container">
        <HomeBack />

        <div className="detail-hero">
          <div className="detail-hero-bg">
            {(movie.backdrop || movie.poster) && (
              <Image
                src={movie.backdrop || movie.poster}
                alt=""
                fill
                priority
                sizes="(max-width: 1440px) 100vw, 1440px"
                quality={80}
                className="hero-bg-img"
                unoptimized={!canOptimize(movie.backdrop || movie.poster)}
              />
            )}
          </div>
          <div className="detail-hero-overlay" />
          <div className="detail-hero-content">
            <p className="eyebrow">BANTAN TV</p>
            <h1 className="page-title" style={{ marginBottom: 12 }}>{movie.title}</h1>
            {movie.localTitle && movie.localTitle !== movie.title && (
              <p className="detail-subtitle">{movie.localTitle}</p>
            )}
            <MovieMeta movie={movie} extra={genres} className="detail-movie-meta" />
            {movie.description && (
              <p className="page-lead" style={{ marginBottom: 24 }}>
                {movie.description}
              </p>
            )}

            <AirTimes airings={movie.airings ?? []} />
          </div>
        </div>

        {/* Trailer plays here — same skip as hero (default 4s) */}
        {hasTrailer && <MovieDetailTrailer movie={movie} />}
      </div>
    </SiteShell>
  );
}
