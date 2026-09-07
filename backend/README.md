# CloudGuard — Backend

Node.js + TypeScript + Express + Prisma + PostgreSQL implementation of `BACKEND.md`.

Phases 1–9 of the spec are built. Phase 10 (ECS/Fargate deploy) is not included.

---

## Getting it running

You need a PostgreSQL 16 database. There is no local Postgres or Docker on the
machine this was built on, so pick one:

**Cloud Postgres (Neon / Supabase)**

1. Create a free database and copy its connection string.
2. Put it in `.env` as `DATABASE_URL`. Neon needs `?sslmode=require` on the end.

**Docker (if you install Docker Desktop)**

```bash
docker compose up -d
```

`docker-compose.yml` brings up Postgres 16 matching the default `DATABASE_URL`.

### Then

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL and JWT_SECRET
npx prisma migrate dev --name init
npm run seed                  # users, resources, budgets, scenario tags
npm run seed:metrics          # 30 days of history, then runs both detectors
npm run dev
```

`GET http://localhost:4000/health` should return `{"status":"ok","database":"up"}`.

Seeded logins:

| Email | Password | Role |
|---|---|---|
| admin@cloudguard.dev | admin1234 | ADMIN |
| editor@cloudguard.dev | editor1234 | EDITOR |
| viewer@cloudguard.dev | viewer1234 | VIEWER |

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | tsx watch, starts the API and the cron scheduler |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run seed` | Users, resources, budgets, tags (idempotent) |
| `npm run seed:metrics [days]` | Backfill metrics + run detection once (default 30) |
| `npm test` | Vitest — 46 tests over `stats.ts`, `lifecycle.ts`, `healthScore.ts` |
| `npm run prisma:studio` | Browse the data |

---

## How detection works

Detection never runs on the request path. `src/jobs/scheduler.ts` wires cron:

| Job | Cadence | What it does |
|---|---|---|
| `simulator.tick` | every 5 min | Rewrites today's metric point for every resource |
| `detectAnomalies` | every 10 min | Cost + usage spikes over the trailing window |
| `detectIdle` | every 15 min | Idle marking, recovery, escalation, recommendations |

Each job is wrapped in an overlap guard — a slow sweep will not have a second
copy start on top of it and double-create anomalies.

### Spike detection (`lib/stats.ts`)

A spike must clear **three** gates, not just the z-score:

1. `z >= 1.5` → LOW, `>= 2` → MEDIUM, `>= 3` → HIGH
2. `actual >= 1.5 × mean` (ratio guard)
3. `actual - mean >= minAbsDelta` (absolute guard, `ANOMALY_MIN_ABS_DELTA`)

Gates 2 and 3 exist because a resource wobbling between ₹0.10 and ₹0.30 can post
a z of 4 while being completely irrelevant. `detectSpike` returns the failing
gate in `reason`, so a near-miss is explainable rather than silent.

The spec's worked example (mean ≈ ₹80, actual ₹250) is a test case and resolves
to HIGH.

Cost is summed per day (it is a flow); CPU is averaged per day (it is a gauge).
Averaging a cost series would silently understate a day's spend.

One OPEN anomaly per `(resource, kind)` at a time, so a multi-day spike raises
one alert instead of one per run.

### Idle detection

Idle requires **all** of: average CPU below `IDLE_CPU_THRESHOLD` over
`IDLE_WINDOW_DAYS`, average network below 1 MB per interval, status `RUNNING`,
and enough data points to judge. A low-CPU box still serving traffic is not
idle, and a `STOPPED` resource is not wasting money.

Idle marking creates an IDLE anomaly, a recommendation, and an alert to the
owner. After `IDLE_FLAG_AFTER_DAYS` consecutive idle days it escalates to
FLAGGED. If utilisation recovers, it moves back to ACTIVE on its own.

Recommendation type follows the spec: `DELETE_UNUSED` for S3/EBS, `STOP` for
effectively-zero CPU, `DOWNSIZE` for low-but-nonzero. Saving is
`estCostPerDay × 30`, halved for DOWNSIZE.

### Lifecycle

```
ACTIVE ──► IDLE ──► FLAGGED ──► REVIEWED ──► ARCHIVED
   │        │
   └────────┘  (recovery)
