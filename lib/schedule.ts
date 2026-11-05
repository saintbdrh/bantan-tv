// When does a movie air this week? Read straight from the weekly schedule
// sheet (the same Apps Script response as lib/epg.ts), with exact times.
//
// The sheet lists, day by day, the start time of every programme ("цаг") and
// its name ("хөтөлбөрийн нэр"), e.g. "Феррари ( FERRARI ) +12": Mongolian
// title, English title, age rating. A programme runs until the next one
// starts. Programmes after midnight stay under the previous day's label, so a
// time that goes backwards means the next day.

import { DAYS, DayKey, getDayKeyFromValue } from '@/lib/epg';
import { closestKey, titleKey } from '@/lib/titles';

export type Airing = {
  /** 0 = Monday … 6 = Sunday; 7 = the Monday after this week */
  dayIndex: number;
  day: DayKey;
  /** HH:MM, Ulaanbaatar time */
  start: string;
  /** HH:MM when the next programme starts (unknown for the last one) */
  end?: string;
  /** ISO 8601 (+08:00) when the week's dates are known */
  startsAt?: string;
  endsAt?: string;
  /** Name exactly as typed in the sheet */
  rawTitle: string;
  /** English title (from the brackets), or the whole name */
  title: string;
  /** Mongolian title, when the name has one */
  localTitle?: string;
  /** As the channel writes it, e.g. "+12" */
  ageRating?: string;
  /** IMDb score from the sheet's «rating» column (weeks from 2026-10-12 on) */
  imdb?: number;
  /** Synopsis from the sheet's «Товч агуулга» column */
  description?: string;
};

export type WeekSchedule = {
  /** Monday of the schedule's week, YYYY-MM-DD */
  weekStart?: string;
  airings: Airing[];
};

const EMPTY: WeekSchedule = { airings: [] };

function payloadRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as Record<string, unknown>;
  for (const key of ['rows', 'data', 'items', 'records', 'schedule', 'epg']) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  return [];
}

function toTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) return null;
  return `${String(hours % 24).padStart(2, '0')}:${match[2]}`;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** "12", "+12", "12+" -> "+12" (as the channel shows it); other text is kept as typed. */
export function normalizeAgeRating(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  const digits = text.match(/^\+?\s?(\d{1,2})\s?\+?$/);
  return digits ? `+${Number(digits[1])}` : text;
}

/** "Феррари ( FERRARI ) +12" -> { title: "FERRARI", localTitle: "Феррари", ageRating: "+12" } */
export function parseProgramTitle(raw: string): Pick<Airing, 'title' | 'localTitle' | 'ageRating'> {
  let text = raw.replace(/[\\|]+\s*$/, '').trim();
  let ageRating: string | undefined;
  const age = text.match(/(?:^|\s)\+\s?(\d{1,2})\s*$/) ?? text.match(/(?:^|\s)(\d{1,2})\s?\+\s*$/);
  if (age && age.index !== undefined) {
    ageRating = `+${Number(age[1])}`;
    text = text.slice(0, age.index).trim();
  }
  // The English title is the last bracket group, which may hold brackets of its
  // own: "Аалзны тор ( COBWEB (KOREA) )".
  if (text.endsWith(')')) {
    let depth = 0;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === ')') depth++;
      else if (text[i] === '(') depth--;
      if (depth === 0) {
        const title = text.slice(i + 1, -1).trim();
        const localTitle = text.slice(0, i).trim().replace(/[\s:–-]+$/, '');
        if (title) return { title, localTitle: localTitle || undefined, ageRating };
        break;
      }
    }
  }
  return { title: text, ageRating };
}

/** "6.6", 6.6 or "6,6" -> 6.6; anything outside 0–10 -> undefined. */
export function toScore(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim().replace(',', '.'));
  return n > 0 && n <= 10 ? Math.round(n * 10) / 10 : undefined;
}

// Columns are found by their header (the Apps Script lowercases it), so added
// or moved columns keep working: «rating» = IMDb score, «Товч агуулга» = synopsis.
function fieldBy(row: Record<string, unknown>, test: (key: string) => boolean): unknown {
  for (const [key, value] of Object.entries(row)) {
    if (test(key.trim().toLowerCase())) return value;
  }
  return undefined;
}
const isRatingKey = (key: string) =>
  (key === 'rating' || key.includes('imdb') || key.includes('үнэлгээ')) && !key.includes('холбоос') && !key.includes('link');
