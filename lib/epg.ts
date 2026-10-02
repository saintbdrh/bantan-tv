// Shared EPG data layer.
// Both the schedule page (BantanEpg) and the movie catalog (lib/movies.ts)
// read from the same Google Sheet endpoint through this module, so a title
// only has to be typed once in the sheet to show up everywhere.

export type DayKey = 'Даваа' | 'Мягмар' | 'Лхагва' | 'Пүрэв' | 'Баасан' | 'Бямба' | 'Ням';

export type EpgItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  description: string;
  category: string;
  image: string;
  youtubeId?: string;
  imdbUrl?: string;
  // Direct URL to your own hosted trailer file (e.g. a Vercel Blob URL).
  // When present this always wins over the YouTube fallback.
  trailerUrl?: string;
  // Widescreen hero/backdrop image, when the sheet provides one separately
  // from the poster (e.g. a "WIDE"/"BANNER" file in your Drive folder).
  backdropUrl?: string;
};

export const DAYS: DayKey[] = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

// ?with_media=1 makes the Apps Script attach poster + trailer (from the Drive
// MediaIndex) to every row. If you create a NEW deployment, its URL changes:
// paste the new /exec URL here.
// How long the server may reuse the Google Apps Script response. Schedule
// edits in the Sheet show up on the site within this many seconds.
export const EPG_REVALIDATE_SECONDS = 300;

export const EPG_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzkouzKciSgXM4HARmTD7kt24Rsq5eIBHzFSGdtyLJsOQqo_Y30Q8JGOhfuFFCIR0nOLg/exec?with_media=1';

// Google Drive "/preview" links are embed pages, not video files: they must
// go in an <iframe>, not a <video> tag.
export function isEmbedUrl(url?: string): boolean {
  return !!url && /drive\.google\.com\/file\/d\/.+\/preview/.test(url);
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80';

export const FALLBACK_EPG: Record<DayKey, EpgItem[]> = {
  Даваа: [
    { id: 'd1', title: 'Сануулах бүлэг', start: '01:00', end: '03:00', description: 'Өдрийн анхны киноны анхны цуврал, хөнгөн, сэтгэл сэргээх аястай.', category: 'Кино', image: FALLBACK_IMAGE },
    { id: 'd2', title: 'Бүжин', start: '03:15', end: '05:30', description: 'Мэндэлсэн түүх, хүсэл эрмэлзлийн замыг даган явдаг сонирхолтой нэвтрүүлэг.', category: 'Цуврал', image: FALLBACK_IMAGE },
    { id: 'd3', title: 'Миний нүдний өмнө', start: '06:00', end: '08:00', description: 'Бүтээлчдийн дотоод туршлага, уран сайхны бичлэгүүд.', category: 'Баримтат', image: FALLBACK_IMAGE },
    { id: 'd4', title: 'Нүүрэн дээрх зам', start: '09:00', end: '11:00', description: 'Дэлхийн хамгийн сүүлийн үеийн кино, зураачдын бүтээлийг тоймлон үзүүлнэ.', category: 'Кино', image: FALLBACK_IMAGE },
    { id: 'd5', title: 'Шөнийн хөтөлбөр', start: '19:30', end: '22:00', description: 'Өглөөний харанхуйгаас шөнийн уур амьсгал руу шилждэг онцгой ярилцлага.', category: 'Шоу', image: FALLBACK_IMAGE },
    { id: 'd6', title: 'Найруулагчийн сонголт', start: '22:30', end: '00:00', description: 'Найруулагчийн сонгосон онцлох дүрүүд, нэр хүндтэй уран бүтээлүүд.', category: 'Кино', image: FALLBACK_IMAGE },
  ],
  Мягмар: [],
  Лхагва: [],
  Пүрэв: [],
  Баасан: [],
  Бямба: [],
  Ням: [],
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

// The schedule is broadcast in Ulaanbaatar time. Servers (Vercel) run in UTC,
// so never use the machine's local clock here.
const UB_TIME_ZONE = 'Asia/Ulaanbaatar';
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function getUlaanbaatarParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UB_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    day: WEEKDAY_INDEX[get('weekday')] ?? 0,
    hours: Number(get('hour')) % 24,
    minutes: Number(get('minute')),
  };
}

export function getCurrentDayIndex(date: Date = new Date()) {
  return getUlaanbaatarParts(date).day;
}