```

`lib/lifecycle.ts` rejects illegal jumps with 400. "Any → ACTIVE" is a restore
and is ADMIN-only (403 for anyone else). Every transition writes an `AuditLog`
row; automatic ones use actor id `SYSTEM`.

The HTTP path throws on an illegal jump. The job path (`jobs/lifecycleOps.ts`)
skips and logs instead — a background sweep must not abort because one resource
is in an unexpected state.

---

## The simulator

`jobs/simulator.ts` reads a `sim:` tag on each resource to decide its behaviour:

| Tag | Behaviour |
|---|---|
| `sim:spike` | Cost spike 3 days back and today, ~3× baseline |
| `sim:idle` | Flatlines near 0% CPU for the last 12 days |
| `sim:healthy` | Steady — the control, should never fire |
| *(none)* | Normal gaussian wobble around baseline |

Cost is derived from utilisation, not drawn independently, so a CPU spike and a
cost spike move together and the two anomaly kinds stay coherent.

The backfill is idempotent — `(resourceId, timestamp)` is unique and inserts use
`skipDuplicates`, so re-running it cannot double a day's cost.

`POST /api/simulator/inject` forces a spike on demand for a live demo, and runs
detection immediately so the anomaly appears in the same response.

---

## API

Base path `/api`. Everything except `/auth/register` and `/auth/login` needs
`Authorization: Bearer <jwt>`.

### Auth
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | First registered user becomes ADMIN |
| POST | `/auth/login` | — | Returns `{ user, token }` |
| GET | `/auth/me` | any | |

### Users
| Method | Path | Roles |
|---|---|---|
| GET | `/users` | ADMIN |
| GET | `/users/:id` | ADMIN |
| PATCH | `/users/:id` | ADMIN |
| DELETE | `/users/:id` | ADMIN |

Guards: cannot demote or delete the last ADMIN, cannot delete yourself, cannot
delete a user who still owns resources.

### Resources
| Method | Path | Roles |
|---|---|---|
| GET | `/resources` | any |
| GET | `/resources/:id` | any |
| POST | `/resources` | EDITOR, ADMIN |
| PATCH | `/resources/:id` | EDITOR, ADMIN |
| DELETE | `/resources/:id` | ADMIN |
| GET | `/resources/:id/twin` | any |
| GET | `/resources/:id/metrics` | any |
| POST | `/resources/:id/lifecycle` | EDITOR, ADMIN |

List filters: `type`, `environment`, `lifecycle`, `status`, `ownerId`,
`tag` (`key` or `key:value`), `q`, `sort`, `order`, `page`, `pageSize`.

`/twin?days=30` returns resource, healthScore, **healthBreakdown** (each
deduction itemised), lifecycle, `allowedNext`, usageSummary (avgCpu, avgCost,
totalCost, projectedMonthlyCost, trend), full history, anomalies,
recommendations and tags.

### Metrics
| Method | Path | Roles |
|---|---|---|
| GET | `/resources/:id/metrics?from=&to=&granularity=raw\|hour\|day` | any |
| POST | `/metrics/ingest` | ADMIN |

Ingest is idempotent on `(resourceId, timestamp)` and reports
`{ received, inserted, skippedDuplicates }`.

### Anomalies / Idle / Recommendations
| Method | Path | Roles |
|---|---|---|
| GET | `/anomalies?status=&severity=&kind=&resourceId=&from=&to=` | any |
| GET | `/anomalies/:id` | any |
| PATCH | `/anomalies/:id` | EDITOR, ADMIN |
| GET | `/idle` | any |
| GET | `/recommendations?applied=&type=&resourceId=` | any |
| POST | `/recommendations/:id/apply` | EDITOR, ADMIN |

`/idle` returns each idle resource with its evidence: window, threshold, data
points, avgCpu, maxCpu, idleSince, idleDays, and wasted spend per month.

`/apply` takes optional `{ lifecycle, stopResource }` and does the whole thing
in one transaction, so a rejected lifecycle move cannot leave a recommendation
falsely marked applied.

### Budgets / Alerts / Audit / Analytics / Export
| Method | Path | Roles |
|---|---|---|
| GET | `/budgets` · `/budgets/status` | any |
| POST/PATCH/DELETE | `/budgets` | ADMIN |
| GET | `/alerts` | any (own + broadcast) |
| PATCH | `/alerts/:id/read` · `/alerts/read-all` | any |
| GET | `/audit?entity=&entityId=&actorId=&action=&from=&to=` | ADMIN |
| GET | `/analytics/summary` | any |
| GET | `/analytics/cost-trend?days=30` | any |
| GET | `/analytics/utilization?days=30` | any |
| GET | `/analytics/by-environment?days=30` | any |
| GET | `/export/resources.csv` · `/export/anomalies.csv` | any |

`/budgets/status` uses **actual metered spend** from UsageMetric, not the
`estCostPerDay` estimate, and projects month-end from the run rate so far.
State is `OK` / `WARNING` (≥80%) / `PROJECTED_TO_EXCEED` / `EXCEEDED`.

`/analytics/cost-trend` is gap-filled — days with no data return 0 rather than
leaving a hole in the chart.

### Simulator (ADMIN)
| Method | Path | Body |
|---|---|---|
| POST | `/simulator/inject` | `{ resourceId, costMultiplier?, cpu?, runDetection? }` |
| POST | `/simulator/tick` | — |
| POST | `/simulator/backfill` | `{ days }` |
| POST | `/simulator/detect` | — |

---

## Errors

Everything routes through `middleware/error.ts` and comes back as
`{ error, details? }`.

| Status | When |
|---|---|
| 400 | Zod validation (`details` lists `{ field, message }`), illegal lifecycle jump |
| 401 | Missing, invalid or expired token |
| 403 | Role not permitted |
| 404 | Record or route not found |
| 409 | Unique conflict, last-ADMIN guard, already-applied recommendation |
| 500 | Unhandled — stack logged, message hidden outside development |

---

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 4000 | |
| `DATABASE_URL` | — | **Required** |
| `JWT_SECRET` | — | **Required**, min 8 chars |
| `JWT_EXPIRES_IN` | `1d` | |
| `IDLE_CPU_THRESHOLD` | 5 | % CPU below which a resource looks idle |
| `IDLE_WINDOW_DAYS` | 10 | Idle averaging window |
| `ANOMALY_WINDOW_DAYS` | 14 | Spike baseline window |
| `ANOMALY_MIN_ABS_DELTA` | 20 | Absolute cost jump required to fire |
| `IDLE_FLAG_AFTER_DAYS` | 15 | Idle days before auto-escalation to FLAGGED |
| `SIMULATOR_ENABLED` | true | Whether the simulator cron runs |
| `CORS_ORIGIN` | `*` | Comma-separated list, or `*` |
| `LOG_LEVEL` | info | |

`config/env.ts` validates all of this at boot and throws with a field-by-field
message rather than starting half-configured.

---

## Where this differs from BACKEND.md

Each of these is an addition or a correction, not a substitution:

1. **`Resource.status` defaults to `RUNNING`.** The spec's Prisma block says
   `@default(ACTIVE)`, but `ACTIVE` is not a member of `ResourceStatus`
   (`RUNNING | STOPPED`) — as written it would not compile.
2. **`Recommendation` and `Alert` got real relations.** The spec has bare
   `resourceId` / `userId` strings. Relations give referential integrity and let
   deletes cascade instead of orphaning rows.
3. **`Resource.idleSince` added.** The spec's "idle persists past N days" rule
   needs a start timestamp; there was nowhere to store one.
4. **Unique constraint on `UsageMetric(resourceId, timestamp)`.** Makes ingest
   and backfill idempotent. Without it a retried request double-counts cost.
5. **Unique constraint on `Tag(key, value)`.** Stops the tag table growing a new
   row per resource for the same tag.
6. **`ANOMALY_MIN_ABS_DELTA` and `IDLE_FLAG_AFTER_DAYS` added to env.** §6.1
   requires a `minAbsDelta` and §5 an `N days`, but neither appears in the
   spec's `.env.example`.
7. **`healthBreakdown` in the twin response.** The score alone is not actionable;
   the breakdown says which deductions produced it.
8. **Extra simulator routes** (`/tick`, `/backfill`, `/detect`) beyond the
   spec's `/inject`, so the demo can be driven without waiting on cron.
9. **Currency is written `Rs` in generated strings**, not `₹`, to avoid encoding
   problems in CSV exports and console output.
10. **Node 25** is what is installed here; the spec says Node 20. Nothing in the
    code depends on the difference.

---

## What is verified and what is not

**Verified on this machine:**
- `npx tsc --noEmit` passes with zero errors across all 69 TypeScript files.
- `npm test` — 46 tests pass, covering the statistics, the lifecycle state
  machine and the health score.

**Not verified — needs a live database:**
- `prisma migrate dev` has never been run, so the schema is unapplied.
- The seed, the backfill, and every HTTP endpoint are untested against real
  data.

Point `DATABASE_URL` at a Postgres instance and run the migrate/seed sequence
above; that is the first thing to do before trusting any of the runtime paths.
