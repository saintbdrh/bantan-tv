// The TV's own film list: «Movie list монгол» in the «BantanTV_2.0 EPG» Google
// Sheet, which the channel keeps for every film it owns (Mongolian title,
// genres «Ангилал», year, age rating, IMDb score, synopsis «Товч агуулга»).
//
// A copy ships with the site (lib/movie-library-data.ts, made by
// scripts/build-movie-library.py), so genres and synopses work without any
// sharing settings. To have the site follow the sheet live instead, publish
// that one tab (File → Share → Publish to web → «Movie list монгол» → CSV)
// and set MOVIE_LIBRARY_CSV_URL to the link: live rows then win and the copy
// only fills gaps.

import { BUILT_IN_LIBRARY } from '@/lib/movie-library-data';
import type { MovieInfo } from '@/lib/movie-info';
import { closestKey, titleKey } from '@/lib/titles';

export const MOVIE_LIBRARY_CSV_URL = process.env.MOVIE_LIBRARY_CSV_URL || '';

/** Live rows laid over the built-in copy: live values win, the copy fills the gaps. */
export function mergeLibrary(live: MovieInfo[], builtIn: MovieInfo[] = BUILT_IN_LIBRARY): MovieInfo[] {
  const merged = builtIn.map((row) => ({ ...row }));
  const index = new Map(merged.map((row, i) => [titleKey(row.title), i]));
  const seen = new Set<string>();
  for (const row of live) {
    // Two films with one name (COBWEB, USA and South Korea): the second is
    // known by its country, as in the built-in copy.
    let title = row.title;
    if (seen.has(titleKey(title)) && row.country) title = `${title} (${row.country})`;
    seen.add(titleKey(row.title));

    const key = closestKey(index.keys(), titleKey(title));
    if (key === undefined) {
      index.set(titleKey(title), merged.length);
      merged.push({ ...row, title });
      continue;
    }
    const target = merged[index.get(key)!] as Record<string, unknown>;
    for (const [field, value] of Object.entries(row)) {
      if (field !== 'title' && field !== 'aliases' && value !== undefined && value !== '') target[field] = value;
    }
  }
  return merged;
}

/** Finds a film's row by its title or alias, tolerating small typos ("Nigth owl"). */
export function rowFinder(rows: MovieInfo[]): (...names: (string | undefined)[]) => MovieInfo | undefined {
  const byKey = new Map<string, MovieInfo>();
  for (const row of rows) {
    for (const name of [row.title, ...(row.aliases ?? [])]) {
      const key = titleKey(name);
      if (key && !byKey.has(key)) byKey.set(key, row);
    }
  }
  return (...names) => {
    for (const name of names) {
      const key = name ? closestKey(byKey.keys(), titleKey(name)) : undefined;
      if (key) return byKey.get(key);
    }
    return undefined;
  };
}
