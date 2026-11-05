# Moving Bantan TV from Vercel to Cloudflare Workers

This is the step-by-step plan to run the site on Cloudflare instead of Vercel. The code changes are already done on this branch; what is left is account setup, settings and the DNS switch. Allow about 2 hours of work, plus waiting for the domain to become active on Cloudflare. Vercel keeps serving bantan.tv until step 6.6, and the switch itself is designed to have no downtime and an instant rollback.

## Status (9 October 2026)

Already done, on the Cloudflare account `duuganbadrakh69@gmail.com` (the one with the R2 trailers):

- [x] R2 bucket `bantan-tv-next-cache` and D1 database `bantan-tv-db` created; its ID is in `wrangler.jsonc`, and the tables are created
- [x] `AUTH_SECRET` set (random, not written down anywhere; set a new one with `openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET` if ever needed)
- [x] Deployed from Uuganaa's Mac (`npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy`): **https://bantan-tv.duuganbadrakh69.workers.dev**. Movie, category, search and watch pages answer in about 0.1 s once the Sheet data is cached (they took 2.5–5.5 s before the `lib/cached-json.ts` change).

The folder on that Mac (`~/Downloads/bantan-tv`) is not a Git clone, and the Mac's home folder is itself a Git repository. Run `git` commands for this project from a proper clone of the GitHub repo, not from that folder.

Still to do: Workers Paid when you're ready (the site runs on Free for now; see step 2.1), automatic deploys from GitHub (steps 1 and 3), the bantan.tv switch (step 6), the trailer domain (step 7), retiring Vercel (step 8). Steps 2 and 4 are done except for the optional settings. Because that account is a personal Gmail account, consider making company admins owners of it.

## Why we are moving

- **Vercel limits.** The Hobby plan includes 10 GB/month of Fast Origin Transfer and 5,000 image transformations. Two things use most of that:
  - `/api/drive-stream` sends every byte of the Drive trailers through a Vercel function.
  - Every Drive poster goes through Vercel image optimization.
- **Hobby is non-commercial only.** Vercel's terms require Pro ($20/month per deploying seat, plus usage beyond the $20 credit) for a site that sells advertising.
- **Cloudflare doesn't bill bandwidth.** Workers Paid is $5/month for the whole account: 10M requests and 30M CPU-ms included, no charge for bandwidth/egress, and static files are free. The trailers are already in R2.
- **Sign-up and bookings never worked on Vercel.** They saved to `data/*.json`, but Vercel's disk is read-only. They now use a Cloudflare D1 database.

## What changed in the code

| Area | Before (Vercel) | Now (Cloudflare) |
|---|---|---|
| Framework | Next.js 14.2, React 18 | Next.js **16.3.8**, React 19. The adapter no longer supports Next 14. |
| Hosting adapter | — | `@opennextjs/cloudflare`, plus `wrangler.jsonc`, `open-next.config.ts` and `custom-worker.ts` |
| Accounts, bookings | `data/users.json`, `data/bookings.json` (writes failed) | D1 `bantan-tv-db` (`migrations/0001_init.sql`). Bookings are saved first and then forwarded to the webhook. |
| Page cache (5 min) | Vercel ISR | R2 bucket `bantan-tv-next-cache` + Durable Object queue; ISR pages declare `revalidate = 300` |
| Google Sheet / trailer-list data | Next.js fetch cache | `lib/cached-json.ts`: kept in memory and in R2, served instantly and refreshed in the background after 5 minutes. Next's fetch cache lost its writes on Workers, so movie/category/search pages waited for the Apps Script (2.5–5.5 s) on every visit. |
| Posters (`next/image`) | Vercel optimizer, AVIF/WebP, 8+ widths | Cloudflare Images binding: WebP only, 7 widths, each copy cached at the edge for 1 day. If Drive or Images fails, the browser is sent to the original picture instead of seeing a broken image. |
| Login cookie | SHA-256, with a public default key if `AUTH_SECRET` was missing | HMAC-SHA256. In production it refuses to run unless `AUTH_SECRET` has at least 32 characters. |
| Trailers in R2 | `*.r2.dev` links (rate-limited, dev only) | Same links, or a custom domain once `R2_PUBLIC_URL` is set |
| Settings | Vercel environment variables | Worker Variables and Secrets (list in `.env.example`) |
| Bug fixes found on the way | Movies with Mongolian (Cyrillic) titles opened a "not found" page; `totalPrice: 1e999` crashed bookings | Both fixed |

Things to know:

