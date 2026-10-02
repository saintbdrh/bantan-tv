'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Movie } from '@/types';
import { canOptimize } from '@/lib/images';

/** Listed cards always show poster (never trailer). */
export function MovieCard({ movie }: { movie: Movie }) {
  const [loaded, setLoaded] = useState(false);
  const src = movie.poster || movie.backdrop || '';

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
          <div className="movie-card-gradient" />
          <div className="movie-card-info">
            <h3>{movie.title}</h3>
</div>
        </div>
      </article>
    </Link>
  );
}
