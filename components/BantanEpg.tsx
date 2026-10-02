'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DayKey,
  EpgItem,
  DAYS,
  EPG_ENDPOINT,
  FALLBACK_EPG,
  normalizeEpgPayload,
  getCurrentDayIndex,
  getCurrentMinutes,
  getActiveShowForDay,
  isEmbedUrl,
} from '@/lib/epg';
import { DRIVE_SKIP_SECONDS, driveDirectUrl } from '@/lib/trailer';
import { TrailerVideo } from '@/components/TrailerVideo';

const trailerCache = new Map<string, string>();

function getTrailerEmbedUrl(title: string, youtubeId?: string | null) {
  if (youtubeId) {
    return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`;
  }
  return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(`${title} official trailer`)}&autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1`;
}

type BantanEpgProps = {
  initialData?: Record<DayKey, EpgItem[]>;
  initialNow?: string;
};

function HighlightTrailer({
  show,
  youtubeId,
  visible,
}: {
  show: EpgItem;
  youtubeId?: string | null;
  visible: boolean;
}) {
  const [driveFailed, setDriveFailed] = useState(false);
  if (!visible) return null;

  const url = show.trailerUrl;
  const drive = url && isEmbedUrl(url) && !driveFailed ? driveDirectUrl(url) : null;
  const videoStyle = { width: '100%', height: '100%', objectFit: 'cover' as const };

  if (drive) {
    return (
      <TrailerVideo
        src={drive}
        startAt={DRIVE_SKIP_SECONDS}
        poster={show.image}
        play
        loop
        controls
        stallMs={8000}
        style={videoStyle}
        onFail={() => setDriveFailed(true)}
      />
    );
  }
  if (url && isEmbedUrl(url)) {
    return <iframe title={`${show.title} trailer`} src={url} allow="autoplay; fullscreen" allowFullScreen />;
  }
  if (url) {
    return <TrailerVideo src={url} poster={show.image} play loop controls style={videoStyle} />;
  }
  return (
    <iframe
      title={`${show.title} trailer`}
      src={getTrailerEmbedUrl(show.title, show.youtubeId ?? youtubeId)}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

export function BantanEpg(props: BantanEpgProps) {
  const { initialData, initialNow } = props;
  const [now, setNow] = useState(() => (initialNow ? new Date(initialNow) : new Date()));
  const [epgData, setEpgData] = useState<Record<DayKey, EpgItem[]>>(initialData ?? FALLBACK_EPG);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => getCurrentDayIndex(now));
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null);
  const [resolvedYoutubeId, setResolvedYoutubeId] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [showEarlier, setShowEarlier] = useState(false);
  const [highlightVisible, setHighlightVisible] = useState(true);
  const scheduleListRef = useRef<HTMLDivElement | null>(null);
  const highlightPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (initialData) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${EPG_ENDPOINT}${EPG_ENDPOINT.includes('?') ? '&' : '?'}t=${Date.now()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!active) return;
        setEpgData(normalizeEpgPayload(json));
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      active = false;
    };
  }, [initialData]);

  const liveDayIndex = getCurrentDayIndex(now);
  const liveMinutes = getCurrentMinutes(now);
  const liveShow = useMemo(
    () => getActiveShowForDay(epgData, DAYS[liveDayIndex], liveMinutes),
    [epgData, liveDayIndex, liveMinutes]
  );

  useEffect(() => {
    if (!autoMode) return;
    setSelectedDayIndex(liveDayIndex);
    if (liveShow) setSelectedShowId(liveShow.id);
  }, [autoMode, liveDayIndex, liveShow]);

  const visibleDay = DAYS[selectedDayIndex] ?? DAYS[0];
  const visibleSchedule = epgData[visibleDay] ?? FALLBACK_EPG[visibleDay] ?? [];

  const selectedShow = useMemo(() => {
    if (!visibleSchedule.length) return null;
    if (autoMode) return liveShow ?? visibleSchedule[0];
    return visibleSchedule.find((item) => item.id === selectedShowId) ?? visibleSchedule[0];
  }, [autoMode, liveShow, selectedShowId, visibleSchedule]);

  useEffect(() => {
    const root = scheduleListRef.current;
    if (!root) return;
    const target =
      (root.querySelector('[data-live="true"]') as HTMLElement | null) ||
      (root.querySelector('.epg-schedule-item.selected') as HTMLElement | null);
    if (!target) return;
    const top = target.offsetTop - root.clientHeight / 2 + target.clientHeight / 2;
    root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [selectedDayIndex, liveDayIndex, liveShow?.id, selectedShowId, autoMode, visibleSchedule.length]);

  useEffect(() => {
    let active = true;
    async function resolveTrailer() {
      if (!selectedShow || selectedShow.youtubeId || selectedShow.trailerUrl) {
        setResolvedYoutubeId(null);
        return;
      }
      const cached = trailerCache.get(selectedShow.title);
      if (cached) {
        setResolvedYoutubeId(cached);
        return;
      }
      setResolvedYoutubeId(null);
      try {
        const response = await fetch(`/api/trailer?title=${encodeURIComponent(selectedShow.title)}`);
        if (!response.ok) return;
        const payload = await response.json();
        if (active && typeof payload.youtubeId === 'string' && payload.youtubeId) {
          trailerCache.set(selectedShow.title, payload.youtubeId);
          setResolvedYoutubeId(payload.youtubeId);
        }
      } catch {
        /* search embed still works */
      }
    }
    resolveTrailer();
    return () => {
      active = false;
    };
  }, [selectedShow]);

  const isViewingLiveDay = selectedDayIndex === liveDayIndex;
  const currentNowShow = useMemo(() => {
    if (!isViewingLiveDay) return null;
    return getActiveShowForDay(epgData, visibleDay, liveMinutes);
  }, [epgData, visibleDay, liveMinutes, isViewingLiveDay]);

  const liveIndexInList = currentNowShow
    ? visibleSchedule.findIndex((item) => item.id === currentNowShow.id)
    : -1;
  const hiddenEarlierCount = liveIndexInList > 0 && !showEarlier ? liveIndexInList : 0;
  const listedSchedule = hiddenEarlierCount
    ? visibleSchedule.slice(liveIndexInList)
    : visibleSchedule;

  useEffect(() => {
    setShowEarlier(false);
  }, [selectedDayIndex]);

  useEffect(() => {
    const el = highlightPanelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHighlightVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSelectDay = (dayIndex: number) => {
    setAutoMode(false);
    setSelectedDayIndex(dayIndex);
    const nextSchedule = epgData[DAYS[dayIndex]] ?? FALLBACK_EPG[DAYS[dayIndex]] ?? [];
    setSelectedShowId(nextSchedule[0]?.id ?? null);
  };

  const handleSelectShow = (showId: string) => {
    setAutoMode(false);
    setSelectedShowId(showId);
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div>
            <p className="eyebrow">Телевизийн хөтөлбөр</p>
            <h2 className="section-title">BANTAN TV</h2>
          </div>
          <button
            type="button"
            className="gold-button"
            onClick={() => setAutoMode(true)}
            style={{ padding: '10px 16px', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            {autoMode ? 'ШУУД' : 'БҮХ ХӨТӨЛБӨР'}
          </button>
        </div>

        <div className="epg-grid">
          {/* Weekdays — left column */}
          <div className="dark-panel epg-panel epg-days-panel">
            <div className="epg-panel-header">
              <span>Өдөр</span>
              <span className="epg-status">{autoMode ? 'ШУУД' : 'Сонгосон өдөр'}</span>
            </div>

            <div className="epg-week-list">
              {DAYS.map((day, index) => {
                const isSelected = day === visibleDay;
                const isLive = autoMode && index === liveDayIndex;
                return (
                  <button
                    key={day}
                    type="button"
                    className={`epg-day-button${isSelected ? ' selected' : ''}${isLive ? ' is-live' : ''}`}
                    onClick={() => handleSelectDay(index)}
                  >
                    <span>{day}</span>
                    {isLive && <span className="epg-live-pill">Шууд</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline — beside weekdays */}
          <div className="dark-panel epg-panel epg-schedule-panel">
            <div className="epg-panel-header">
              <span>Цаг</span>
              <span className="epg-status">{visibleDay}</span>
            </div>

            <div className="epg-schedule-list" ref={scheduleListRef}>
              {hiddenEarlierCount > 0 && (
                <button type="button" className="epg-show-earlier" onClick={() => setShowEarlier(true)}>
                  Өмнөх {hiddenEarlierCount} нэвтрүүлэг
                </button>
              )}
              {listedSchedule.map((item) => {
                const isSelected = selectedShow?.id === item.id;
                const isNow = isViewingLiveDay && currentNowShow?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-live={isNow ? 'true' : undefined}
                    className={`epg-schedule-item${isSelected ? ' selected' : ''}${isNow ? ' is-live' : ''}`}
                    onClick={() => handleSelectShow(item.id)}
                  >
                    <div className="epg-schedule-time">
                      <span>{item.start}</span>
                      <span>{item.end}</span>
                    </div>
                    <div className="epg-schedule-copy">
                      <div className="epg-title-row">
                        {isNow && <span className="epg-live-dot" aria-label="Шууд" />}
                        <strong>{item.title}</strong>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dark-panel epg-panel epg-highlight-panel" ref={highlightPanelRef}>
            <div className="epg-panel-header">
              <span>Одоо гарч байна</span>
              <span className="epg-status">ШУУД</span>
            </div>

            {selectedShow && (
              <div className="epg-highlight-card">
                <div
                  className="epg-highlight-media"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(5,5,5,0.08), rgba(5,5,5,0.82)), url(${selectedShow.image})`,
                  }}
                >
                  <HighlightTrailer
                    key={selectedShow.id}
                    show={selectedShow}
                    youtubeId={resolvedYoutubeId}
                    visible={highlightVisible}
                  />
                  <div className="epg-highlight-badge">Трейлер</div>
                </div>

                <div className="epg-highlight-copy">
                  <div className="epg-highlight-meta">
                    <span>{selectedShow.title}</span>
                    <span>
                      {selectedShow.start}-{selectedShow.end}
                    </span>
                  </div>
                  <h3>{selectedShow.title}</h3>
                  <p>{selectedShow.description}</p>
                  {selectedShow.imdbUrl && (
                    <div style={{ marginTop: 18 }}>
                      <a
                        href={selectedShow.imdbUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ghost-button"
                        style={{ display: 'inline-flex' }}
                      >
                        IMDB МЭДЭЭЛЭЛ
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
