#!/usr/bin/env python3
"""Builds lib/movie-library-data.ts, the copy of the TV's film list that ships
with the site, from an .xlsx export of the «BantanTV_2.0 EPG» Google Sheet:

  * «Movie list монгол»: English and Mongolian title, genres («Ангилал»),
    year, age rating, IMDb score and synopsis («Товч агуулга») of each film;
  * the weekly schedule tabs (YYYY.MM.DD-MM.DD): their «rating» (IMDb) and
    «Товч агуулга» columns fill in what the film list lacks.

Usage: python3 scripts/build-movie-library.py "BantanTV_2.0 EPG.xlsx"
(File → Download → Microsoft Excel in Google Sheets). Needs openpyxl.
"""
import json, re, sys
from datetime import date
import openpyxl

OUT = 'lib/movie-library-data.ts'
LIBRARY_TAB = 'Movie list монгол'
# Website names (Drive folder names) that are too far from the film list's
# English title to be matched automatically.
ALIASES = {
    'THE ROUNDUP: NO WAY OUT': ['the Roundup 3'],
    'THE HUNGER GAMES: BALLAD OF SONGBIRDS AND SNAKES': ['Hunger Games Ballad of Songbirds Snakes'],
    'COBWEB (South Korea)': ['Cobweb kr', 'COBWEB (KOREA)', 'COBWEB korean'],
}


def norm(s):
    s = str(s or '').lower().replace('&', ' and ')
    s = re.sub(r'[^a-z0-9\u0080-￿]+', ' ', s).strip()
    return re.sub(r'\s+', ' ', s)


def key(s):
    return re.sub(r'^the ', '', norm(s)).replace(' ', '')


def dist(a, b):
    d = [[i] + [0] * len(b) for i in range(len(a) + 1)]
    for j in range(len(b) + 1):
        d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
    return d[-1][-1]


def closest(keys, wanted):
    if wanted in keys:
        return wanted
    allowed = 2 if len(wanted) >= 9 else 1 if len(wanted) >= 5 else 0
    near = sorted((dist(k, wanted), k) for k in keys if abs(len(k) - len(wanted)) <= allowed)
    near = [n for n in near if n[0] <= allowed]
    if near and (len(near) == 1 or near[0][0] < near[1][0]):
        return near[0][1]
    return None


def text(v):
    return '' if v is None else str(v).strip()


def score(v):
    try:
        x = float(str(v).replace(',', '.'))
    except ValueError:
        return None
    return round(x, 1) if 0 < x <= 10 else None


def age(v):
    m = re.search(r'\d{1,2}', text(v))
    return '+' + m.group(0) if m else None


def header_index(header, test):
    for i, h in enumerate(header):
        if test(text(h).lower()):
            return i
    return None


def parse_program(raw):
    """'Аалзны тор ( COBWEB (KOREA) ) +18' -> ('COBWEB (KOREA)', 'Аалзны тор')."""
    s = re.sub(r'[\\|]+$', '', text(raw)).strip()
    m = re.search(r'(\+\s*\d{1,2}|\d{1,2}\s*\+)\s*$', s)
    if m:
        s = s[:m.start()].strip()
    if s.endswith(')'):  # the last bracket group, which may itself hold brackets
        depth = 0
        for i in range(len(s) - 1, -1, -1):
            depth += {')': 1, '(': -1}.get(s[i], 0)
            if depth == 0:
                return s[i + 1:-1].strip(), s[:i].strip(' :–-')
    if not re.search('[\u0400-\u04ff]', s):
        return s, ''
    return '', s


wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
rows = list(wb[LIBRARY_TAB].iter_rows(values_only=True))
h = [text(x).lower() for x in rows[0]]
col = {
    'title': header_index(h, lambda x: x.startswith('кино')),
    'localTitle': header_index(h, lambda x: x.startswith('монгол')),
    'genres': header_index(h, lambda x: 'ангилал' in x and 'нас' not in x),
    'year': header_index(h, lambda x: x == 'он'),
    'ageRating': header_index(h, lambda x: 'нас' in x),
    'imdb': header_index(h, lambda x: 'imdb' in x and 'санал' not in x and 'холбоос' not in x),
    'description': header_index(h, lambda x: 'агуулга' in x),
    'country': header_index(h, lambda x: x == 'улс'),
}
films, seen = [], set()
for r in rows[1:]:
    title = text(r[col['title']])
    if not title:
        continue
    if key(title) in seen:  # two films with one name (COBWEB): tell them apart by country
        title = '%s (%s)' % (title, text(r[col['country']]))
    seen.add(key(title))
    year = r[col['year']]
    film = {
        'title': title,
        'localTitle': text(r[col['localTitle']]) or None,
        'genres': text(r[col['genres']]) or None,
        'year': int(year) if isinstance(year, (int, float)) and 1900 <= year <= 2100 else None,
        'ageRating': age(r[col['ageRating']]),
        'imdb': score(r[col['imdb']]),
        'description': text(r[col['description']]) or None,
    }
    if title in ALIASES:
        film['aliases'] = ALIASES[title]
    films.append(film)

by_en = {key(f['title']): f for f in films}
for f in films:
    for a in f.get('aliases', []):
        by_en[key(a)] = f
by_mn = {key(f['localTitle']): f for f in films if f['localTitle']}
added = filled = 0
for ws in wb.worksheets:
    if not re.fullmatch(r'\d{4}\.\d{2}\.\d{2}-\d{2}\.\d{2}', ws.title.strip()):
        continue
    tab = list(ws.iter_rows(values_only=True))
    h = [text(x).lower() for x in tab[0]]
    name_i = header_index(h, lambda x: 'хөтөлбөр' in x)
    rate_i = header_index(h, lambda x: x == 'rating' or ('imdb' in x and 'холбоос' not in x))
    desc_i = header_index(h, lambda x: 'агуулга' in x)
    if name_i is None or (rate_i is None and desc_i is None):
        continue
    for r in tab[1:]:
        en, mn = parse_program(r[name_i])
        if not (en or mn) or norm(mn) == 'нөхөлт':
            continue
        rating = score(r[rate_i]) if rate_i is not None else None
        desc = text(r[desc_i]) if desc_i is not None else ''
        if not rating and not desc:
            continue
        k = closest(list(by_en), key(en)) if en else None
        film = by_en.get(k) if k else by_mn.get(key(mn)) if mn else None
        if film is None:
            film = {'title': en or mn, 'localTitle': mn or None, 'genres': None, 'year': None,
                    'ageRating': None, 'imdb': None, 'description': None}
            films.append(film)
            by_en[key(film['title'])] = film
            if mn:
                by_mn[key(mn)] = film
            added += 1
        if rating and not film['imdb']:
            film['imdb'] = rating
            filled += 1
        if desc and not film['description']:
            film['description'] = desc
            filled += 1

films.sort(key=lambda f: norm(f['title']))
clean = [{k: v for k, v in f.items() if v not in (None, '', [])} for f in films]
with open(OUT, 'w', encoding='utf-8') as out:
    out.write('// Generated by scripts/build-movie-library.py on %s from the «BantanTV_2.0 EPG»\n' % date.today())
    out.write('// sheet («%s» plus the IMDb scores and synopses of the weekly schedule tabs).\n' % LIBRARY_TAB)
    out.write('// Do not edit by hand: edit the sheet, then rerun the script (see lib/movie-library.ts).\n')
    out.write("import type { MovieInfo } from '@/lib/movie-info';\n\n")
    out.write('export const BUILT_IN_LIBRARY: MovieInfo[] = %s;\n' % json.dumps(clean, ensure_ascii=False, indent=1))
print('films', len(clean), 'from weekly tabs: %d new, %d fields filled' % (added, filled))
print('with genres', sum(1 for f in clean if f.get('genres')), 'imdb', sum(1 for f in clean if f.get('imdb')),
      'description', sum(1 for f in clean if f.get('description')))