export function getCurrentMinutes(date: Date = new Date()) {
  const { hours, minutes } = getUlaanbaatarParts(date);
  return hours * 60 + minutes;
}

export function getDurationMinutes(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (endMinutes <= startMinutes) {
    return 24 * 60 - startMinutes + endMinutes;
  }
  return endMinutes - startMinutes;
}

export function getActiveShowForDay(
  scheduleSource: Record<DayKey, EpgItem[]>,
  day: DayKey,
  nowMinutes: number
) {
  const schedule = scheduleSource[day] ?? [];

  const active = schedule.find((item) => {
    const start = timeToMinutes(item.start);
    const end = timeToMinutes(item.end);

    if (end <= start) {
      return nowMinutes >= start || nowMinutes < end;
    }

    return nowMinutes >= start && nowMinutes < end;
  });

  if (active) {
    return active;
  }

  const next = schedule.find((item) => timeToMinutes(item.start) > nowMinutes);
  return next ?? schedule[0] ?? null;
}

function formatTimeValue(value: unknown): string {
  if (typeof value === 'number') {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  return trimmed;
}

function getYouTubeId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const trimmed = value.trim();
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || undefined;
    }

    if (url.hostname.endsWith('youtube.com')) {
      return url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean).pop();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getImdbUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.includes('imdb.com/title/')) {
    return undefined;
  }

  return value.trim();
}

// A direct link to a hosted video file (mp4/webm/etc), as opposed to a
// YouTube link/ID. Anything that isn't a bare 11-char YouTube ID and isn't
// a youtube.com/youtu.be URL is treated as a direct trailer file URL.
function getTrailerUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be' || url.hostname.endsWith('youtube.com')) {
      return undefined;
    }
    return trimmed;
  } catch {
    return undefined;
  }
}

function getDayKeyFromValue(value: unknown): DayKey | null {
  if (typeof value === 'string') {
    const cleaned = value.trim();
    const mapped = DAY_ALIASES[cleaned] ?? DAY_ALIASES[cleaned.toLowerCase()];
    if (mapped) {
      return mapped;
    }

    const parsedDate = new Date(cleaned);
    if (!Number.isNaN(parsedDate.getTime())) {
      const weekday = parsedDate.getDay();
      return WEEKDAY_MAP[weekday] ?? null;
    }
  }

  if (value instanceof Date) {
    const weekday = value.getDay();
    return WEEKDAY_MAP[weekday] ?? null;
  }

  return null;
}

function parseSheetRow(raw: unknown): Partial<EpgItem & { day?: string }> | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const title = String(row.title ?? row.Title ?? row.name ?? row.Name ?? row['хөтөлбөрийн нэр'] ?? '').trim();
  const start = formatTimeValue(row.start ?? row.Start ?? row['Start Time'] ?? row.startTime ?? row['Цаг эхлэх'] ?? row['огноо'] ?? '');
  const end = formatTimeValue(row.end ?? row.End ?? row['End Time'] ?? row.endTime ?? row['Цаг дуусах'] ?? row['цаг'] ?? '');
  const description = String(row.description ?? row.Description ?? row.summary ?? row['Тайлбар'] ?? row['товч агуулга'] ?? '').trim();
  const category = String(row.category ?? row.Category ?? row.Genre ?? row.genre ?? row.type ?? row['Төрөл'] ?? '').trim();
  const image = String(row.image ?? row.Image ?? row.thumbnail ?? row.poster ?? row.Poster ?? '').trim();
  const youtubeId = getYouTubeId(
    row.youtubeId ?? row.youtubeID ?? row.youtube ?? row.YouTube ?? row['YouTube трейлер']
    ?? row['холбоос /контентийн нэр/'] ?? row['холбоос'] ?? ''
  );
  // Drive trailer from with_media=1, or sheet column
  const trailerUrl = getTrailerUrl(row.trailer ?? row.Trailer ?? row.trailerUrl ?? row['Трейлер'] ?? '');
  const backdropUrl = String(row.backdrop ?? row.Backdrop ?? row.wide ?? row.banner ?? '').trim() || undefined;
  const imdbUrl = getImdbUrl(row.imdb ?? row.IMDb ?? row['IMDb'] ?? row['холбоос /контентийн нэр/'] ?? '');
  const dateValue = row.Date ?? row.date ?? row.day ?? row.Day ?? row['Date'] ?? row['1'];

  if (!title || !start || !end) {
    return null;
  }

  return {
    id: String(row.id ?? row.ID ?? `${title}-${start}-${end}`),
    title,
    start,
    end,
    description: description || 'BANTAN TV-н хөтөлбөр',
    category: category || 'BANTAN TV',
    image: image || FALLBACK_IMAGE,
    youtubeId,
    trailerUrl,
    backdropUrl,
    imdbUrl,
    day: getDayKeyFromValue(dateValue) ?? undefined,
  };
}

