# CloudGuard — Frontend

React + TypeScript + Vite SPA for the CloudGuard platform. Consumes the REST API
in `../backend`. Built to the **Figma design** (file `94GrmXKw…`), not the plain
description in `FRONTEND.md` — the design is a light cream console with a dark
sidebar and a lime accent, which is what this implements.

Phases 1–8 of `FRONTEND.md` are built. Phase 9 (S3/CloudFront deploy) is not.

---

## Running it

```bash
npm install
cp .env.example .env      # VITE_API_URL defaults to http://localhost:4000/api
npm run dev               # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:4000`, so start the backend
first (see `../backend/README.md`). Without the backend + database running, the
login screen renders but no data loads — every page will show its error state.

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with `/api` proxy |
| `npm run build` | Typecheck (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run typecheck` | `tsc --noEmit` |

---

## Design tokens

Extracted directly from the Figma node tree into `tailwind.config.js`:

| Token | Value | Use |
|---|---|---|
| `canvas` | `#FAF9F5` | page background |
| `ink` | `#111315` | sidebar, primary buttons, text |
| `lime` | `#D7FB38` | signature accent, affirmative actions |
| `healthy` | `#10B981` | running / healthy |
| `warning` | `#D97706` | idle |
| `danger` | `#DC2626` | anomalies / high severity |

Fonts: Plus Jakarta Sans (display), Inter (body), JetBrains Mono (labels/data).

Rendered reference PNGs of all 15 Figma frames are in `../design/`.

---

## Structure

```
src/
├── api/          axios client + one typed module per backend area
├── hooks/        React Query hooks (queries + mutations with invalidation)
├── store/        Zustand: authStore (persisted), uiStore
├── lib/          rbac, format (₹/%/dates), utils, queryClient
├── types/api.ts  every backend response, hand-mirrored
├── components/
│   ├── ui/       Button, Card, Badge, Input, Dialog/Drawer
│   ├── layout/   Sidebar, Topbar, PageShell, route guards
│   ├── charts/   CostTrend, Utilization, History (Recharts)
│   ├── common/   StatCard, HealthGauge, badges, states, Toast, ConfirmDialog
│   ├── resources/ResourceForm (drawer)
│   └── twin/     LifecycleStrip
├── pages/        one per route
└── routes.tsx    route table + Protected/Role guards
```

## Routes & role gating

| Route | Access |
|---|---|
| `/login`, `/register` | public |
| `/dashboard`, `/resources`, `/resources/:id`, `/anomalies`, `/idle`, `/recommendations`, `/alerts`, `/settings` | any signed-in user |
| `/budgets` | Editor + Admin |
| `/users`, `/audit` | Admin only |

`ProtectedRoute` redirects to `/login` without a token; `RoleRoute` gates the
admin/editor pages. Action buttons are also hidden per-role via `can()` in
`lib/rbac.ts` — but this is UX only; the backend enforces every rule too.

## Auth flow

`authStore` persists `{ token, user }` to localStorage. The axios request
interceptor attaches `Authorization: Bearer <token>`; the response interceptor
calls `logout()` on any 401, dropping the user back to login.

---

## Demo (the two screens to show)

1. **Twin of the cost-spike resource** (`api-gateway-prod-01`) — health ring,
   lifecycle strip, dual-line history with the anomaly marked, the ₹80→₹250
   Detected Issue card, and the optimization recommendation, all on one screen.
2. **Idle page** — the idle resources with their evidence and one-click apply.

`Settings` (Admin) has the **Inject Spike** control — paste a resource ID, fire
a spike, and detection runs immediately so the anomaly appears on its twin.
This maps to the backend's `POST /simulator/inject`.

---

## Verified vs not

**Verified on this machine:**
- `tsc --noEmit` — 0 errors across ~60 source files.
- `vite build` — succeeds, 2679 modules.
- Dev server renders the login screen with no console errors.

**Not verified — needs the backend + a database:**
- No screen past login has been exercised against real data, because the
  backend has no database configured yet. Once `../backend` is pointed at a
  Postgres and seeded, each page can be tested end to end.

## Deviations from FRONTEND.md

- **Aesthetic**: built the Figma's light theme, not the spec's "dark console".
- **SSO buttons** (GitHub/Okta) on login are rendered but disabled — the backend
  authenticates with email + password only.
- **shadcn/ui**: not vendored as a dependency; the handful of primitives needed
  (Button, Card, Badge, Input, Dialog) are hand-written in `components/ui` in the
  same spirit, to keep the bundle lean and the styling matched to the tokens.
- Simulator/demo controls live on the **Settings** page (Admin only).