- **Version pin.** `next@16.3.8` goes with `@opennextjs/cloudflare@1.20.9`. **Do not bump Next to 16.4.x until OpenNext supports it.** On 16.4.0 every page fails with `Unexpected loadManifest(/.next/server/preview-props.json)`. Upgrade both packages together and test with `npm run preview`.
- **Older browsers.** Next 16 supports Chrome/Edge/Firefox 111+ and Safari 16.4+ (iOS 16.4+). Next 14 also ran on older iPhones and some older smart-TV browsers. If analytics show many such visitors, raise it before switching.
- **Why OpenNext and not vinext.** Cloudflare's docs now suggest vinext for *new* Next.js apps. But its own README says it is "not yet a drop-in replacement for every application or production workload", and its `next/image` support is partial. OpenNext runs the real Next.js build, so this app needed no rewrite.

---

## 0. Before you start

- [ ] **Pick one company-owned Cloudflare account for everything:** the bantan.tv domain, this Worker, the trailer bucket `bantan-data` and the `bantan-tv-video-api` Worker. The trailer Worker currently lives on `duuganbadrakh69.workers.dev`. If that is a personal account, either make it the company account (company admins as owners, company billing) or create a company account and copy the trailer files into a bucket there. An R2 custom domain only works if the domain is in the **same account** as the bucket.
- [ ] Copy the current values from Vercel → Project → Settings → Environment Variables: `BOOKING_WEBHOOK_URL`, `YOUTUBE_API_KEY`, `MEDIA_BASE_URL`, `VIDEO_API_URL`, `NEXT_PUBLIC_DRIVE_TRAILER_SKIP_SECONDS` (whichever exist). Values marked "Sensitive" can't be read back, so get those from where they came from (e.g. the Apps Script deployment URL).
- [ ] Check whether any poster, trailer or Sheet link points at Vercel Blob (`*.public.blob.vercel-storage.com`). If so, move those files (e.g. to R2) before you delete anything on Vercel.
- [ ] Have the login for the bantan.tv domain registrar ready (step 6).
- [ ] **Stop Vercel from building new commits:** Vercel → Project → Settings → Git → **Ignored Build Step** → custom command `exit 0`. Production stays on the current deployment, which is your rollback. Without this, merging the new code into `main` later would also redeploy it on Vercel.

## 1. Push the code to a branch

```bash
git checkout -b cloudflare
# copy in the changed files (or `git apply cloudflare-migration.patch`)
npm install
git add -A && git commit -m "Move hosting to Cloudflare Workers (OpenNext)"
git push -u origin cloudflare
```

Keep `main` unchanged until the cutover.

## 2. Create the Cloudflare resources (once)

In the Cloudflare dashboard:

1. **Workers plan:** Workers & Pages → Plans → **Workers Paid ($5/month)**. The Free plan allows 10 ms of CPU per request. Checking a password at login takes about 50 ms, and rendering a page often needs more than 10 ms as well.
2. **R2 → Create bucket** → name `bantan-tv-next-cache` (location: Automatic).
3. **Storage & Databases → D1 → Create** → name `bantan-tv-db`. Copy the **Database ID** into `wrangler.jsonc` (`"database_id": "PASTE-D1-DATABASE-ID-HERE"`), then commit and push.
4. **D1 → bantan-tv-db → Console:** paste the contents of `migrations/0001_init.sql` and run it. It creates the `users` and `bookings` tables and is safe to run twice.

The same steps from a terminal:

```bash
npx wrangler login
npx wrangler r2 bucket create bantan-tv-next-cache
npx wrangler d1 create bantan-tv-db      # copy database_id into wrangler.jsonc
npm run db:migrate:remote
```

## 3. Connect GitHub (automatic deploys)

Workers & Pages → **Create** → **Import a repository** → GitHub → choose the bantan-tv repo.

| Setting | Value |
|---|---|
| Worker name | `bantan-tv` (must match `"name"` in `wrangler.jsonc`) |
| Production branch | `cloudflare` for now; switch to `main` after the cutover |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Non-production branch deploy command | `npx opennextjs-cloudflare upload` |
| Build variables | `VIDEO_API_URL`, `MEDIA_BASE_URL` and (after step 7) `R2_PUBLIC_URL`, with the same values as in step 4 if you set them there; `NEXT_PUBLIC_DRIVE_TRAILER_SKIP_SECONDS` only if you changed it from the default 4. Pages are pre-rendered during the build, and the build cannot see runtime variables. |