const isSynopsisKey = (key: string) => key.includes('агуулга') || key.includes('тайлбар') || key === 'description';

/** "2026.10.05-10.11" -> "2026-10-05" */
function weekStartFrom(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

/** Monday of the current week in Ulaanbaatar (UTC+8, no daylight saving). */
function currentWeekStart(now: Date): string {
  const ub = new Date(now.getTime() + 8 * 3600_000);
  const sinceMonday = (ub.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate() - sinceMonday))
    .toISOString()
    .slice(0, 10);
}

function isoAt(weekStart: string, dayIndex: number, time: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + dayIndex)).toISOString().slice(0, 10);
  return `${date}T${time}:00+08:00`;
}

export function extractAirings(payload: unknown, now: Date = new Date()): WeekSchedule {
  const rows = payloadRows(payload);
  if (!rows.length) return EMPTY;

  const airings: Airing[] = [];
  const endDay = new Map<Airing, number>();
  let labelIndex = -1;
  let offset = 0;
  let lastMinutes = -1;
  let open: Airing | null = null;

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;

    const label = getDayKeyFromValue(row['1'] ?? row.day ?? row.Day ?? '');
    if (label) {
      labelIndex = DAYS.indexOf(label);
      offset = 0;
      lastMinutes = -1;
    }
    if (labelIndex < 0) continue;

    const time = toTime(
      row['цаг'] ?? row.start ?? row.Start ?? row['Start Time'] ?? row.startTime ?? row['Цаг эхлэх']
    );
    if (!time) continue;
    const minutes = toMinutes(time);
    if (lastMinutes >= 0 && minutes < lastMinutes) offset += 1;
    lastMinutes = minutes;
    const dayIndex = labelIndex + offset;

    if (open) {
      open.end = time;
      endDay.set(open, dayIndex);
      open = null;
    }

    const rawTitle = String(
      row['хөтөлбөрийн нэр'] ?? row.title ?? row.Title ?? row.name ?? row.Name ?? ''
    ).trim();
    if (!rawTitle) continue; // a row with only a time marks where the last programme ends

    const airing: Airing = { dayIndex, day: DAYS[dayIndex % 7], start: time, rawTitle, ...parseProgramTitle(rawTitle) };
    const imdb = toScore(fieldBy(row, isRatingKey));
    const description = String(fieldBy(row, isSynopsisKey) ?? '').trim();
    if (imdb) airing.imdb = imdb;
    if (description) airing.description = description;
    airings.push(airing);
    open = airing;
  }

  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const weekStart = weekStartFrom(source.week) ?? currentWeekStart(now);
  for (const airing of airings) {
    airing.startsAt = isoAt(weekStart, airing.dayIndex, airing.start);
    if (airing.end) airing.endsAt = isoAt(weekStart, endDay.get(airing) ?? airing.dayIndex, airing.end);
  }
  return { weekStart, airings };
}

/**
 * This week's airings of a movie. Matches the Drive folder name (or the name
 * typed in the movie info sheet) against the English or Mongolian title in
 * the schedule, tolerating small typos ("Nigth owl", "Cindrella").
 */
export function airingsFor(schedule: WeekSchedule, ...names: (string | undefined)[]): Airing[] {
  const wanted = names.map((n) => (n ? titleKey(n) : '')).filter(Boolean);
  if (!wanted.length || !schedule.airings.length) return [];

  const byKey = new Map<string, Airing[]>();
  for (const airing of schedule.airings) {
    const keys = [titleKey(airing.title), airing.localTitle ? titleKey(airing.localTitle) : ''];
    keys.forEach((k, i) => {
      if (!k || keys.indexOf(k) !== i) return;
      const list = byKey.get(k) ?? [];
      list.push(airing);
      byKey.set(k, list);
    });
  }

  for (const key of wanted) {
    if (byKey.has(key)) return byKey.get(key) ?? [];
  }
  for (const key of wanted) {
    const close = closestKey(byKey.keys(), key);
    if (close) return byKey.get(close) ?? [];
  }
  return [];
}
