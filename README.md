# Bantan TV

Next.js streaming site for Bantan TV — Figma design implementation.

## Quick start

```bash
npm install
cp .env.example .env.local       # optional local settings (no secrets in .env files)
cp .dev.vars.example .dev.vars   # settings for `npm run preview` (incl. a local AUTH_SECRET)
npm run db:migrate:local         # creates the local D1 database (once)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run preview` runs the production build inside the Cloudflare Workers runtime (http://localhost:8787).

## Hosting: Cloudflare Workers

The site runs on Cloudflare Workers through [OpenNext](https://opennext.js.org/cloudflare) (previously Vercel). Setup and DNS cutover steps: **[docs/CLOUDFLARE_MIGRATION.md](docs/CLOUDFLARE_MIGRATION.md)**.

| Piece | Where it lives |
|---|---|
| Pages + API routes | Worker `bantan-tv` (`wrangler.jsonc`, entry `custom-worker.ts`) |
| Page / Sheet cache (ISR, 5 min) | R2 bucket `bantan-tv-next-cache` + Durable Object queue (`open-next.config.ts`) |
| Accounts + ad bookings | D1 database `bantan-tv-db` (`migrations/`) |
| Poster resizing (`next/image`) | Cloudflare Images binding, cached at the edge for a day |
| Trailers, R2-only movies | R2 bucket `bantan-data`, read through the `MEDIA_BUCKET` binding (`lib/r2.ts`); the `bantan-tv-video-api` Worker is the fallback during the build |

Deploys run automatically from GitHub (Workers Builds): build command `npx opennextjs-cloudflare build`, deploy command `npx opennextjs-cloudflare deploy`. Manual deploy: `npm run deploy`.

Settings are Worker variables/secrets (dashboard → Worker → Settings → Variables and Secrets); the full list is in `.env.example`. After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen`.

## EPG + Media API

Configured in `lib/epg.ts`:

```
https://script.google.com/macros/s/AKfycbzkouzKciSgXM4HARmTD7kt24Rsq5eIBHzFSGdtyLJsOQqo_Y30Q8JGOhfuFFCIR0nOLg/exec?with_media=1
```

- `?with_media=1` — weekly EPG + poster/backdrop/trailer per row  
- `?media=all` — full Drive media catalog  

See **[docs/MEDIA_FOLDER_GUIDE.md](docs/MEDIA_FOLDER_GUIDE.md)** for Drive folder layout.

### When a movie airs (`lib/schedule.ts`)

The movie page lists this week's broadcasts with exact times, read from the same schedule response. Each row's `цаг` is the programme's start time and it runs until the next row starts; times that go backwards belong to the next day (after midnight). Names look like `Феррари ( FERRARI ) +12`: the English title in brackets is matched to the Drive folder name (case, punctuation, a leading "The" and small typos such as "Nigth owl" are ignored), the Mongolian title and age rating are shown too. If a folder name differs too much from the schedule name, put the schedule name in the movie info sheet's «Хөтөлбөр дээрх нэр» column.

### Film data: genres, synopsis, IMDb (`lib/movie-library.ts`, `lib/movie-info.ts`)

Each movie's genres, Mongolian title, synopsis, age rating, IMDb score and year come from, in this order:

1. **The TV's film list** — tab «Movie list монгол» of the «BantanTV_2.0 EPG» sheet (genres «Ангилал», synopsis «Товч агуулга», «IMDb оноо», «Насны ангилал», «Он»). A copy ships with the site in `lib/movie-library-data.ts`, so it works without any sharing setting. Refresh the copy after big changes to the list: download the sheet as .xlsx and run `python3 scripts/build-movie-library.py "BantanTV_2.0 EPG.xlsx"`, then deploy. To follow the list live instead, publish that one tab (File → Share → Publish to web → «Movie list монгол» → CSV) and set `MOVIE_LIBRARY_CSV_URL` to the link.
2. **The weekly schedule** — from the week of 2026-10-12 the schedule tabs have «rating» (IMDb) and «Товч агуулга» columns, read for every movie that airs that week. The age rating is taken from the schedule first (the rating the channel broadcasts with).
3. **The website's movie info sheet** — "Bantan TV — Вэбсайтын кино мэдээлэл" (drafted descriptions for the team to review), read only when shared as "Anyone with the link can view" (`MOVIE_INFO_CSV_URL`).
4. `lib/catalog.ts` and the schedule's category, as before.

Genre names are mapped in `lib/genres.ts` (the channel's spellings, e.g. «тулаант» → Adventure, «драм» → Drama). `lib/genre-overrides.ts` still wins for a single movie. Films are matched by title, tolerating small typos; names too different to match (e.g. the Drive folder "the Roundup 3") are listed in `ALIASES` in the build script.

## Design

Figma tokens: background `#050505`, accent `#FF2000`, brand stripes orange/yellow/cyan, container `1440px`.

Pages: Home, Кино, Цуврал, Нэвтрүүлэг, Хөтөлбөр, Шууд, About, Advertise, Auth, Movie detail — all share Navbar, Footer, and the same dark UI system.


## Auth & bookings

- **Auth**: accounts in the D1 table `users`, httpOnly session cookie (`bantan_session`, HMAC-signed with `AUTH_SECRET`). APIs: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`. `AUTH_SECRET` is required in production — without it login/sign-up refuse to run.
- **Ad bookings**: `POST /api/bookings` saves to the D1 table `bookings` first, then forwards to `BOOKING_WEBHOOK_URL` (Apps Script / email worker) when set and records the result in `status`. TVC video is **not** uploaded — only the chosen file name is stored.
- Read the data in the Cloudflare dashboard (D1 → bantan-tv-db → Console), e.g. `SELECT * FROM bookings ORDER BY created_at DESC;`
- Canonical auth routes: `/login`, `/signup` (`/auth` redirects to `/login`).
- `/search` and `/watch/[id]` are live routes.

## Performance & media (v2)

- **Caching**: Apps Script responses are cached for 5 minutes (`EPG_REVALIDATE_SECONDS` in `lib/epg.ts`). Edits in the Sheet appear on the site within that time; pages are pre-rendered instead of waiting on Google for every visit.
- **Schedule time**: "Now on air" and the live highlight always use Ulaanbaatar time (UTC+8), also on servers running in UTC.
- **Images**: posters and hero backdrops use `next/image` (resized to WebP, lazy-loaded) via the Cloudflare Images binding; each resized copy is cached at the edge for a day (`custom-worker.ts`). Allowed hosts live in `next.config.mjs` and `lib/images.ts`; unknown hosts are shown unoptimized rather than failing. Widths are limited (`deviceSizes`/`imageSizes`) to keep within the 5,000 free transformations a month.
- **Trailers**: the hero waits for its image, then plays the trailer; it pauses when scrolled away or the tab is hidden, and is skipped for reduced-motion / data-saver users.
  - Sound is on, with no mute button (`lib/sound.ts`). Each trailer first tries to start with sound. Browsers that refuse sound before the visitor interacts with the page (most phones and Safari) play it muted, and the first tap, click or key press anywhere turns sound on.
  - R2 trailers (bucket `bantan-data`) are used first: a movie's own folder (`movies/<title>/`), then the web-size copy in `web/`, then the original upload in `bantan/`. Set `R2_PUBLIC_URL` to the bucket's custom domain (e.g. `https://media.bantan.tv`) so they are served from it instead of the rate-limited `*.r2.dev` address.
  - Movies can be added without Google Drive: a folder `movies/<Movie title>/` in the bucket with a poster, a wide image and a trailer (see [docs/MEDIA_FOLDER_GUIDE.md](docs/MEDIA_FOLDER_GUIDE.md#adding-a-movie-without-google-drive-cloudflare-r2)). Keep trailers web-size (720p, 10–30 MB) so the bucket stays within the free 10 GB.
  - Best quality: host your own `.mp4` files and set `MEDIA_BASE_URL` (see `.env.example`). The site looks for `<MEDIA_BASE_URL>/trailers/<movie-id>.mp4`, where `<movie-id>` is the slug in the `/movie/<id>` URL. Titles without a file fall back to the Drive/YouTube trailer.
  - Encode trailers as H.264 mp4, about 720p, under ~8 MB, with `-movflags +faststart` so they start instantly.

## Trailers: skipping the blank intro, swipe, auto-advance (v3)

- **Blank first seconds on Drive trailers**: the Drive `/preview` player cannot start at a chosen second, so the site now tries to stream the Drive file in a normal `<video>` and jumps past the intro (`DRIVE_SKIP_SECONDS` in `lib/trailer.ts`, default 3; override with `NEXT_PUBLIC_DRIVE_TRAILER_SKIP_SECONDS`, `0` disables). If Drive refuses to stream a file, it silently falls back to the old Drive player (which still shows the blank intro).
- **Permanent fix**: cut the intro off the files themselves. Re-encode (not `-c copy`) so the cut is exact:
  `ffmpeg -ss 3 -i in.mp4 -c:v libx264 -crf 22 -c:a aac -movflags +faststart out.mp4`
  Own-hosted files (`MEDIA_BASE_URL`) are never skipped, so trimmed files play from 0:00.
- **Hero**: stops as soon as you scroll down, moves to the next slide when a trailer ends (20 s timer for Drive-player/YouTube fallbacks, which cannot report their end), swipe left/right on phones.
- **Genres**: `lib/genres.ts` holds the genre list (Mongolian labels + English/Mongolian spellings the sheet may use). The site reads the sheet's category/genre column and maps it. For titles the sheet does not cover, add them in `lib/genre-overrides.ts`.
