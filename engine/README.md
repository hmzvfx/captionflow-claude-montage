# Captionflow AI Production Engine

Production worker for Captionflow's Google-Sheet-driven AI video factory.

**Contract**

`Google Sheet -> router -> Nano Banana / Veo 3.1 -> shot QC -> deterministic timeline -> FFmpeg -> final QC -> READY_TO_POST`

The Google Sheet is the control plane. Secrets never belong in the Sheet or repository.

## Current implementation

- Node.js 22, zero npm runtime dependencies.
- FFmpeg / FFprobe for rendering, audio mixing and thumbnails.
- Google Sheets REST API for control-plane reads/writes.
- Gemini API for Nano Banana image generation, Veo video generation and multimodal QC.
- Persistent media root at `/data/media`.
- Token-protected media endpoint and `/health` endpoint.
- Crash recovery, retry limits, duplicate-job suppression and spend guards.

## Sheet contract

The engine expects these tabs:

- `PRODUCTIONS` — mobile production dashboard.
- `PLANS` — shot list and generation controls.
- `ASSETS` — references, generated images, music and SFX.
- `GENERATION_JOBS` — immutable-ish attempt history and QC results.
- `EDIT_TIMELINE` — deterministic assembly instructions.
- `OUTPUTS` — final masters and final-QC state.
- `ENGINE_CONFIG` — non-secret routing, model, QC and budget settings.

A plan is executable when `PLANS.Gen status` is `READY_TO_GENERATE` or `REGENERATE`.

## Autonomous routing

With `Generation mode=AUTO`, the worker chooses the safest available route:

1. `EXTEND_SOURCE` -> `EXTEND`.
2. `FIRST_FRAME + LAST_FRAME` -> `INTERPOLATION`.
3. character/product/global references -> `REF`.
4. `FIRST_FRAME` -> `I2V`.
5. otherwise -> `T2V`.

Model defaults:

- T2V / I2V / interpolation -> Veo 3.1 Lite for low-cost iteration.
- reference-image or extension jobs -> Veo 3.1 Fast.
- `VEO_STANDARD` remains an explicit quality override.

Capability constraints are enforced by the router: reference-image and extension jobs do not run on Lite; extension is forced to 720p; 1080p/reference/extension jobs use 8-second generations.

### Automatic first-frame creation

If a ready plan has:

- `Generation mode=AUTO`,
- a populated `Prompt Nano Banana Pro`, and
- a populated continuity requirement,

but no usable first-frame asset, the worker creates an `ASSETS` job automatically. Identity/face-sensitive prompts route to Nano Banana Pro at 2K; simpler frames route to Nano Banana 2 at 1K. Once generated, the plan naturally becomes I2V.

### Automatic Veo prompt audit

If `Prompt Veo 3.1 Lite` is blank, the worker derives a motion prompt from the image prompt, action/composition, camera, continuity and cut intent. The derived prompt is written back into `PLANS` before the generation job is created so every paid request is auditable.

## Image generation

`ASSETS` rows with `Type=IMAGE`, `Status=READY_TO_GENERATE` and a generation prompt are executed with:

- `gemini-3.1-flash-image` (`NANO_BANANA_2`), or
- `gemini-3-pro-image` (`NANO_BANANA_PRO`).

Optional source images are supplied via `Source image URLs`, separated by `|`. Generated images are stored below `/data/media/<script>/assets/` and the URL is written back to the Sheet.

Useful roles include:

- `FIRST_FRAME`
- `LAST_FRAME`
- `CHARACTER_REFERENCE`
- `PRODUCT_REFERENCE`
- `GLOBAL_REFERENCE`
- `EXTEND_SOURCE`

Use continuity tags such as `scene:1,plan:3` to scope an asset to one shot.

## Veo generation

Supported routes:

- text-to-video;
- image-to-video;
- first/last-frame interpolation;
- up to three reference images;
- extension of a previous Veo video.

Each attempt is appended to `GENERATION_JOBS` before provider execution. Provider operation ID, output URL, estimated cost, error, QC score and QC notes are written back.

`personGeneration` is selected according to Veo's mode-specific requirements: T2V/extension uses `allow_all`; I2V/interpolation/reference jobs use `allow_adult`.

## Shot QC and automatic retry

