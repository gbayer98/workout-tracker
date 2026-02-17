# Development Process — Workout Tracker v1

Build sequentially. No module begins until the previous module's exit criteria are fully met. Every module ends with `npm run build` passing.

---

## Module 1: Project Scaffold

**Entry:** Empty project directory with planning docs

**Tasks:**
1. Run `create-next-app` with TypeScript, Tailwind, App Router, `src/` directory
2. Set dev port to 3030 in package.json
3. Install dependencies: prisma, @prisma/client, next-auth@beta, bcrypt, @types/bcrypt, tsx, recharts
4. Set build script to `"prisma generate && next build"`
5. Add all package.json scripts (dev, build, start, lint, db:seed, db:studio)
6. Clear boilerplate (default page content, unused assets)
7. Set up Tailwind v4 dark theme in globals.css with CSS variables and `@theme inline`
8. Create root layout with font imports and dark background

**Exit:** `npm run build` passes. Dark-themed empty page renders. All dependencies installed.

---

## Module 2: Database & Data Model

**Entry:** Module 1 complete

**Tasks:**
1. Run `npx prisma init`
2. Configure `.env` with Neon DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
3. Create Prisma singleton at `src/lib/prisma.ts`
4. Define schema models: User, Lift, Workout, WorkoutLift, Session, SessionSet, BodyWeight
5. Run `npx prisma migrate dev --name init`
6. Create seed script (`prisma/seed.ts`) with:
  - 2 test users (Jake, Kate) with bcrypt-hashed passwords
  - 24 pre-seeded global lifts across 6 muscle groups
  - 3 workouts for Jake (Push Day, Pull Day, Leg Day)
  - ~12 sessions over 4 weeks with progressive overload data
  - 3-5 sets per lift per session with realistic weight/rep values
  - ~12 body weight entries showing slight downward trend
  - Kate starts fresh (no data)
7. Run `npm run db:seed` and verify data in Prisma Studio

**Exit:** `npm run build` passes. Database has test data. `npm run db:studio` shows all tables populated correctly.

---

## Module 3: Authentication

**Entry:** Module 2 complete

**Tasks:**
1. Create `src/lib/auth.ts` — NextAuth config with Credentials provider (username + password)
2. Create API route `src/app/api/auth/[...nextauth]/route.ts`
3. Create `/login` page — username and password form, dark themed, mobile-friendly
4. Create root layout auth check — redirect unauthenticated users to `/login`
5. Add session provider wrapper for client components
6. Display current username in header area
7. Add logout functionality

**Exit:** `npm run build` passes. Jake can log in with username "Jake" / password "temporary123". Unauthenticated users are redirected to login. Logout works.

---

## Module 4: Navigation & Layout Shell

**Entry:** Module 3 complete

**Tasks:**
1. Create `BottomNav` component with 3 tabs: Lifts, Workouts, Weight
2. Create `Header` component with username display and logout button
3. Create page shells for `/lifts`, `/workouts`, `/weight`
4. Set up authenticated layout with Header + BottomNav wrapping all protected pages
5. Style for mobile — bottom nav fixed, content area scrollable, large tap targets (44px+)

**Exit:** `npm run build` passes. Logged-in user sees header with name, 3 tab navigation at bottom, can switch between empty Lifts/Workouts/Weight pages.

---

## Module 5: Lifts Page

**Entry:** Module 4 complete

**Tasks:**
1. Create `/lifts` page — list all lifts grouped by muscle group
2. Show pre-seeded global lifts + user-created lifts
3. Add "Create Lift" form/modal (name + muscle group selector)
4. API routes: `GET /api/lifts` (list), `POST /api/lifts` (create)
5. Each lift is tappable — opens lift history view (chart built in Module 8)
6. Search/filter by name or muscle group

**Exit:** `npm run build` passes. All 24 pre-seeded lifts display grouped by muscle group. User can create a custom lift. Lifts are tappable (history chart placeholder for now).

---

## Module 6: Workouts Page

**Entry:** Module 5 complete

**Tasks:**
1. Create `/workouts` page — list user's workouts with lift count
2. "Create Workout" flow: name input + multi-select lifts from available lifts
3. Edit workout: rename, add/remove lifts
4. Delete workout with confirmation
5. Each workout card has a "Start" button (session flow built in Module 7)
6. API routes: `GET /api/workouts`, `POST /api/workouts`, `PUT /api/workouts/[id]`, `DELETE /api/workouts/[id]`

