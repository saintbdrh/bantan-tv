// Matching movie titles typed by different people in different places (Drive
// folder names, the weekly schedule, the movie info sheet).

import { normalizeTitle } from '@/lib/epg';

/** Comparison key: case, punctuation, spaces and a leading "The" ignored. */
export function titleKey(title: string): string {
  return normalizeTitle(title).replace(/^the /, '').replace(/ /g, '');
}

/** Edit distance where swapping two neighbouring letters counts as one edit. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * The key in `keys` that is `wanted`, or else the only one within a small
 * typo distance ("Nigth owl" -> "night owl"). Undefined when nothing, or more
 * than one thing, is that close.
 */
export function closestKey(keys: Iterable<string>, wanted: string): string | undefined {
  const all = Array.from(keys);
  if (all.includes(wanted)) return wanted;
  const allowed = wanted.length >= 9 ? 2 : wanted.length >= 5 ? 1 : 0;
  if (!allowed) return undefined;
  let best: string | undefined;
  let bestDistance = Infinity;
  let tied = false;
  for (const candidate of all) {
    if (Math.abs(candidate.length - wanted.length) > allowed) continue;
    const distance = editDistance(candidate, wanted);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  }
  return best !== undefined && bestDistance <= allowed && !tied ? best : undefined;
}
