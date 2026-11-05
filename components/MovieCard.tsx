'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Movie } from '@/types';
import { canOptimize } from '@/lib/images';
import { isUpcoming, useNow } from '@/lib/use-now';
import { MovieMeta } from '@/components/MovieMeta';

/** Listed cards always show poster (never trailer). */
export function MovieCard({ movie }: { movie: Movie }) {
  const [loaded, setLoaded] = useState(false);
  const now = useNow();
  const src = movie.poster || movie.backdrop || '';
  // Still to be broadcast this week (worked out in the browser; pages are cached).
  const onAir = now !== null && !!movie.airings?.some((airing) => isUpcoming(airing, now));

  return (
    <Link href={`/movie/${movie.id}`} className="movie-card">
      <article>
        <div className="movie-card-media">
          {src ? (
            <Image
              src={src}
              alt={movie.title}
              fill
              sizes="(max-width: 700px) 60vw, (max-width: 1200px) 28vw, 320px"
              className={`media-fade${loaded ? ' is-loaded' : ''}`}
              unoptimized={!canOptimize(src)}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
            />
          ) : null}
          {onAir && <span className="movie-card-onair">Энэ 7 хоногт</span>}
          <div className="movie-card-gradient" />
          <div className="movie-card-info">
            <h3>{movie.title}</h3>
            <MovieMeta movie={movie} className="movie-meta-compact" />
            {movie.description && <p className="movie-card-desc">{movie.description}</p>}
          </div>
        </div>
      </article>
    </Link>
  );
}