**Exit:** `npm run build` passes. Jake sees his 3 pre-seeded workouts. User can create, edit, delete workouts. Start button visible (links to session page in next module).

---

## Module 7: Active Session

**Entry:** Module 6 complete

**Tasks:**
1. Create `/session/[id]` page — active workout tracking
2. Start session: create Session record with startedAt timestamp
3. One scrollable page showing all lifts in the workout
4. For each lift:
  - Display last recorded weight/reps from most recent session
  - Weight and reps input fields (large, numeric)
  - "Add Set" button to add additional set rows
  - Set rows: Set 1, Set 2, etc. with weight/reps inputs
5. "Finish Workout" button: save all SessionSet records, set finishedAt
6. "Cancel" button with confirmation dialog
7. Running timer showing elapsed time (client-side)
8. API routes: `POST /api/sessions` (start), `PUT /api/sessions/[id]` (finish with sets data)

**Exit:** `npm run build` passes. User can start a workout, enter weight/reps for each lift, add extra sets, see last recorded values, and finish the session. Data persists to database.

---

## Module 8: Lift History Charts

**Entry:** Module 7 complete

**Tasks:**
1. Create `LiftHistoryChart` component using Recharts
2. Dual Y-axis ComposedChart:
  - Weight (blue step-line, left axis)
  - Reps (red line, right axis)
  - X-axis: date
3. Data source: all SessionSets for that lift, aggregated by session date (use max weight and max reps per session)
4. Wire into lifts page — tapping a lift shows the chart (modal, drawer, or drill-down page)
5. API route: `GET /api/lifts/[id]/history` — returns chart data for a specific lift
6. Use inline styles for chart container (not percentage heights)

**Exit:** `npm run build` passes. Tapping any lift with history data shows the dual-axis chart. Jake's pre-seeded data displays the progressive overload pattern (reps climb, weight steps up). Lifts with no data show an empty state message.

---

## Module 9: Body Weight Tracker

**Entry:** Module 8 complete

**Tasks:**
1. Create `/weight` page with:
  - Number input for weight (lbs, one decimal)
  - Date picker defaulting to today
  - "Save" button
2. Body weight line chart (Recharts LineChart) below the input
3. Upsert logic: one entry per day per user
4. API routes: `GET /api/weight` (all entries), `POST /api/weight` (upsert)
5. Jake's seeded data should show the downward trend on the chart

**Exit:** `npm run build` passes. User can enter body weight, see it on the chart. Jake's pre-seeded data shows a month of readings with visible trend.

---

## Module 10: Polish & Mobile Testing

**Entry:** Module 9 complete

**Tasks:**
1. Test all flows at 375px width (mobile)
2. Verify large tap targets (44px minimum)
3. Add loading states for data fetches
4. Add error handling for API failures (toast or inline messages)
5. Handle edge cases:
  - Empty states (no workouts, no lifts, no history)
  - Creating a workout with zero lifts (prevent)
  - Finishing a session with no sets entered (allow but warn)
6. Verify dark theme contrast and readability
7. Test both Jake (with data) and Kate (fresh account) experiences

**Exit:** `npm run build` passes. App is usable on a phone-sized viewport. No broken layouts, missing error handling, or dead-end states.

---

## Module 11: GitHub & Deploy to Vercel

**Entry:** Module 10 complete

**Tasks:**
1. Verify `.gitignore` includes: node_modules/, .next/, .env*, .vercel, /src/generated/prisma
2. Initialize git repo
3. Create initial commit with conventional commit format
4. Create GitHub repo `workout-tracker` under `gbayer98`
5. Push to GitHub
6. Connect to Vercel:
  - Import GitHub repo
  - Set environment variables: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL (production URL)
  - Build command: `prisma generate && next build`
7. Verify production deployment works
8. Test on real device if possible

**Exit:** App is live on Vercel. Both Jake and Kate can log in. All features work in production. Charts render. Data persists.

---

## Module 12: User Acceptance Testing — "Be Jake"

**Entry:** Module 11 complete (app live on Vercel)

