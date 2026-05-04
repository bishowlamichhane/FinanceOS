# Finance OS — Nepal

A production-grade personal finance + portfolio tracker for Nepal, built mobile-first.

> **Status:** Phase 1 complete. Auth works end-to-end, the design system is in place, and the dashboard renders against a real (currently empty-state) API.

---

## What's in here

```
finance-os/
├─ apps/
│  ├─ api/         NestJS + Prisma + PostgreSQL
│  └─ mobile/      Expo + React Native + NativeWind
├─ packages/
│  ├─ contracts/      Zod schemas shared between API and mobile
│  ├─ design-tokens/  Single source of truth for colors, spacing, typography
│  └─ utils/          Decimal-safe Money type + financial calculations (32 tests)
└─ turbo.json
```

The repo is a Turborepo + pnpm workspaces monorepo. Both apps share the Zod contracts and the design tokens, so a backend type change immediately surfaces in the mobile app's editor.

## Tech decisions

- **Backend:** NestJS (DI + module structure scales better than Fastify alone for what's coming), Prisma 6, Postgres 17, Argon2id for passwords, JWT pairs with refresh rotation + reuse detection, Zod for all input validation, BullMQ (set up, used in Phase 5), Sentry hooks, Swagger at `/docs`.
- **Mobile:** Expo SDK 52 (RN 0.76 with the new architecture enabled), Expo Router for file-based navigation, Zustand for client state, TanStack Query v5 for server state, React Hook Form + Zod for forms, NativeWind v4 for styling, Reanimated 3 for animations, MMKV for cache, SecureStore for refresh tokens, Victory Native (XL) is queued for Phase 3 charts.
- **Money math:** `decimal.js` everywhere. Money values cross the wire as strings. Float arithmetic is explicitly forbidden — see `packages/utils/src/money.ts`.
- **Database:** Postgres `NUMERIC(18, 4)` for every money column. Every financial table has `user_id`, soft delete, and is captured in the audit log. 25 tables total in the schema, ready for all five phases.

---

## Prerequisites

- Node.js 20.10+ (`node --version`)
- pnpm 9+ (`npm install -g pnpm`)
- Docker (for local Postgres) — or any Postgres 14+ instance
- Expo Go app on your phone (App Store / Play Store)

## First-time setup

```bash
# 1. Install dependencies (pnpm handles workspaces)
pnpm install

# 2. Spin up Postgres (Docker)
docker run -d \
  --name finance-os-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=finance_os \
  -p 5432:5432 \
  postgres:17

# 3. Configure the API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and set JWT_ACCESS_SECRET + JWT_REFRESH_SECRET:
#   openssl rand -base64 64

# 4. Run migrations + seed
pnpm db:migrate
pnpm db:seed
# Seed loads 28 NEPSE symbols + (in dev) a demo user from .env

# 5. Configure the mobile app
cp apps/mobile/.env.example apps/mobile/.env
# IMPORTANT: replace localhost with your machine's LAN IP if you'll run on a real phone.
#   On macOS:   ipconfig getifaddr en0
#   On Linux:   hostname -I | awk '{print $1}'
#   On Windows: ipconfig | findstr /i "IPv4"
# Example:
#   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:4000/v1
```

## Running the stack

Open two terminals:

```bash
# Terminal 1 — backend
pnpm api:dev
# → API on http://localhost:4000/v1
# → Swagger UI at http://localhost:4000/docs

# Terminal 2 — mobile
pnpm mobile:dev
# → Press the QR with the Expo Go app on your phone
# → Or press "i" / "a" to launch a simulator
```

## Useful commands

```bash
pnpm typecheck            # Typecheck the whole monorepo
pnpm test                 # Run all tests (financial calc tests live in packages/utils)
pnpm lint                 # Lint
pnpm db:studio            # Open Prisma Studio (browse the DB visually)
pnpm db:reset             # Wipe + remigrate + reseed
```

---

## What's done in Phase 1

### Foundation

- Monorepo with strict TypeScript (`noUncheckedIndexedAccess`, `noImplicitOverride`)
- Design tokens: dark + light themes, Manrope display + Inter body + JetBrains Mono, 8-step spacing, three elevation levels
- Money primitive on `decimal.js` with currency safety (cross-currency operations throw)
- Money formatter using `en-IN` locale for NPR (Indian-style grouping: `Rs 1,24,500`)
- Eight pure financial calculations in `packages/utils/src/finance.ts`:
  - `computeNetWorth`, `computeCashflow`, `computeAccountBalance`
  - `replayStockEvents` (full WACC across BUY/SELL/IPO/BONUS/RIGHT/SPLIT/DIVIDEND/ADJUSTMENT)
  - `computeGainLoss`, `computeAllocation`, `computeDebtPayoff`, `computeBudgetUtilization`, `computeHealthScore`
- 32 unit tests covering all of the above, including a Nepal-realistic flow (IPO + buy + bonus + right + sell) producing `WACC = 110.00`

### Backend (NestJS)

- Zod-validated env config (crashes early with a clear error if anything is missing)
- All 25 tables in the Prisma schema with proper indexes, soft-delete, multi-currency-ready columns, and an append-only audit log
- Auth flow: register, login, refresh (with rotation + reuse detection), logout, logout-all, forgot-password, reset-password, /me, /sessions
- Argon2id password hashing with OWASP-recommended parameters
- Refresh token rotation: each refresh issues a new pair and marks the old session as `replacedById`. Presenting a token for an already-replaced session triggers chain revocation (theft mitigation).
- Dashboard endpoint that aggregates from real data (returns valid empty values for new users)
- Health endpoint, global exception filter with uniform `{ error: { code, message } }` shape, Helmet, CORS allowlist, per-IP rate limiting (120/min default, tighter for auth)
- Swagger at `/docs` in dev
- Seed script with 28 NEPSE symbols (banks, hydropower, insurance, microfinance, manufacturing, hotels, telecom, trading)

### Mobile (Expo)

- Expo Router with auth stack + main tab stack + auth gate
- Theme system: dark default (per the screen references), full light alternative, persisted preference, system-match option
- 11 design system primitives: `Text`, `Button`, `Card`, `Input`, `Sheet`, `Skeleton`, `EmptyState`, `ErrorState`, `StatCard`, `AccountCard`, `TransactionItem`, `Badge`
- Auth screens: Welcome, Login, Register, Forgot Password, Create PIN, Unlock PIN
- 6-digit app PIN with biometric unlock fallback (Face ID / Fingerprint), 5-attempt limit before re-auth
- Auth Zustand store with state machine: `bootstrapping → unauthenticated / authenticated / pin_locked`
- Axios client with refresh-on-401 + concurrent-request coalescing
- Five-tab navigator with BlurView background on iOS
- Real Dashboard with all four states (loading skeleton / empty / error+retry / success), pull-to-refresh, hero net worth card, two stat cards, quick actions, recent activity
- Phase 2/3/4/5 placeholder tabs that respect the design language and tell you what's coming
- Working "More" tab with profile, theme switcher, sign out

---

## Roadmap

- **Phase 2 — Core Money Flow.** Accounts, transactions (with split + tags + recurring), categories, transfer flow, real Dashboard numbers
- **Phase 3 — Net Worth Picture.** Budgets with alerts, assets with valuation history, liabilities with amortization, financial health score
- **Phase 4 — NEPSE / MeroShare.** Stock holdings, MeroShare CSV import, portfolio analytics, watchlist with price alerts
- **Phase 5 — Imports, Reports, Polish, Ship.** Bank CSV import with templates, monthly + yearly reports, PDF export, notifications, full settings, EAS preview build

---

## Project conventions

- **Money values are strings on the wire.** Always wrap them in `Money.from(amount, currency)` before doing math.
- **Never reach into `process.env` directly.** Inject `AppConfig` (API) or `Constants.expoConfig?.extra` (mobile).
- **Every screen has four states:** loading, empty, error (with retry), success. No exceptions.
- **Haptics fire on every primary interaction.** Wrap in `haptics.tap()` etc. so it can be disabled.
- **Currency-aware everywhere.** Default is NPR but every money column has a currency code so multi-currency support is a feature flip, not a refactor.
