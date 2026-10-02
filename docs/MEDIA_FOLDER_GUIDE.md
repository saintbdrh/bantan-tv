# Bantan TV — Media folder structure guide

This guide explains how to organize Google Drive so the Apps Script (`buildIndex` + EPG API) can attach **poster**, **backdrop**, and **trailer** to every title.

---

## Root folder

Point `ROOT_FOLDER_ID` in the Apps Script at your **“Bantan web”** Drive folder.

```
Bantan web/                    ← ROOT_FOLDER_ID
├── Midnight Run/
├── About my Father/
├── Alice Darling/
└── …one folder per movie/show
```

Each **immediate child folder** is one title. The folder name is matched to the EPG sheet **Title** (`хөтөлбөрийн нэр`) after normalizing:

- case ignored
- punctuation / extra spaces ignored
- `&` treated as `and`

**Example matches**

| Drive folder name     | EPG title              | Match? |
|-----------------------|------------------------|--------|
| `Midnight Run`        | `Midnight Run`         | Yes    |
| `midnight run`        | `Midnight Run`         | Yes    |
| `Midnight Run!`       | `Midnight Run`         | Yes    |
| `About my Father`     | `About My Father`      | Yes    |
| `MidnightRun`         | `Midnight Run`         | No (missing space) |

---

## Per-title layout

```
Bantan web/
└── <Movie Title>/
    ├── Poster/                 ← required for card + hero images
    │   ├── Something_POSTER.jpg
    │   ├── Something_WIDE.jpg
    │   ├── Something_BANNER.png
    │   └── (optional extras: BG, TITLE, …)
    └── Trailer/                ← optional but recommended
        └── trailer.mp4
```

### Poster subfolder

| Purpose        | How the script picks the file                                      | Suggested name keywords |
|----------------|---------------------------------------------------------------------|-------------------------|
| **Poster**     | First image whose name contains a poster keyword; else exact title; else first image A–Z | `poster`                |
| **Backdrop**   | First image whose name contains a backdrop keyword; must differ from poster | `wide`, `banner`        |

Supported image extensions: **`jpg` · `jpeg` · `png` · `webp`**  
(`.psd` is ignored on purpose.)

**Recommended files per movie**

```
Poster/
  MovieName_POSTER.jpg     → vertical / card image (poster)
  MovieName_WIDE.jpg       → widescreen hero (backdrop)
```

If only one image exists, it is used as the poster; backdrop may stay empty.

### Trailer subfolder

| Purpose    | How the script picks the file                                      |
|------------|--------------------------------------------------------------------|
| **Trailer**| Prefer a file named like the movie title; else first video A–Z   |

Supported video extensions: **`mp4` · `mov` · `webm`**

```
Trailer/
  MovieName_trailer.mp4
```

The API exposes trailers as Drive **preview** links (`…/file/d/ID/preview`). The site embeds those in an iframe (not a raw `<video>` tag).

---

## Full example

```
Bantan web/
├── Midnight Run/
│   ├── Poster/
│   │   ├── MidnightRun_POSTER.jpg
│   │   └── MidnightRun_WIDE.jpg
│   └── Trailer/
│       └── MidnightRun_trailer.mp4
├── LATE NIGHT WITH THE DEVIL/
│   ├── Poster/
│   │   ├── LNWTD_POSTER.jpg
│   │   └── LNWTD_BANNER.jpg
│   └── Trailer/
│       └── trailer.mp4
└── About my Father/
    └── Poster/
        ├── AboutMyFather_POSTER.jpg
        └── AboutMyFather_WIDE.jpg
```

Folder names should match the EPG titles as closely as possible (same words, order, and spelling).

---

## After changing Drive

1. Open the Apps Script project.
2. Run **`buildIndex()`** (authorize if prompted).
3. Optional: run **`checkMatches()`** and open **View → Logs** to see which EPG titles have poster / backdrop / trailer.
4. No redeploy is required for Drive-only changes. Redeploy only after editing the script code (new version).

`MAKE_PUBLIC = true` makes indexed files “Anyone with the link can view” so the website can load them anonymously.

---

## API endpoints (reference)

| URL | Returns |
|-----|---------|
| `/exec` | This week’s EPG rows |
| `/exec?with_media=1` | EPG rows + `poster`, `backdrop`, `trailer` |
| `/exec?media=all` | Full media catalog |
| `/exec?media=Movie Name` | One title’s media |

Frontend uses:

```ts
// lib/epg.ts
EPG_ENDPOINT = '…/exec?with_media=1'
// media list derived as: same base URL + ?media=all
```

---

## Checklist

- [ ] Root folder ID set in Apps Script
- [ ] One folder per title under the root
- [ ] Folder name matches EPG **Title**
- [ ] `Poster/` with at least one image (`*poster*` preferred)
- [ ] Optional `*wide*` / `*banner*` image for hero backdrop
- [ ] Optional `Trailer/` with one video
- [ ] Ran `buildIndex()` after last Drive change
- [ ] Ran `checkMatches()` and fixed any “NOT IN INDEX” / “NO poster” lines
