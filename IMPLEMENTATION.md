# Yogella — implementation

A production build-out of the `Yogella.dc.html` Claude Design prototype (see
`README.md`, `chats/`, `project/` for the original design handoff).

- `server/` — Express + TypeScript + Prisma/PostgreSQL API: auth, catalog,
  favorites/progress, Stripe subscription billing, and an admin API
  (courses, programs, users, plans, video upload).
- `web/` — React + TypeScript + Vite mobile-first web app implementing all
  12 screens from the prototype (Accueil, Explorer, Catégorie, Programme,
  Recherche, Lecteur, Article, Ma pratique, Experts, Favoris, Profil,
  Administration) plus the paywall and new Login/Register screens (the
  prototype had no real auth, so these didn't exist there).

## Running locally

Requires PostgreSQL running locally.

```bash
# 1. Database
createdb yogella   # or: psql -c "CREATE DATABASE yogella"

# 2. Server
cd server
cp .env.example .env   # edit DATABASE_URL / JWT_SECRET as needed
npm install
npx prisma migrate dev
npm run seed            # creates demo data + admin login
npm run dev              # http://localhost:4000

# 3. Web app (separate terminal)
cd web
npm install
npm run dev              # http://localhost:5173 (proxies /api to :4000)
```

Demo admin login: `estelle@yogella.fr` / `password123`.

## Stripe billing

Subscription checkout/portal endpoints require `STRIPE_SECRET_KEY` (and
`STRIPE_WEBHOOK_SECRET` for the webhook) in `server/.env`. Without a key
configured, the checkout/portal endpoints return a clear 503 rather than
failing silently — pricing itself is still fully editable from the admin
panel. Plans fall back to Stripe's inline `price_data` if no
`STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` price IDs are set.

## Video storage

Admin-uploaded course videos are stored on local disk under
`server/uploads/` and served at `/uploads/...`. `server/src/lib/upload.ts`
is the single place that would need to change to swap in S3 or another
object store for a multi-instance deployment.

## Notable design decisions vs. the prototype

- The prototype rendered a fake phone bezel/status bar for the clickable
  demo; the real app is a plain responsive mobile-first web app (no fake
  hardware chrome), matching the phone-width layout, colors, type and
  radii from the Organic design system (`project/_ds/…/styles.css`,
  ported into `web/src/styles/tokens.css`).
- The prototype only *simulated* state in memory (subscription status,
  admin CRUD, per-day activity). All of that is now real, persisted data:
  Postgres via Prisma, real auth sessions, real Stripe subscriptions, and
  watch-progress rows driving the "Ma pratique" stats.
- "Routines" (Ma pratique) and "Programmes" (Explorer/Home) share one
  `Program` model (`isRoutine` flag) since they're the same shape:
  a titled, ordered list of course sessions.
