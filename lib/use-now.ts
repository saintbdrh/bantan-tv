'use client';

import { useSyncExternalStore } from 'react';

// The current time (to the minute) for "aired / on now / next" labels. Pages
// are cached for minutes, so this is worked out in the browser, never on the
// server: during server rendering and hydration it is null.

const MINUTE = 60_000;
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function tick() {
  const value = Math.floor(Date.now() / MINUTE) * MINUTE;
  if (value === now) return;
  now = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) timer = setInterval(tick, 15_000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function snapshot() {
  if (!now) now = Math.floor(Date.now() / MINUTE) * MINUTE;
  return now;
}

/** Milliseconds since 1970, rounded down to the minute; null until hydrated. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

/** True while (or before) the airing is on, i.e. it has not finished yet. */
export function isUpcoming(airing: { startsAt?: string; endsAt?: string }, at: number): boolean {
  const end = Date.parse(airing.endsAt ?? '') || Date.parse(airing.startsAt ?? '') + 2 * 3600_000;
  return Number.isFinite(end) && end > at;
}
