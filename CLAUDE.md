# CLAUDE.md — Workout Tracker

## Project Context

A mobile-first workout tracking web app. Users manage lifts, create workouts (groups of lifts), log sessions with weight/reps, and track body weight over time. Tapping any lift shows a dual-axis history chart.

**Key Documents:**
- `requirements.md` — Features, data model, business rules, terminology
- `development-process.md` — Build modules with entry/exit criteria
- `new-project-playbook.md` — Proven patterns from the Customer Delivery Portal

## Tech Stack

- **Next.js** with TypeScript, App Router, `src/` directory
- **Tailwind CSS v4** with `@theme inline` (no tailwind.config.js)
- **Prisma ORM** with Neon PostgreSQL
- **NextAuth v5** (beta) with Credentials provider + bcrypt
- **Recharts** for lift history and body weight charts
- **Vercel** for deployment (auto-deploy from `main`)

## Terminology — USE THESE TERMS

| Term | Meaning |
| --- | --- |
| **Lift** | A single exercise (Bench Press, Squat, etc.) — NOT "exercise" |
| **Workout** | A named group of lifts ("Arms", "Legs") — NOT "routine" |
| **Session** | An active workout being tracked — NOT "workout" when referring to the live tracking |
| **Set** | One entry of reps + weight for a lift within a session |

## Code Standards

### General
- TypeScript strict — no `any` without justification
- Server components by default; client components only for interactivity (forms, charts, modals)
- Keep code simple and readable — clarity over cleverness
- Comments only where logic isn't self-evident
- No over-engineering — build exactly what's needed for v1

### File Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout (fonts, theme, auth provider)
│   ├── globals.css         # Tailwind v4 theme with CSS variables
│   ├── page.tsx            # Redirects to /home or /login
│   ├── login/page.tsx      # Username + password login
│   ├── home/               # Dashboard: stats, PRs, recent activity
│   ├── lifts/              # Lift browsing, creation, history charts
│   ├── workouts/           # Workout CRUD, start session
│   ├── session/            # Active session data entry
│   ├── weight/             # Body weight tracker + chart
│   └── api/                # API routes organized by entity
│       ├── auth/[...nextauth]/route.ts
│       ├── dashboard/
│       ├── lifts/
│       ├── workouts/
│       ├── sessions/
│       └── weight/
├── components/             # Shared UI components
│   ├── BottomNav.tsx
│   ├── Header.tsx
│   └── LiftHistoryChart.tsx
└── lib/
    ├── auth.ts             # NextAuth configuration
    └── prisma.ts           # Prisma singleton (REQUIRED)
```

### Database
- Always use the Prisma singleton pattern (`src/lib/prisma.ts`)
- Run migrations with `npx prisma migrate dev --name description`
- Build script MUST be: `"prisma generate && next build"`
- Use `cuid()` for all primary keys
- Cascade deletes on child records (SessionSet → Session, WorkoutLift → Workout)

### Authentication
- Username + password login (NOT email)
- NextAuth v5 Credentials provider
- Protect all routes except `/login` via layout-level auth check
- API routes check `auth()` and return 401 if unauthorized
- Test accounts: Jake / temporary123, Kate / temporary123

### Styling
- Dark theme — dark backgrounds, light text, high contrast
- Mobile-first (375px baseline) — design for phones in the gym
- Large tap targets (min 44px) for sweaty/gloved hands
- Use Tailwind v4 `@theme inline` for custom colors in `globals.css`
- For chart components: use inline styles with pixel values (not percentage heights in flex containers — known Tailwind/hydration issue)
- Bottom tab navigation (4 tabs: Home, Lifts, Workouts, Weight)

### API Routes
- Organize by entity: `/api/lifts`, `/api/workouts`, `/api/sessions`, `/api/weight`
- Check auth first in every route
- Validate required fields early
- Return proper HTTP status codes (201 create, 400 validation, 401 auth, 404 not found)
- Use Prisma transactions for multi-step operations

### Charts (Recharts)
- **Lift history:** ComposedChart with dual Y-axes. Weight = blue step-line (left axis), Reps = red line (right axis), X-axis = date
- **Body weight:** Simple LineChart, weight on Y-axis, date on X-axis
- Charts are client components (`"use client"`)
- Use inline styles for chart container dimensions (avoid percentage heights)

## Scripts

```json
{
  "dev": "next dev --port 3030",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "eslint",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio"
}
```

## Deployment

- GitHub repo: `workout-tracker` under `gbayer98`
- Deploy to Vercel immediately (skip local server testing — known port issues)
- Vercel env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (production URL, NOT localhost)
- Vercel auto-deploys on push to `main`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Known Gotchas (from Customer Delivery Portal)

1. `prisma generate` MUST run before `next build` — Vercel deployment will fail without it
2. Prisma singleton pattern is mandatory — prevents connection leaks on hot reload
3. Percentage heights in flex containers don't work reliably — use pixel values for charts
4. `NEXTAUTH_URL` must be the production URL on Vercel, not localhost
5. Tailwind v4 uses `@theme inline {}` in CSS, not `tailwind.config.js`
6. NextAuth v5 is beta — API differs from v4 docs found online
7. Always hash passwords with bcrypt in seed scripts
8. Port 3030 for dev to avoid conflicts
9. Test at 375px width early — most users will be on phones
