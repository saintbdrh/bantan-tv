// Film data read from CSV: the TV's own film list («Movie list монгол» in the
// BantanTV_2.0 EPG sheet, see lib/movie-library.ts) and the website's movie
// info sheet ("Bantan TV — Вэбсайтын кино мэдээлэл"). Both have one row per
// film: Mongolian title, genres, description, age rating, IMDb score, year.
// Columns are found by their header text, so either sheet works here.

import { normalizeAgeRating } from '@/lib/schedule';

export type MovieInfo = {
  /** English title (film list) or Drive folder name (movie info sheet) */
  title: string;
  /** Other names the website uses for the film (Drive folder names) */
  aliases?: string[];
  localTitle?: string;
  /** As typed, e.g. "тулаант, драм, триллер"; mapped by lib/genres.ts */
  genres?: string;
  description?: string;
  ageRating?: string;
  imdb?: number;
  year?: number;
  /** Name used in the weekly schedule, when it differs from the folder name */
  scheduleTitle?: string;
  /** Production country (film list); tells apart two films with one name */
  country?: string;
};

/** The sheet must be shared as "Anyone with the link can view". */
export const MOVIE_INFO_SHEET_ID = '1jhZbA9MN5vtNB_USmZ4UepbLe76RT48TxipRc14tD9M';
export const MOVIE_INFO_CSV_URL =
  process.env.MOVIE_INFO_CSV_URL ||
  `https://docs.google.com/spreadsheets/d/${MOVIE_INFO_SHEET_ID}/export?format=csv`;

/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Columns are found by their header text, so the team can reorder them.
const COLUMNS: [keyof MovieInfo, (header: string) => boolean][] = [
  ['title', (h) => h.startsWith('кино') || h.includes('хавтас') || h === 'title'],
  ['localTitle', (h) => h.includes('монгол')],
  // «Ангилал» = genres, but «Насны ангилал» = age rating
  ['genres', (h) => (h.includes('ангилал') || h.includes('төрөл') || h.includes('genre')) && !h.includes('нас')],
  ['description', (h) => (h.includes('тайлбар') || h.includes('агуулга')) && !h.includes('эх сурвалж')],
  ['ageRating', (h) => h.includes('нас')],
  // «IMDb оноо», not «IMDb санал» (votes) or «IMDb холбоос» (link)
  ['imdb', (h) => (h.includes('imdb') || h.includes('үнэлгээ') || h === 'rating') && !/санал|холбоос|link/.test(h)],
  ['year', (h) => h === 'он' || h.startsWith('он ') || h === 'year'],
  ['scheduleTitle', (h) => h.includes('хөтөлбөр')],
  ['country', (h) => h === 'улс' || h === 'country'],
];

/** Rows of the sheet; empty when the text is not that sheet (e.g. a sign-in page). */
export function parseMovieInfo(csv: string): MovieInfo[] {
  const rows = parseCsv(csv.replace(/^﻿/, ''));
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const column: Partial<Record<keyof MovieInfo, number>> = {};
  const taken = new Set<number>();
  for (const [field, matches] of COLUMNS) {
    const index = header.findIndex((h, i) => !taken.has(i) && matches(h));
    if (index >= 0) {
      column[field] = index;
      taken.add(index);
    }
  }
  if (column.title === undefined) return [];

  const cell = (row: string[], field: keyof MovieInfo) => {
    const index = column[field];
    return index === undefined ? '' : (row[index] ?? '').trim();
  };

  const out: MovieInfo[] = [];
  for (const row of rows.slice(1)) {
    const title = cell(row, 'title');
    if (!title) continue;
    const imdb = Number(cell(row, 'imdb').replace(',', '.'));
    const year = Number(cell(row, 'year'));
    out.push({
      title,
      localTitle: cell(row, 'localTitle') || undefined,
      genres: cell(row, 'genres') || undefined,
      description: cell(row, 'description') || undefined,
      ageRating: normalizeAgeRating(cell(row, 'ageRating')),
      imdb: imdb > 0 && imdb <= 10 ? Math.round(imdb * 10) / 10 : undefined,
      year: Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : undefined,
      scheduleTitle: cell(row, 'scheduleTitle') || undefined,
      country: cell(row, 'country') || undefined,
    });
  }
  return out;
}
