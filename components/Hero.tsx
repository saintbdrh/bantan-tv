'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Movie } from '@/types';
import { isEmbedUrl } from '@/lib/epg';
import { canOptimize } from '@/lib/images';
import { pickVideo } from '@/lib/trailer';
import { TrailerVideo } from '@/components/TrailerVideo';

function trailerEmbedUrl(movie: Movie, muted: boolean): string | null {
  const muteParam = muted ? 1 : 0;
  // Drive file -> preview iframe (works when /api/drive-stream cannot play)
  if (movie.trailerUrl && /drive\.google\.com|drive\.usercontent/.test(movie.trailerUrl)) {
    const idMatch = movie.trailerUrl.match(/\/d\/([^/?#]+)/) || movie.trailerUrl.match(/[?&]id=([^&]+)/);
    if (idMatch?.[1]) {
      return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }
  }
  if (movie.trailerUrl && isEmbedUrl(movie.trailerUrl)) {
    const base = movie.trailerUrl.split('?')[0];
    return `${base}?autoplay=1&mute=${muteParam}`;
  }
  const youtubeParams = (id: string) =>
    `https://www.youtube.com/embed/${id}?autoplay=1&mute=${muteParam}&controls=0&rel=0&modestbranding=1&playsinline=1&loop=1&playlist=${id}&start=3`;
  if (movie.youtubeId) return youtubeParams(movie.youtubeId);
  if (movie.trailerUrl && (movie.trailerUrl.includes('youtube.com') || movie.trailerUrl.includes('youtu.be'))) {
    try {
      const u = new URL(movie.trailerUrl);
      const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
      if (id) return youtubeParams(id);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Autoplaying trailers are skipped for reduced-motion users and slow / data-saver connections. */
function useTrailersAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType || '');
    setAllowed(!reduce && !slow);
  }, []);
  return allowed;
}

const SWIPE_MIN_PX = 50;

export function Hero({ movies }: { movies: Movie[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [trailerReady, setTrailerReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const trailersAllowed = useTrailersAllowed();

  const currentMovie = movies[activeIndex] ?? movies[0];
  const bgSrc = currentMovie?.backdrop || currentMovie?.poster || '';
  const bgLoaded = !bgSrc || loadedSrc === bgSrc;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!movies.length) return;
      setActiveIndex((p) => (p + dir + movies.length) % movies.length);
    },
    [movies.length]
  );

  // Start a trailer only after the still image has painted (keeps the page fast).
  useEffect(() => {
    setTrailerReady(false);
    setPlayingId(null);
    if (!bgLoaded) return;
    const timer = window.setTimeout(() => setTrailerReady(true), 120);
    return () => window.clearTimeout(timer);
  }, [bgLoaded, currentMovie?.id]);

  // Pause trailer when less than ~40% of the hero is on screen, or the tab is hidden.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.4);
      },
      { threshold: [0, 0.25, 0.4, 0.6, 1] }
    );
    observer.observe(el);

    const clearLockScreenMedia = () => {
      try {
        if (navigator.mediaSession) {
          navigator.mediaSession.metadata = null;
          navigator.mediaSession.playbackState = 'none';
        }
      } catch {
        /* ignore */
      }
    };
    const onVisibility = () => {
      const visible = !document.hidden;
      setTabVisible(visible);
      if (!visible) clearLockScreenMedia();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', clearLockScreenMedia);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', clearLockScreenMedia);
      clearLockScreenMedia();
    };
  }, []);

  const shouldPlay = trailersAllowed && trailerReady && inView && tabVisible;

  // Prefer <video> (Drive via /api/drive-stream, seekable). If that fails, Drive/YouTube iframe.
  const video = currentMovie && trailersAllowed ? pickVideo(currentMovie, failed) : null;
  const embed =
    currentMovie && trailersAllowed && !video
      ? trailerEmbedUrl(currentMovie, muted)
      : null;
  const hasTrailer = trailersAllowed && !!(video || embed);
  const videoKey = video ? `${currentMovie.id}:${video.kind}` : null;

  // Slides without a video advance on a timer. While a video is the slide, its end moves us on.
  useEffect(() => {
    if (movies.length < 2 || paused || !inView || videoKey) return;
    const delay = embed && shouldPlay ? 20000 : 10000;
    const timer = window.setTimeout(() => go(1), delay);
    return () => window.clearTimeout(timer);
  }, [movies.length, paused, inView, videoKey, embed, shouldPlay, activeIndex, go]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'm' || e.key === 'M') {
      setMuted((m) => !m);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  if (!currentMovie) return null;

  return (
    <section
      ref={sectionRef}
      className={`hero-section${playingId === currentMovie?.id ? " is-trailer-playing" : ""}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onFocus={(e) => e.currentTarget.matches(':focus-visible') && setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      aria-roledescription="carousel"
      aria-label="Онцлох контент"
    >
      <div className={`hero-bg media-fade${bgLoaded ? ' is-loaded' : ''}`}>
        {bgSrc && (
          <Image
            key={bgSrc}
            src={bgSrc}
            alt=""
            fill
            priority={activeIndex === 0}
            sizes="100vw"
            quality={80}
            className="hero-bg-img"
            unoptimized={!canOptimize(bgSrc)}
            onLoad={() => setLoadedSrc(bgSrc)}
            onError={() => setLoadedSrc(bgSrc)}
          />
        )}
      </div>
      <div className="hero-overlay" />

      {embed && (
        <div
          className={`hero-trailer-layer${shouldPlay ? ' is-visible' : ''}`}
          aria-hidden="true"
        >
          {shouldPlay && (
            <iframe
              key={`${currentMovie.id}-embed-${muted ? 'm' : 'u'}`}
              src={embed}
              title=""
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen={false}
              tabIndex={-1}
            />
          )}
        </div>
      )}
      {video && videoKey && trailerReady && (
        <TrailerVideo
          key={videoKey}
          src={video.src}
          startAt={video.startAt}
          poster={bgSrc}
          muted={muted}
          play={shouldPlay}
          stallMs={6000}
          className={`hero-video${playingId === currentMovie.id ? ' is-playing' : ''}`}
          onPlaying={() => setPlayingId(currentMovie.id)}
          onEnded={() => go(1)}
          onFail={() => setFailed((f) => ({ ...f, [videoKey]: true }))}
        />
      )}

      <div className="container hero-content">
        <div className="hero-copy" aria-live="polite" aria-atomic="true">
          <p className="hero-eyebrow">BANTAN TV</p>
          <h1 className="hero-title">{currentMovie.title}</h1>
          {currentMovie.description && <p className="hero-desc">{currentMovie.description}</p>}
          <div className="hero-actions">
            <Link href={`/movie/${currentMovie.id}`} className="btn-outline">
              ДЭЛГЭРЭНГҮЙ
            </Link>
            <Link href="/live" className="btn-primary">
              ШУУД ҮЗЭХ
            </Link>
            {hasTrailer && (
              <button
                type="button"
                className="icon-button hero-mute-btn"
                aria-label={muted ? 'Дуу нээх' : 'Дуу хаах'}
                aria-pressed={!muted}
                onClick={() => setMuted((m) => !m)}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            )}
          </div>
        </div>

        {movies.length > 1 && (
          <>
            <div className="hero-nav-row">
              <button type="button" className="icon-button" aria-label="Өмнөх" onClick={() => go(-1)}>
                ←
              </button>
              <button type="button" className="icon-button" aria-label="Дараагийн" onClick={() => go(1)}>
                →
              </button>
            </div>
            <div className="hero-dots" role="tablist" aria-label="Слайд">
              {movies.map((movie, index) => (
                <button
                  key={movie.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={movie.title}
                  onClick={() => setActiveIndex(index)}
                  className={`hero-dot ${index === activeIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
