'use client';

import type { Airing } from '@/lib/schedule';
import { useNow } from '@/lib/use-now';

type State = 'past' | 'now' | 'upcoming';

function stateOf(airing: Airing, now: number | null): State {
  if (now === null) return 'upcoming';
  const start = Date.parse(airing.startsAt ?? '');
  if (!Number.isFinite(start)) return 'upcoming';
  const end = Date.parse(airing.endsAt ?? '') || start + 2 * 3600_000;
  if (now >= end) return 'past';
  return now >= start ? 'now' : 'upcoming';
}

/** "2026-10-09T13:00:00+08:00" -> "10.09" */
function shortDate(iso?: string): string {
  const match = iso?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}` : '';
}

/** When a movie is on BANTAN TV this week; past broadcasts are dimmed. */
export function AirTimes({ airings }: { airings: Airing[] }) {
  const now = useNow();
  if (!airings.length) return null;

  const rows = airings.map((airing) => ({ airing, state: stateOf(airing, now) }));
  const next = rows.findIndex((row) => row.state !== 'past');
  const allPast = next === -1;

  return (
    <section className="air-times" aria-label="BANTAN TV-ээр гарах цаг">
      <p className="air-times-label">{allPast ? 'Энэ долоо хоногт гарсан' : 'BANTAN TV-ээр гарах цаг'}</p>
      <ul className="air-times-list">
        {rows.map(({ airing, state }, index) => (
          <li
            key={`${airing.startsAt ?? airing.day}-${airing.start}`}
            className={`is-${state}${index === next ? ' is-next' : ''}`}
          >
            <span className="air-day">
              {airing.day}
              {shortDate(airing.startsAt) && <small>{shortDate(airing.startsAt)}</small>}
            </span>
            <span className="air-time">
              {airing.start}
              {airing.end ? `–${airing.end}` : ''}
            </span>
            {state === 'now' && <em>Одоо гарч байна</em>}
            {state === 'upcoming' && index === next && now !== null && <em>Дараагийнх</em>}
          </li>
        ))}
      </ul>
    </section>
  );
}