export function normalizeEpgPayload(payload: unknown): Record<DayKey, EpgItem[]> {
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const rows: unknown[] = [];

  if (Array.isArray(payload)) {
    rows.push(...payload);
  } else if (source) {
    const possibleArrays = [source.data, source.rows, source.items, source.records, source.schedule, source.epg];
    for (const candidate of possibleArrays) {
      if (Array.isArray(candidate)) {
        rows.push(...candidate);
      }
    }

    if (!rows.length && typeof source.values === 'object' && source.values) {
      rows.push(...(source.values as unknown[]));
    }
  }

  if (!rows.length) {
    return FALLBACK_EPG;
  }

  const normalized: Record<DayKey, EpgItem[]> = {
    Даваа: [], Мягмар: [], Лхагва: [], Пүрэв: [], Баасан: [], Бямба: [], Ням: [],
  };

  let currentDay: DayKey | null = null;
  const lastRowByDay: Partial<Record<DayKey, EpgItem>> = {};

  rows.forEach((row) => {
    const parsed = Array.isArray(row)
      ? {
          id: row[0], title: row[1], start: row[2], end: row[3],
          description: row[4], category: row[5], image: row[6],
          youtubeId: undefined, trailerUrl: undefined, backdropUrl: undefined, imdbUrl: undefined, day: row[7],
        }
      : parseSheetRow(row);

    const item = {
      id: String(parsed?.id ?? ''),
      title: String(parsed?.title ?? '').trim(),
      start: formatTimeValue(parsed?.start ?? ''),
      end: formatTimeValue(parsed?.end ?? ''),
      description: String(parsed?.description ?? '').trim(),
      category: String(parsed?.category ?? '').trim(),
      image: String(parsed?.image ?? '').trim(),
    };

    if (!item.title || !item.start || !item.end) {
      return;
    }

    const dayKeyFromRow = typeof row === 'object' && row && 'day' in (row as Record<string, unknown>)
      ? getDayKeyFromValue((row as Record<string, unknown>).day ?? (row as Record<string, unknown>).Day ?? '')
      : typeof parsed === 'object' && parsed && 'day' in parsed
        ? getDayKeyFromValue((parsed as Record<string, unknown>).day ?? '')
        : null;

    const mappedDay = dayKeyFromRow
      ?? getDayKeyFromValue((row as Record<string, unknown>)?.Date ?? (row as Record<string, unknown>)?.date ?? '')
      ?? currentDay;
    if (!mappedDay) {
      return;
    }

    currentDay = mappedDay;

    const cleanItem: EpgItem = {
      id: item.id || `${mappedDay}-${item.title}-${item.start}`,
      title: item.title,
      start: item.start,
      end: item.end,
      description: item.description || 'BANTAN TV-н хөтөлбөр',
      category: item.category || 'BANTAN TV',
      image: item.image || FALLBACK_IMAGE,
      youtubeId: parsed && !Array.isArray(row) ? parsed.youtubeId : undefined,
      trailerUrl: parsed && !Array.isArray(row) ? parsed.trailerUrl : undefined,
      backdropUrl: parsed && !Array.isArray(row) ? parsed.backdropUrl : undefined,
      imdbUrl: parsed && !Array.isArray(row) ? parsed.imdbUrl : undefined,
    };

    const rawEnd = typeof row === 'object' && row ? (row as Record<string, unknown>)['цаг'] : undefined;
    const normalizedEnd = rawEnd ? roundScheduleTime(formatTimeValue(rawEnd)) : cleanItem.end;
    const previousItem = lastRowByDay[mappedDay];
    cleanItem.start = previousItem?.end ?? '00:00';
    cleanItem.end = normalizedEnd > cleanItem.start ? normalizedEnd : cleanItem.end;

    if (previousItem && timeToMinutes(cleanItem.start) < timeToMinutes(previousItem.start)) {
      return;
    }

    normalized[mappedDay].push(cleanItem);
    lastRowByDay[mappedDay] = cleanItem;
  });

  Object.values(normalized).forEach((dayItems) => {
    dayItems.forEach((item, index) => {
      const nextBoundary = dayItems[index + 1]?.end;
      item.start = index === 0 ? '00:00' : dayItems[index - 1].end;
      if (nextBoundary) {
        item.end = nextBoundary;
      }
    });
  });

  return Object.values(normalized).some((dayItems) => dayItems.length) ? normalized : FALLBACK_EPG;
}

