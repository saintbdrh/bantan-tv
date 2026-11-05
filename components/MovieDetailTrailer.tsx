'use client';

import { useCallback, useState } from 'react';
import type { Movie } from '@/types';
import { TrailerVideo } from '@/components/TrailerVideo';
import { pickVideo, TRAILER_SKIP_SECONDS } from '@/lib/trailer';
import { isEmbedUrl } from '@/lib/epg';
import { useSoundOn } from '@/lib/sound';

function youtubeEmbed(url: string | null | undefined, id: string | null | undefined, muted: boolean): string | null {
  const embed = (yid: string) =>
    `https://www.youtube.com/embed/${yid}?autoplay=1&mute=${muted ? 1 : 0}&start=${TRAILER_SKIP_SECONDS}&rel=0&playsinline=1`;
  if (id) return embed(id);
  if (!url) return null;
  try {
    if (url.includes('youtu.be/')) {
      const yid = url.split('youtu.be/')[1]?.split(/[?&#]/)[0];
      if (yid) return embed(yid);
    }
    if (url.includes('youtube.com')) {
      const u = new URL(url);
      const yid = u.searchParams.get('v');
      if (yid) return embed(yid);
    }
  } catch { /* ignore */ }
  return null;
}

export function MovieDetailTrailer({ movie }: { movie: Movie }) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  // A YouTube trailer starts muted until the page may play sound, then reloads
  // with sound (see lib/sound.ts).
  const muted = !useSoundOn();

  const onFailed = useCallback((kind: string) => {
    setFailed((f) => ({ ...f, [`${movie.id}:${kind}`]: true }));
  }, [movie.id]);

  const video = pickVideo(movie, failed);
  const yt = !video ? youtubeEmbed(movie.trailerUrl, movie.youtubeId, muted) : null;
  const embed =
    !video && !yt && movie.trailerUrl && isEmbedUrl(movie.trailerUrl)
      ? movie.trailerUrl
      : null;

  if (!video && !yt && !embed) {
    return null;
  }

  return (
    <div className="detail-trailer">
      <div className="detail-trailer-frame">
        {video ? (
          <TrailerVideo
            key={`${movie.id}-${video.kind}-${video.src}`}
            src={video.src}
            startAt={video.startAt}
            poster={movie.backdrop || movie.poster}
            play
            onFail={() => onFailed(video.kind)}
          />
        ) : (
          <iframe
            key={yt ? (muted ? 'muted' : 'sound') : 'embed'}
            src={yt || embed || ''}
            title={`${movie.title} trailer`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="detail-trailer-iframe"
          />
        )}
      </div>
    </div>
  );
}