The first build takes a few minutes. On success the site is live at `https://bantan-tv.<your-subdomain>.workers.dev`. The build log shows a warning that `DOQueueHandler` is not exported; that is expected and harmless (it comes from the local-development helper, which runs before the Worker is assembled).

Preview versions from other branches use the **same** D1 database, cache bucket and secrets as production. Don't test destructive things on a preview.

Deploy through GitHub as above. If you ever run `npm run deploy` from a laptop, make sure there are no `.env*` files with secrets in the folder: OpenNext bakes `.env` files into the Worker.

## 4. Settings: Worker → Settings → Variables and Secrets

| Name | Type | Needed? | Value |
|---|---|---|---|
| `AUTH_SECRET` | Secret | **Yes** | New random string, at least 32 characters: `openssl rand -hex 32`. Without it, sign-up and login return an error. |
| `BOOKING_WEBHOOK_URL` | Secret | If used on Vercel | Copy from Vercel |
| `YOUTUBE_API_KEY` | Secret | Optional | Copy from Vercel |
| `MEDIA_BASE_URL` | Text | Optional | Copy from Vercel |
| `VIDEO_API_URL` | Text | Only if the trailer Worker moves | Its new URL |
| `R2_PUBLIC_URL` | Text | After step 7 | `https://media.bantan.tv` |

`wrangler.jsonc` has `"keep_vars": true`, so deploys don't wipe these.

## 5. Test on the workers.dev address

- [ ] Home page: posters load, hero trailer plays, "Одоо гарч байна" shows the right show
- [ ] `/movies`, `/schedule`, a `/movie/<id>` page (including one with a Mongolian title), `/search?q=...`
- [ ] Sign up, then log in (`/signup`, `/login`)
- [ ] Edit a title in the Google Sheet. The change should show within about 5–10 minutes (data refresh plus page refresh).
- [ ] Worker → **Observability**: no errors

On `*.workers.dev`, resized posters are not cached at the edge (their `x-image-cache` header says `MISS`), so they load a bit slower. Caching starts on bantan.tv.

## 6. Move bantan.tv to Cloudflare and switch over

**If bantan.tv is already on Cloudflare** (in the same account), skip to 6.4.

1. **Protect email first.** From the current DNS host (registrar or Vercel → Domains), **export or screenshot every DNS record**: MX, SPF/DKIM/DMARC (TXT), autodiscover, verification records, subdomains. Cloudflare's automatic import can miss records.
2. **DNSSEC:** if DNSSEC is on at the registrar (a DS record exists), **turn it off and remove the DS record before changing nameservers**. If you skip this, the domain, and with it binge@bantan.tv, can become unreachable. Wait for the DS record's TTL to pass (often 24–48 hours) before continuing; you can re-enable DNSSEC in Cloudflare once the zone is active.
3. **Websites → Add a domain → `bantan.tv` → Free plan.** Compare the imported records with your export and add anything missing. Set **every** imported record to **DNS only** (grey cloud), with TTL **Auto** (5 minutes) or lower. Then nothing goes through Cloudflare's proxy until you choose. Change the nameservers at the registrar to the two Cloudflare ones shown and wait until the zone says **Active**. The site keeps running on Vercel, because the records still point there.
4. **Zone settings:**
   - SSL/TLS → Overview → **Full (strict)**.
   - SSL/TLS → Edge Certificates → **Always Use HTTPS: On**. The login cookie only works over HTTPS.
   - Check that the **Universal certificate** shows **Active** on the same page.
   - Scrape Shield → **Email Address Obfuscation: Off**. It rewrites binge@bantan.tv in pages that come from an origin, which breaks the React page if you ever roll back to Vercel.
5. **Prepare (nothing changes for visitors yet):**
   - Worker → Settings → **Domains & Routes → Add → Route**: `bantan.tv/*` and `www.bantan.tv/*`, zone `bantan.tv`. Routes only apply to proxied records, so traffic still goes to Vercel.
   - **www → bantan.tv (required):** Rules → **Redirect Rules** → wildcard pattern, request URL `https://www.bantan.tv/*` → target `https://bantan.tv/${1}`, 301, keep query string. Without it, both names serve the site and logins are split between them. It runs before the Worker and takes effect at the switch.
6. **The switch:** in DNS, set the `bantan.tv` and `www` records (the ones pointing to Vercel) to **Proxied** (orange cloud). Requests now reach Cloudflare, and the Worker answers them. Visitors move over as their DNS caches expire (minutes). Vercel answers anyone who hasn't moved yet, so there is no gap. Leave mail records and other subdomains as DNS only.
7. In Workers Builds, change the production branch to `main`, then merge `cloudflare` into `main`.

