import { displayCategory } from '@/lib/genres';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { getMovieById } from '@/lib/movies';
import { isEmbedUrl } from '@/lib/epg';

export default async function WatchPage({ params }: { params: { id: string } }) {
  const movie = await getMovieById(params.id);
  if (!movie) notFound();

  const embed =
    movie.trailerUrl && isEmbedUrl(movie.trailerUrl)
      ? movie.trailerUrl
      : movie.youtubeId
        ? `https://www.youtube.com/embed/${movie.youtubeId}?rel=0&playsinline=1`
        : null;
  const direct = movie.trailerUrl && !isEmbedUrl(movie.trailerUrl) ? movie.trailerUrl : null;

  return (
    <SiteShell>
      <div className="container">
        <HomeBack label="Буцах" />
        <div className="page-hero">
          <p className="eyebrow">{displayCategory(movie)}</p>
          <h1 className="page-title">{movie.title}</h1>
        </div>

        <div
          className="dark-panel"
          style={{ overflow: 'hidden', aspectRatio: '16/9', marginBottom: 24, background: '#000' }}
        >
          {embed ? (
            <iframe
              src={embed}
              title={movie.title}
              style={{ width: '100%', height: '100%', border: 0, minHeight: 280 }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : direct ? (
            <video
              src={direct}
              controls
              playsInline
              poster={movie.backdrop || movie.poster}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                height: '100%',
                minHeight: 280,
                display: 'grid',
                placeItems: 'center',
                background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${movie.backdrop || movie.poster}) center/cover`
              }}
            >
              <p style={{ color: '#ccc' }}>Тун удахгүй.</p>
            </div>
          )}
        </div>

        <p className="page-lead" style={{ marginBottom: 20 }}>
          {movie.description}
        </p>
        <Link href={`/movie/${movie.id}`} className="btn-outline">
          ДЭЛГЭРЭНГҮЙ
        </Link>
      </div>
    </SiteShell>
  );
}
