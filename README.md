# map-tile-checks

Nightly Playwright + TypeScript checks for the map layer of Product A.

**Why it exists (BUG-001):** the map's previous tile provider ended keyless access. Every tile
request still returned `HTTP 200` with a valid `image/png`, but the image was an
"API KEY REQUIRED" placeholder, so users saw a blank, watermarked map. A status-code check
alone stays green in that situation. These tests check the tile *content* as well.

## Tests

| Project | Test | Asserts |
|---|---|---|
| `api` | Sofia centre tile returns HTTP 200 with a PNG | status `200`, `content-type: image/png` |
| `api` | Sofia centre tile contains real map imagery, not the API-key placeholder | 256×256 PNG, ≥ 64 distinct colours, most common colour < 50% of pixels, SHA-256 ≠ known placeholder |
| `ui` | station map loads real map tiles for Sofia city centre | the app requests the Sofia tile from the expected provider, the response passes the same content checks, the tile `<img>` is visible and decoded at 256 px |

The Sofia tile is `z13 / x4626 / y3019` (42.698 N, 23.322 E). It is the centre tile of the
app's default map view, so it always loads.

**Content thresholds** come from a measured baseline: the real Sofia tile has 256 colours and
its most common colour covers 10.8% of pixels. The placeholder has 16 colours at 96.9%.

## Setup

Requires Node.js 20+.

```bash
npm ci
npx playwright install chromium
cp .env.example .env   # then set BASE_URL to the app under test
```

| Variable | Required | Default |
|---|---|---|
| `BASE_URL` | for the UI test | none |
| `MAP_PATH` | no | `/stations` |
| `TILE_URL_TEMPLATE` | no | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |

## Run

```bash
npm test            # all 3 tests
npm run test:api    # API tests only (no BASE_URL needed)
npm run test:ui     # UI test only
npm run report      # open the last HTML report
```

Expected runtime: about 10 seconds locally (API tests under 1 s, UI test about 5 s), plus a
one-time ~1 minute browser download.

To see the suite catch BUG-001, point the API tests at the old provider's keyless endpoint.
The status test passes, the content test fails:

```bash
TILE_URL_TEMPLATE='https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png' npm run test:api
```

## Evidence in the report

Every run attaches, even when tests pass:

- **UI test:** a screenshot of the map page.
- **Both content checks:** `checked-tile.png` (the exact tile that was checked) and
  `tile-measurements.json` (size, colours, dominant-colour ratio, SHA-256).

Open a test in the HTML report and scroll to **Attachments**.

## CI (GitHub Actions)

`.github/workflows/nightly.yml` runs every day at 03:00 UTC, on pull requests, and manually
(**Actions → Nightly map tile checks → Run workflow**).

After each scheduled or manual run, the **`publish-report`** job deploys the report to GitHub
Pages and writes the run's **Summary** page: a pass/fail table, the tile measurements, the
screenshots inline, and a link to the full report online. Pages keeps only the latest run, so
older summaries' images stop loading; every run also keeps the zipped report as the
`playwright-report` artifact for 14 days (extract the zip fully before opening `index.html`).
Pull-request runs test only and do not publish.

One-time setup in the GitHub repo:

1. **Settings → Secrets and variables → Actions → Variables → New repository variable**
2. Name `BASE_URL`, value = the app's URL. Save.
3. **Settings → Pages → Build and deployment → Source: GitHub Actions.**

Notes:

- GitHub emails failed scheduled runs to the person who last edited the cron line.
- GitHub pauses scheduled workflows after 60 days without repository activity.
- The API tests send an identifying `User-Agent`, as required by the tile server's usage policy.