**Rollback:** delete the two Worker routes. The proxied records then send traffic straight back to Vercel, which still runs the old deployment (Full (strict) mode keeps that working). This works for the first few weeks only: Vercel can't renew its certificate while the Worker answers on bantan.tv, so a late rollback would show certificate errors. Keep the Vercel project for at least a week.

Routes added in the dashboard stay in place across deploys as long as `wrangler.jsonc` has no `routes` entry. If you ever add `routes` there, list these two as well, because a config with routes replaces the dashboard ones.

## 7. Trailers: give the R2 bucket a real domain (recommended)

`*.r2.dev` links are rate-limited, not cached, and Cloudflare says to use them for development only.

1. R2 → bucket **bantan-data** → Settings → **Custom Domains → Connect domain** → `media.bantan.tv`. This needs bantan.tv in the same account as the bucket.
2. Set `R2_PUBLIC_URL = https://media.bantan.tv` in the Worker variables (step 4) and in the build variables (step 3). The site rewrites the `*.r2.dev` trailer links to that domain; the trailer Worker itself does not need changes.
3. Optional: Caching → Tiered Cache → **Smart Tiered Cache** on, so fewer requests go back to R2.
4. Once nothing else uses it, turn off the r2.dev public URL on the bucket.

## 8. Retire Vercel

After a week or two of normal traffic: Vercel → Project → Settings → Domains → remove bantan.tv; Settings → Git → Disconnect; then delete the project.

The `bantan.tv`/`www` DNS records still point at Vercel's address but are never used, because the Worker answers first. To tidy them without a gap:

- **bantan.tv:** first *add* an `AAAA` record `100::` (Proxied), the placeholder Cloudflare uses for Worker-only hostnames, then delete the old `A` record.
- **www:** edit the existing `CNAME` in place so it points to `bantan.tv` (Proxied).

---

## Running it day to day

- **Deploy:** merge to `main`. Workers Builds builds and deploys automatically.
- **Logs:** Worker → Observability (turned on in `wrangler.jsonc`).
- **Bookings and accounts:** D1 → bantan-tv-db → Console, e.g. `SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50;`
- **Content:** unchanged. Edit the Google Sheet / Drive folders as before. Changes appear within about 5–10 minutes.
- **Image allowance:** Images → Transformations. The free tier is 5,000 unique transformations a month. One poster at one width is one transformation; with ~100 titles expect about 1,000. On the free tier, new sizes past 5,000 fail with error 9422 rather than being billed. The site then sends browsers to the original Drive pictures (the same happens when Drive throttles Cloudflare), which is slower but not broken. If you get close, enable the Images paid plan ($0.50 per extra 1,000).
- **Database schema changes:** add `migrations/0002_*.sql`, then run `npm run db:migrate:remote`. Deploys do not run migrations.

## Possible follow-ups (not required for the move)

- Upload the remaining Drive trailers to R2. `/api/drive-stream` still proxies Drive for titles without an R2 file. On Cloudflare that isn't billed as bandwidth, but R2 is faster for viewers.
- Copy posters from Drive to R2 as well. Each size is fetched from Drive once a day per Cloudflare data centre; R2 would make the first load faster.
- Security → WAF → **Rate limiting rule** on `/api/auth/*`, e.g. 10 requests per minute per IP, to slow down password guessing.
- `npm run lint` uses the new ESLint 9 flat config. It reports a few older React hook patterns in existing components (not related to this move, and not blocking builds).

## What was tested before handing over

Local `npm run preview`, which runs the real Workers runtime locally (not Cloudflare's network), with a mock of the Google Sheet and trailer APIs:

- every page returns 200, including a movie with a Mongolian title
- sign-up, duplicate sign-up, wrong password, login, session, tampered and forged cookies, logout
- sign-up and login refuse to run without `AUTH_SECRET`; the rest of the site keeps working
- bookings saved to D1, including the auth and validation errors
- `/_next/image`: a 268 KB JPEG poster came out as a 36 KB WebP; the second request came from the cache, extra query parameters can't bypass it, a failing upstream redirects to the original picture, and tricks like `url=/\evil.example` are not redirected
- ISR: changing the mock Sheet showed up after the revalidate window (stale page served, then refreshed through the Durable Object queue)
- trailer links rewritten to `R2_PUBLIC_URL`, dubbed version preferred
- no hydration or console errors in Chromium
- worker bundle 1.2 MB gzipped, well within the Workers size limit
