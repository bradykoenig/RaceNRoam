# RaceNRoam Live Race Hub

A stream-safe motorsports companion dashboard for TikTok and OBS — built for the RaceNRoam channel.

Display live standings, countdowns, weather, talking points, and race info during real race weekends without showing any copyrighted broadcast content.

**Live at:** `live.racenroam.com` (future) / `racenroam.com/race-hub` (planned integration)

---

## Features

- **Multi-series coverage** – F1, NASCAR, IndyCar, IMSA/WEC, MotoGP
- **Live F1 data** – Powered by [OpenF1](https://openf1.org/) (free, real-time) + [Jolpica](https://api.jolpi.ca/) (schedule/standings/results)
- **Weather data** – Track weather via [Open-Meteo](https://open-meteo.com/) (free, no key needed)
- **Stream Mode** – Full-screen OBS/TikTok display layout at `/stream`
- **Provider adapters** – Ready for Sportradar, SportsData.io, DataSportsGroup, Enetpulse when keys are added
- **Fallback data** – Every series has complete realistic fallback data, so the app never breaks
- **Cloudflare Pages** – Deployed at the edge globally, functions run in Cloudflare Workers
- **Race Calendar** – Unified multi-series 2026 calendar with filters

---

## Tech Stack

| Layer       | Technology                               |
|-------------|------------------------------------------|
| Frontend    | React 18 + Vite 5                        |
| Router      | React Router v6                          |
| Styling     | Plain CSS with CSS custom properties     |
| Deployment  | Cloudflare Pages                         |
| API/Backend | Cloudflare Pages Functions (Workers)     |
| F1 Live     | OpenF1 API + Jolpica/Ergast-compatible   |
| Weather     | Open-Meteo (free, no key)                |
| Caching     | Cloudflare KV (optional)                 |

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run the frontend only (no API functions)

```bash
npm run dev
```

The app runs at `http://localhost:5173`. API calls will fail gracefully and use local fallback data automatically.

### Run with Cloudflare Pages Functions (full local stack)

You need [Wrangler](https://developers.cloudflare.com/workers/wrangler/) installed:

```bash
# First, build the frontend
npm run build

# Then start wrangler pages dev (runs both static site + functions)
npm run pages:dev
```

App + API will be at `http://localhost:8788`.

---

## Build

```bash
npm run build
```

Output directory: `dist/`

---

## Deploy to Cloudflare Pages

### Cloudflare Pages Settings

| Setting            | Value        |
|--------------------|--------------|
| Framework preset   | Vite         |
| Build command      | `npm run build` |
| Output directory   | `dist`       |
| Root directory     | `/` (repo root) |

### Steps

1. Connect your GitHub repo to Cloudflare Pages
2. Set build settings as above
3. Add environment variables (see below)
4. Deploy!

Functions in `functions/api/` are automatically deployed as Cloudflare Pages Functions.

---

## Environment Variables

Set these in **Cloudflare Pages → Settings → Environment Variables**. For local dev, copy `.env.example` to `.env`.

### Feature Flags

| Variable              | Default | Description                                      |
|-----------------------|---------|--------------------------------------------------|
| `ENABLE_LIVE_F1`      | `true`  | Enable live F1 data via OpenF1 + Jolpica         |
| `ENABLE_LIVE_NASCAR`  | `false` | Enable live NASCAR data (requires paid key)      |
| `ENABLE_LIVE_INDYCAR` | `false` | Enable live IndyCar data (requires paid key)     |
| `ENABLE_LIVE_IMSA_WEC`| `false` | Enable live IMSA/WEC data (requires paid key)    |
| `ENABLE_LIVE_MOTOGP`  | `false` | Enable live MotoGP data (requires paid key)      |

### Weather

| Variable              | Default      | Description                           |
|-----------------------|--------------|---------------------------------------|
| `WEATHER_PROVIDER`    | `open-meteo` | Weather provider (only open-meteo for now) |
| `OPENWEATHER_API_KEY` | *(empty)*    | Future: OpenWeather API key           |

### Paid Motorsport APIs

| Variable                    | Provider                              |
|-----------------------------|---------------------------------------|
| `SPORTSRADAR_API_KEY`       | [Sportradar](https://developer.sportradar.com/) – NASCAR, more |
| `SPORTSDATA_IO_API_KEY`     | [SportsData.io](https://sportsdata.io/) – NASCAR            |
| `DATASPORTSGROUP_API_KEY`   | [DataSportsGroup](https://www.datasportsgroup.com/) – Multiple |
| `ENETPULSE_API_KEY`         | [Enetpulse](https://www.enetpulse.com/) – Multiple          |
| `SPORTMONKS_API_KEY`        | [Sportmonks](https://www.sportmonks.com/) – Multiple        |
| `GENERIC_MOTORSPORTS_API_KEY` | Any compatible generic provider      |

### Cache (optional – requires Cloudflare KV)

| Variable                     | Default | Description                    |
|------------------------------|---------|--------------------------------|
| `DEFAULT_CACHE_TTL_SECONDS`  | `300`   | Standings/data cache TTL       |
| `LIVE_CACHE_TTL_SECONDS`     | `30`    | Live session cache TTL         |
| `WEATHER_CACHE_TTL_SECONDS`  | `600`   | Weather cache TTL              |

---

## API Endpoints

All endpoints return JSON. Frontend only calls these — no direct external API calls from the browser.

| Endpoint                     | Description                              | Cache TTL   |
|------------------------------|------------------------------------------|-------------|
| `GET /api/health`            | Service health + provider status         | 30s         |
| `GET /api/today`             | Featured race across all series          | 30min       |
| `GET /api/calendar`          | Full multi-series race calendar          | 1h          |
| `GET /api/series/f1`         | F1 data (live OpenF1 + Jolpica)         | 30min       |
| `GET /api/series/nascar`     | NASCAR data (paid API or fallback)       | 30min       |
| `GET /api/series/indycar`    | IndyCar data (paid API or fallback)      | 30min       |
| `GET /api/series/imsa-wec`   | IMSA/WEC data (paid API or fallback)     | 30min       |
| `GET /api/series/motogp`     | MotoGP data (paid API or fallback)       | 30min       |
| `GET /api/weather?lat=&lon=` | Track weather via Open-Meteo             | 10min       |
| `GET /api/standings?series=` | Standings for a series                   | 30min       |
| `GET /api/schedule?series=`  | Schedule for a series                    | 1h          |
| `GET /api/stream-mode?series=` | Compact stream mode payload            | 30min       |

### Response Shape

```json
{
  "ok": true,
  "series": "f1",
  "source": "openf1+jolpica",
  "lastUpdated": "2026-05-28T18:00:00.000Z",
  "cache": { "status": "HIT", "ttlSeconds": 1800 },
  "data": { "featuredRace": {}, "schedule": [], "standings": {}, "weather": {}, "talkingPoints": [], "officialLinks": [] }
}
```

If a provider fails, `source` becomes `"fallback"` and a `warning` field explains why.

---

## Data Provider Strategy

### F1 (Live, Free)

1. **Jolpica** (`api.jolpi.ca/ergast/f1`) — Schedule, results, standings, qualifying. No key required.
2. **OpenF1** (`api.openf1.org/v1`) — Live/real-time session data, weather, race control, positions. No key required.
3. **Fallback** — Local static data (`functions/_lib/providers/f1/f1FallbackProvider.js`).

### NASCAR, IndyCar, IMSA/WEC, MotoGP (Paid Providers)

These series require paid API subscriptions. The provider adapters are built and wired; only the API keys are missing.

**To activate a paid provider:**
1. Get an API key from a supported provider
2. Add it as a Cloudflare Pages environment variable
3. Set the corresponding `ENABLE_LIVE_*` flag to `true`
4. Redeploy

The app automatically falls back to local data when keys are missing.

### Adding a New Provider

1. Create `functions/_lib/providers/{series}/myProvider.js`
2. Export `isEnabled(env)` and a `getData(env)` function
3. Import and call it in `functions/api/series/{series}.js` before the fallback
4. Add the API key to `.env.example` and Cloudflare Dashboard

---

## Enabling Cloudflare KV Caching

1. Create a namespace:
   ```bash
   wrangler kv namespace create RACE_HUB_CACHE
   ```
2. Note the `id` from the output.
3. Uncomment the KV binding in `wrangler.toml` and insert the ID:
   ```toml
   [[kv_namespaces]]
   binding = "RACE_HUB_CACHE"
   id = "your-kv-namespace-id"
   ```
4. Redeploy. The cache utility (`functions/_lib/utils/cache.js`) will detect the binding automatically.

---

## Frontend Pages

| Route        | Description                                          |
|--------------|------------------------------------------------------|
| `/`          | Home – hero, features, CTA                           |
| `/hub`       | Hub – cards for all series with live countdowns      |
| `/today`     | Today's Race – featured race with full detail        |
| `/f1`        | Formula 1 page – live OpenF1 + Jolpica data         |
| `/nascar`    | NASCAR Cup Series page                               |
| `/indycar`   | IndyCar NTT Series page                              |
| `/imsa-wec`  | IMSA / WEC Endurance page                            |
| `/motogp`    | MotoGP page                                          |
| `/calendar`  | Full 2026 multi-series calendar with filters         |
| `/stream`    | Stream Mode – OBS/TikTok full-screen display         |
| `/stream?series=f1` | Stream Mode for a specific series             |

---

## Stream Mode (OBS / TikTok)

`/stream` is designed for screen sharing and OBS browser sources:

- Large countdown to next race
- Championship standings (top 6)
- 3–4 talking points for discussion
- Weekend schedule preview
- Track weather
- Auto-refreshes every 45 seconds
- Switch series via URL: `?series=f1`, `?series=nascar`, etc.
- No navigation clutter

**OBS Browser Source settings:**
- URL: `https://live.racenroam.com/stream?series=f1`
- Width: 1920, Height: 1080 (or your stream resolution)
- Custom CSS: `body { background: transparent; }` (if needed)

---

## Stream Safety & Legal Notes

This app is **stream-safe by design**:

- ✅ Race schedule and timing data (public information)
- ✅ Championship standings (public information)
- ✅ Track weather (Open-Meteo public API)
- ✅ Talking points and race context (original content)
- ✅ Links to official sources

- ❌ No live race broadcast video or audio
- ❌ No copyrighted timing overlays
- ❌ No scraping of protected live timing pages
- ❌ No restreaming of any content

All data is sourced from public APIs or official providers under appropriate terms of service.

---

## Project Structure

```
RaceNRoam/
├── functions/                      # Cloudflare Pages Functions (backend)
│   ├── _lib/
│   │   ├── providers/              # Data provider adapters
│   │   │   ├── f1/                 # OpenF1 + Jolpica + fallback
│   │   │   ├── nascar/             # Sportradar + SportsData.io + fallback
│   │   │   ├── indycar/            # Generic adapter + fallback
│   │   │   ├── imsaWec/            # Generic adapter + fallback
│   │   │   ├── motogp/             # Generic adapter + fallback
│   │   │   └── weather/            # Open-Meteo + fallback
│   │   └── utils/
│   │       ├── apiResponse.js      # Response helpers + cache headers
│   │       └── cache.js            # Cloudflare KV cache wrapper
│   └── api/                        # URL-mapped API endpoints
│       ├── health.js               # GET /api/health
│       ├── today.js                # GET /api/today
│       ├── calendar.js             # GET /api/calendar
│       ├── weather.js              # GET /api/weather
│       ├── standings.js            # GET /api/standings
│       ├── schedule.js             # GET /api/schedule
│       ├── stream-mode.js          # GET /api/stream-mode
│       └── series/
│           ├── f1.js               # GET /api/series/f1
│           ├── nascar.js           # GET /api/series/nascar
│           ├── indycar.js          # GET /api/series/indycar
│           ├── imsa-wec.js         # GET /api/series/imsa-wec
│           └── motogp.js           # GET /api/series/motogp
├── src/                            # React frontend
│   ├── components/                 # Reusable UI components
│   ├── pages/                      # Route page components
│   ├── hooks/                      # Custom React hooks
│   ├── services/                   # Frontend service layer
│   ├── lib/api/                    # API client (calls /api/* endpoints)
│   ├── data/fallback/              # Local fallback data
│   ├── App.jsx                     # Router setup
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Global CSS design system
├── public/
│   ├── _redirects                  # SPA routing for Cloudflare Pages
│   └── favicon.svg
├── .env.example                    # Environment variable template
├── wrangler.toml                   # Cloudflare configuration
├── vite.config.js                  # Vite build configuration
└── package.json
```

---

## License

Private project for RaceNRoam. All rights reserved.

---

*Built for RaceNRoam – streaming motorsports from the RV since day one* 🏁
