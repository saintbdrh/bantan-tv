import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { MovieDetailTrailer } from '@/components/MovieDetailTrailer';
import { getMovieById } from '@/lib/movies';
import { canOptimize } from '@/lib/images';

export default async function MovieDetailPage({ params }: { params: { id: string } }) {
  const movie = await getMovieById(params.id);
  if (!movie) notFound();

  const airTimes = movie.airTimes ?? [];
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
            <p className="page-lead" style={{ marginBottom: 24 }}>{movie.description}</p>

            {airTimes.length > 0 && (
              <div className="air-times-block">
                <p className="air-times-label">Энэ 7 хоногт</p>
                <ul className="air-times-list">
                  {airTimes.map((slot) => (
                    <li key={`${slot.day}-${slot.start}-${slot.end}`}>
                      <strong>{slot.day}</strong> {slot.start}–{slot.end}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: airTimes.length ? 20 : 0 }}>
              <Link href="/live" className="btn-outline">
                ШУУД ҮЗЭХ
              </Link>
            </div>
          </div>
        </div>

        {/* Trailer plays here — same skip as hero (default 4s) */}
        {hasTrailer && <MovieDetailTrailer movie={movie} />}
      </div>
    </SiteShell>
  );
}