Every generated clip is analyzed by the configured multimodal QC model. The worker asks for JSON containing:

- score 0–10;
- pass/fail;
- usable start time;
- usable end time;
- short notes.

Passing clips become `SELECTED`, and the selected URL plus trims are written into `PLANS`. Failed clips become `REGENERATE` until `MAX_GENERATION_ATTEMPTS` is reached.

Jobs left in `QUEUED` or `GENERATING` beyond `STALE_JOB_MINUTES` are marked failed and re-queued safely after a restart.

## Deterministic renderer

When every shot for one Script ID is selected, the engine creates/uses `EDIT_TIMELINE` and renders a final master.

V1 supports:

- deterministic order and trims;
- speed changes;
- per-shot source-audio gain;
- optional overlay text;
- optional per-shot SFX;
- optional master music bed;
- 1080×1920 normalization;
- 30 fps delivery;
- H.264/AAC MP4;
- JPEG thumbnail.

Hard cuts are the safe default. Complex transition choreography should be added deliberately rather than generated indiscriminately.

## Final QC

The final master is analyzed again. Only a video that passes `MIN_FINAL_QC_SCORE` becomes `READY_TO_POST` in `OUTPUTS`, and the `PRODUCTIONS` dashboard is updated with:

- final master URL;
- latest cost;
- final QC score;
- engine update timestamp.

## Spend safety

Paid generation is guarded by all of the following:

1. `DRY_RUN=true` — creates synthetic local media; Gemini/Veo are not called.
2. `ENGINE_CONFIG.GENERATION_ENABLED=FALSE` — paid-generation master kill switch.
3. `MAX_COST_USD_PER_SCRIPT` — per-video ceiling.
4. `MAX_COST_USD_PER_DAY` — Brussels-calendar-day ceiling.
5. `MAX_GENERATION_ATTEMPTS` — retry ceiling.

Keep `GENERATION_ENABLED=FALSE` until the deployed service passes a real Sheet-connected dry run.

## Authentication

### Gemini / Veo

Set `GEMINI_API_KEY` in the server environment.

### Google Sheets

Choose exactly one strategy:

1. `GOOGLE_SERVICE_ACCOUNT_JSON` — raw JSON or base64-encoded service-account JSON.
2. OAuth refresh-token credentials.
3. `GOOGLE_ACCESS_TOKEN` — short-lived token injected by an external WIF/CI process.

The Google identity must have edit access to the production spreadsheet.

## Environment

Copy `.env.example` only as a reference. Never commit a real `.env`.

Required for a normal deployment:

```text
SPREADSHEET_ID
GEMINI_API_KEY
one Google Sheets authentication strategy
MEDIA_ROOT=/data/media
PUBLIC_MEDIA_BASE_URL
MEDIA_ACCESS_TOKEN
DRY_RUN=true|false
PORT=8080
```

`PUBLIC_MEDIA_BASE_URL` should be the externally reachable media prefix, for example `https://<engine-host>/media/<MEDIA_ACCESS_TOKEN>`.

## Local validation

No `npm install` is required.

```bash
npm run check
npm run self-test
```

`self-test` validates the router and renders a synthetic 1080×1920 MP4 plus thumbnail with FFmpeg. It does not use paid APIs.

Run one worker cycle:

```bash
DRY_RUN=true npm run worker
```

That command additionally requires a Sheet ID and Google Sheets credentials.

Run the full service:

```bash
npm start
```

## Docker / Coolify

The included Dockerfile installs FFmpeg and contains its own health check.

Coolify setup:

1. repository: `hmzvfx/captionflow-claude-montage`;
2. base directory: `/engine`;
3. build pack: Dockerfile;
4. persistent volume: `/data/media`;
5. expose port `8080`;
6. configure the environment variables above;
7. deploy with `DRY_RUN=true` first;
8. confirm `/health` returns OK and execute a dedicated Sheet dry run;
9. only then set `DRY_RUN=false` and change `ENGINE_CONFIG.GENERATION_ENABLED` to `TRUE`.

The repository workflow `.github/workflows/engine-ci.yml` runs syntax + renderer/router self-tests. `.github/workflows/engine-deploy.yml` can trigger a Coolify deploy after main passes validation when the repository secrets `COOLIFY_WEBHOOK` and `COOLIFY_TOKEN` exist.
