'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Movie } from '@/types';
import { isEmbedUrl } from '@/lib/epg';
import { pickVideo } from '@/lib/trailer';
import { TrailerVideo } from '@/components/TrailerVideo';

function embedSrc(movie: Movie): string | null {
  if (movie.trailerUrl && isEmbedUrl(movie.trailerUrl)) return movie.trailerUrl;
  if (movie.youtubeId) {
    return `https://www.youtube.com/embed/${movie.youtubeId}?rel=0&modestbranding=1&playsinline=1`;
  }
  return null;
}

function pauseMediaIn(el: HTMLElement) {
  el.querySelectorAll('video').forEach((v) => {
    v.pause();
    v.muted = true;
  });
  // Replace iframe src with muted/paused variant is hard; blank src when off-screen
  el.querySelectorAll('iframe').forEach((frame) => {
    const iframe = frame as HTMLIFrameElement;
    if (iframe.dataset.src) return;
    iframe.dataset.src = iframe.src;
    iframe.src = 'about:blank';
  });
}

function resumeMediaIn(el: HTMLElement) {
  el.querySelectorAll('iframe').forEach((frame) => {
    const iframe = frame as HTMLIFrameElement;
    if (iframe.dataset.src && (!iframe.src || iframe.src === 'about:blank')) {
      iframe.src = iframe.dataset.src;
    }
  });
}

function TrailerMedia({ movie }: { movie: Movie }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const poster = movie.backdrop || movie.poster;
  const video = pickVideo(movie, failed);

  if (video) {
    return (
      <TrailerVideo
        key={`${movie.id}:${video.kind}`}
        src={video.src}
        startAt={video.startAt}
        poster={poster}
        controls
        preload="metadata"
        onFail={() => setFailed((f) => ({ ...f, [`${movie.id}:${video.kind}`]: true }))}
      />
    );
  }
  const src = embedSrc(movie);
  if (src) {
    return (
      <iframe
        src={src}
        title={`${movie.title} trailer`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }
  return (
    <div className="trailer-fallback" style={{ backgroundImage: `url(${poster})` }}>
      <Link href={`/movie/${movie.id}`} className="btn-primary btn-sm">
        ДЭЛГЭРЭНГҮЙ
      </Link>
    </div>
  );
}

export function TrailerCarousel({ movies }: { movies: Movie[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('.trailer-card') as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector('.trailer-card') as HTMLElement | null;
    if (!card) return;
    const idx = Math.round(el.scrollLeft / (card.offsetWidth + 16));
    setActive(Math.min(Math.max(idx, 0), movies.length - 1));
  };

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll('.trailer-card')) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            resumeMediaIn(el);
          } else {
            pauseMediaIn(el);
          }
        });
      },
      { root, threshold: [0, 0.55, 1] }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [movies]);

  if (!movies.length) return null;

  return (
    <section className="trailer-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Трейлер</h2>
          <div className="trailer-nav">
            <button type="button" className="icon-button" aria-label="Өмнөх" onClick={() => scrollBy(-1)}>
              ←
            </button>
            <button type="button" className="icon-button" aria-label="Дараагийн" onClick={() => scrollBy(1)}>
              →
            </button>
          </div>
        </div>

        <div
          className="trailer-scroller"
          ref={scrollerRef}
          onScroll={onScroll}
        >
          {movies.map((movie) => (
            <article key={movie.id} className="trailer-card">
              <div className="trailer-media">
                <TrailerMedia movie={movie} />
              </div>
              <div className="trailer-meta">
                <Link href={`/movie/${movie.id}`}>
                  <h3>{movie.title}</h3>
                </Link>
                
              </div>
            </article>
          ))}
        </div>

        <div className="trailer-dots" aria-hidden="true">
          {movies.slice(0, 12).map((_, i) => (
            <span key={i} className={i === active ? 'active' : ''} />
          ))}
        </div>
      </div>
    </section>
  );
}