function roundScheduleTime(value: string): string {
  const minutes = timeToMinutes(value);
  const roundedHours = Math.floor((minutes + 30) / 60) % 24;
  return `${String(roundedHours).padStart(2, '0')}:00`;
}

const WEEKDAY_MAP: Record<number, DayKey> = {
  1: 'Даваа', 2: 'Мягмар', 3: 'Лхагва', 4: 'Пүрэв', 5: 'Баасан', 6: 'Бямба', 0: 'Ням',
};

const DAY_ALIASES: Record<string, DayKey> = {
  monday: 'Даваа', mon: 'Даваа', даваа: 'Даваа',
  tuesday: 'Мягмар', tue: 'Мягмар', мягмар: 'Мягмар',
  wednesday: 'Лхагва', wed: 'Лхагва', лхагва: 'Лхагва',
  thursday: 'Пүрэв', thu: 'Пүрэв', пүрэв: 'Пүрэв',
  friday: 'Баасан', fri: 'Баасан', баасан: 'Баасан',
  saturday: 'Бямба', sat: 'Бямба', бямба: 'Бямба',
  sunday: 'Ням', sun: 'Ням', ням: 'Ням',
};

// Server-side fetch (used by lib/movies.ts and any server component that
// needs the schedule). Always returns a full week, falling back to the
// bundled placeholder schedule if the sheet is unreachable.
export async function fetchEpgData(): Promise<Record<DayKey, EpgItem[]>> {
  try {
    const response = await fetch(EPG_ENDPOINT, {
      next: { revalidate: EPG_REVALIDATE_SECONDS },
      headers: { Accept: 'application/json, text/plain, */*' },
    });

    if (!response.ok) {
      throw new Error(`EPG fetch failed with status ${response.status}`);
    }

    const payload = await response.text();
    return normalizeEpgPayload(JSON.parse(payload));
  } catch (error) {
    console.warn('Google EPG endpoint unavailable; using fallback schedule.', error);
    return FALLBACK_EPG;
  }
}

// Matches the Apps Script `norm()` helper so Drive folder names and EPG
// Title cells resolve the same way (case, punctuation, "&" vs "and").
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\u0080-\uffff]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export type AirTime = { day: DayKey; start: string; end: string };

// Every scheduled slot across the week for a given title, in day order.
export function getAirTimesForTitle(epgData: Record<DayKey, EpgItem[]>, title: string): AirTime[] {
  const target = normalizeTitle(title);
  const results: AirTime[] = [];

  DAYS.forEach((day) => {
    (epgData[day] ?? []).forEach((item) => {
      if (normalizeTitle(item.title) === target) {
        results.push({ day, start: item.start, end: item.end });
      }
    });
  });

  return results;
}

// ====== Real movie/media list (Drive, via the same Apps Script) ======

export type MediaEntry = {
  title: string;
  poster: string | null;
  backdrop: string | null;
  trailer: string | null;
};

// The deployment serves poster/backdrop/trailer for every movie folder in
// Drive at ?media=all (see Code.gs -> mediaResponse). EPG_ENDPOINT already
// carries ?with_media=1, so swap the query rather than appending to it.
function getMediaListUrl(): string {
  return `${EPG_ENDPOINT.split('?')[0]}?media=all`;
}

// This is the real movie catalog: whatever folders actually exist in your
// Drive "Bantan web" folder, not a hand-written list. Returns [] (rather
// than made-up placeholder movies) if the sheet/script is unreachable.
export async function fetchAllMedia(): Promise<MediaEntry[]> {
  try {
    const response = await fetch(getMediaListUrl(), {
      next: { revalidate: EPG_REVALIDATE_SECONDS },
      headers: { Accept: 'application/json, text/plain, */*' },
    });

    if (!response.ok) {
      throw new Error(`Media list fetch failed with status ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload)
      ? payload.filter((item): item is MediaEntry => !!item && typeof item.title === 'string' && item.title.trim().length > 0)
      : [];
  } catch (error) {
    console.warn('Drive media list unavailable.', error);
    return [];
  }
}
