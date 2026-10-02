'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Props = {
  src: string;
  /** Seconds to skip (Drive intro). Video stays hidden until this point is reached. */
  startAt?: number;
  poster?: string;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  play?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  stallMs?: number;
  className?: string;
  style?: CSSProperties;
  onPlaying?: () => void;
  onEnded?: () => void;
  onFail?: () => void;
};

export function TrailerVideo({
  src,
  startAt = 0,
  poster,
  muted = true,
  controls = false,
  loop = false,
  play,
  preload = 'auto',
  stallMs = 12000,
  className,
  style,
  onPlaying,
  onEnded,
  onFail,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const failRef = useRef(onFail);
  const onPlayingRef = useRef(onPlaying);
  failRef.current = onFail;
  onPlayingRef.current = onPlaying;
  const [ready, setReady] = useState(false);
  const announced = useRef(false);

  useEffect(() => {
    setReady(false);
    announced.current = false;
  }, [src, startAt]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    try {
      video.disableRemotePlayback = true;
    } catch {
      /* ignore */
    }
  }, [src]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const markReady = () => {
      setReady(true);
      if (!announced.current) {
        announced.current = true;
        onPlayingRef.current?.();
      }
    };

    const jump = () => {
      if (startAt <= 0) return;
      if (Number.isFinite(video.duration) && video.duration > 0 && startAt >= video.duration) {
        return;
      }
      if (Math.abs(video.currentTime - startAt) > 0.2) {
        try {
          video.currentTime = startAt;
        } catch {
          /* not ready */
        }
      }
    };

    const onLoaded = () => {
      jump();
    };

    const onSeeked = () => {
      if (startAt <= 0 || video.currentTime >= startAt - 0.25) {
        markReady();
        if (play) video.play().catch(() => {});
      }
    };

    const onTimeUpdate = () => {
      if (startAt > 0 && video.currentTime > 0.05 && video.currentTime < startAt - 0.3) {
        jump();
        return;
      }
      if (startAt <= 0 || video.currentTime >= startAt - 0.25) {
        markReady();
      }
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('canplay', onLoaded);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('timeupdate', onTimeUpdate);

    if (video.readyState >= 1) jump();

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('canplay', onLoaded);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [src, startAt, play]);

  useEffect(() => {
    const video = ref.current;
    if (!video || play === undefined) return;
    if (play) {
      if (startAt > 0 && video.currentTime < startAt - 0.25) {
        try {
          video.currentTime = startAt;
        } catch {
          /* ignore */
        }
      }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [play, src, startAt]);

  useEffect(() => {
    if (play !== true || ready) return;
    const timer = window.setTimeout(() => failRef.current?.(), stallMs);
    return () => window.clearTimeout(timer);
  }, [stallMs, play, ready, src]);

  return (
    <video
      ref={ref}
      className={`${className || ''} ${ready ? 'is-playing' : 'is-seeking'}`.trim()}
      style={{
        ...style,
        opacity: ready ? undefined : 0,
        pointerEvents: ready ? undefined : 'none',
      }}
      src={src}
      poster={poster}
      muted={muted}
      controls={controls}
      playsInline
      preload={preload}
      onEnded={(e) => {
        if (loop) {
          e.currentTarget.currentTime = startAt;
          e.currentTarget.play().catch(() => {});
        } else {
          onEnded?.();
        }
      }}
      onError={() => failRef.current?.()}
    />
  );
}
