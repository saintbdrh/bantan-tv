# Bantan TV

Next.js streaming site for Bantan TV — Figma design implementation.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## EPG + Media API

Configured in `lib/epg.ts`:

```
https://script.google.com/macros/s/AKfycbzkouzKciSgXM4HARmTD7kt24Rsq5eIBHzFSGdtyLJsOQqo_Y30Q8JGOhfuFFCIR0nOLg/exec?with_media=1
```

- `?with_media=1` — weekly EPG + poster/backdrop/trailer per row  
- `?media=all` — full Drive media catalog  

See **[docs/MEDIA_FOLDER_GUIDE.md](docs/MEDIA_FOLDER_GUIDE.md)** for Drive folder layout.

## Design

Figma tokens: background `#050505`, accent `#FF2000`, brand stripes orange/yellow/cyan, container `1440px`.

Pages: Home, Кино, Цуврал, Нэвтрүүлэг, Хөтөлбөр, Шууд, About, Advertise, Auth, Movie detail — all share Navbar, Footer, and the same dark UI system.


## Auth & bookings

- **Auth**: server-side accounts in `data/users.json`, httpOnly session cookie (`bantan_session`). APIs: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`. Set `AUTH_SECRET` in production.
- **Ad bookings**: `POST /api/bookings` persists to `data/bookings.json`. Optionally set `BOOKING_WEBHOOK_URL` to forward each booking to Apps Script / email worker. TVC video is **not** uploaded — only the chosen file name is stored.
- Canonical auth routes: `/login`, `/signup` (`/auth` redirects to `/login`).
- `/search` and `/watch/[id]` are live routes.

## Performance & media (v2)

- **Caching**: Apps Script responses are cached for 5 minutes (`EPG_REVALIDATE_SECONDS` in `lib/epg.ts`). Edits in the Sheet appear on the site within that time; pages are pre-rendered instead of waiting on Google for every visit.
- **Schedule time**: "Now on air" and the live highlight always use Ulaanbaatar time (UTC+8), also on servers running in UTC.
- **Images**: posters and hero backdrops use `next/image` (resized, AVIF/WebP, lazy-loaded). Allowed hosts live in `next.config.mjs` and `lib/images.ts`; unknown hosts are shown unoptimized rather than failing.
- **Trailers**: the hero waits for its image, then plays a muted trailer; it pauses when scrolled away or the tab is hidden, and is skipped for reduced-motion / data-saver users.
  - Best quality: host your own `.mp4` files and set `MEDIA_BASE_URL` (see `.env.example`). The site looks for `<MEDIA_BASE_URL>/trailers/<movie-id>.mp4`, where `<movie-id>` is the slug in the `/movie/<id>` URL. Titles without a file fall back to the Drive/YouTube trailer.
  - Encode trailers as H.264 mp4, about 720p, under ~8 MB, with `-movflags +faststart` so they start instantly.

## Trailers: skipping the blank intro, swipe, auto-advance (v3)

- **Blank first seconds on Drive trailers**: the Drive `/preview` player cannot start at a chosen second, so the site now tries to stream the Drive file in a normal `<video>` and jumps past the intro (`DRIVE_SKIP_SECONDS` in `lib/trailer.ts`, default 3; override with `NEXT_PUBLIC_DRIVE_TRAILER_SKIP_SECONDS`, `0` disables). If Drive refuses to stream a file, it silently falls back to the old Drive player (which still shows the blank intro).
- **Permanent fix**: cut the intro off the files themselves. Re-encode (not `-c copy`) so the cut is exact:
  `ffmpeg -ss 3 -i in.mp4 -c:v libx264 -crf 22 -c:a aac -movflags +faststart out.mp4`
  Own-hosted files (`MEDIA_BASE_URL`) are never skipped, so trimmed files play from 0:00.
- **Hero**: stops as soon as you scroll down, moves to the next slide when a trailer ends (20 s timer for Drive-player/YouTube fallbacks, which cannot report their end), swipe left/right on phones.
- **Genres**: `lib/genres.ts` holds the genre list (Mongolian labels + English/Mongolian spellings the sheet may use). The site reads the sheet's category/genre column and maps it. For titles the sheet does not cover, add them in `lib/genre-overrides.ts`.