**Purpose:** Roleplay as Jake, a real gym user, and walk through every feature as if you're at the gym. Research what a typical gym routine looks like. Think through what Jake would need at every step. Fix anything that feels wrong, missing, or awkward. You have full authority to add features, modify UX, fix bugs, and iterate until the app meets your standards.

**Persona:** Jake is a regular gym-goer who lifts 3x/week (Push/Pull/Legs split). He's at the gym, phone in hand, slightly sweaty. He needs things to be fast, obvious, and not require thinking.

**Walkthrough Script:**

### Day 1: First Login & Setup
1. Log in as Jake — is the login fast and obvious?
2. Look at the Lifts tab — can I see all my lifts? Are they organized well?
3. I want to add "Cable Lateral Raise" — can I create a custom lift easily?
4. Check that the new lift shows up in the right muscle group

### Day 2: Creating a Workout
5. Go to Workouts tab — I want to create a new workout called "Upper Body"
6. Select lifts: Bench Press, Overhead Press, Barbell Row, Bicep Curl, Tricep Pushdown
7. Save it — does it show up in my workout list?
8. Edit it — I want to swap Barbell Row for Seated Row
9. Does the edit flow make sense? Can I reorder lifts?

### Day 3: Logging a Workout Session
10. Start "Push Day" — does the session page load with all the right lifts?
11. For Bench Press: do I see what I lifted last time? (e.g., "Last: 185 lbs × 8 reps")
12. Enter Set 1: 185 lbs × 8 reps — is the input fast? Do I need to tap too many times?
13. Add Set 2, Set 3 — is adding sets intuitive?
14. Move to Overhead Press — same flow, different weights
15. Am I overwhelmed by the amount of info on screen, or is it clean?
16. Check the timer — is it visible but not distracting?
17. Finish the workout — does it save cleanly? Where does it take me?

### Day 4: Checking Progress
18. Go to Lifts tab, tap "Bench Press"
19. Does the history chart show my progress clearly?
20. Can I see the step pattern (weight jumps) and rep progression?
21. Does the chart look good on a phone screen?
22. Check a lift with no history — is the empty state helpful?

### Day 5: Body Weight
23. Go to Weight tab — enter today's weight (183 lbs)
24. Does the chart show my trend over the past month?
25. Is the input simple (just a number and save)?

### Day 6: Kate's Fresh Experience
26. Log out and log in as Kate
27. Kate has no data — are empty states clear and guiding? ("Create your first workout", etc.)
28. Can Kate see the pre-seeded lifts?
29. Can Kate create a workout and start a session from scratch?

### Quality Checks
- Is every interaction fewer than 3 taps to accomplish?
- Are numbers large enough to read at arm's length?
- Does anything feel slow or janky?
- Are there any dead ends (pages with no clear next action)?
- Would I actually use this app in the gym, or would I go back to a notebook?

**Authority:** Fix anything that doesn't pass the sniff test. Add missing UX, improve flows, add empty states, adjust layouts. Iterate multiple times if needed. Push fixes to Vercel after each round of improvements.

**Exit:** The app passes the full walkthrough for both Jake and Kate without any friction, confusion, or dead ends. Every feature works as a real gym-goer would expect. You would actually recommend this app to a friend.

---

## Summary

| Module | Description | Key Deliverable |
| --- | --- | --- |
| 1 | Project Scaffold | Next.js app with dark theme, all deps installed |
| 2 | Database & Data Model | 7 Prisma models, seed data with 1 month of history |
| 3 | Authentication | Username/password login with NextAuth v5 |
| 4 | Navigation & Layout | Bottom tab bar, header, page shells |
| 5 | Lifts Page | Browse, create, filter lifts by muscle group |
| 6 | Workouts Page | CRUD workouts (named groups of lifts) |
| 7 | Active Session | Live workout tracking with weight/reps/sets |
| 8 | Lift History Charts | Dual-axis Recharts graphs per lift |
| 9 | Body Weight Tracker | Weight entry + trend line chart |
| 10 | Polish & Mobile | Edge cases, error handling, 375px testing |
| 11 | GitHub & Deploy | Push to GitHub, deploy to Vercel, verify production |
| 12 | "Be Jake" UAT | Full user walkthrough, iterate until app meets real-world standards |
