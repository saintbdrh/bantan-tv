'use client';

import { useEffect, useState } from 'react';
import { DayKey, EpgItem, DAYS, getActiveShowForDay, getCurrentDayIndex, getCurrentMinutes } from '@/lib/epg';

/** "Now on air" text. Recomputed in the browser (Ulaanbaatar time) so it stays right on cached pages. */
export function NowOnAir({ epgData, initialNow }: { epgData: Record<DayKey, EpgItem[]>; initialNow: string }) {
  const [now, setNow] = useState(() => new Date(initialNow));

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const show = getActiveShowForDay(epgData, DAYS[getCurrentDayIndex(now)], getCurrentMinutes(now));

  return (
    <div className="now-playing-copy">
      <p className="eyebrow">ШУУД</p>
      <h2 className="now-playing-title">Одоо гарч байна</h2>
      {show && (
        <>
          <p className="now-playing-meta">
            <strong>{show.title}</strong>
            <span>{show.category || 'Кино'}</span>
          </p>
          <p className="now-playing-next">
            {show.start}–{show.end}
          </p>
        </>
      )}
    </div>
  );
}
