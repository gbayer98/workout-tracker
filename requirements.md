# Workout Tracker — Requirements (v1)

## Elevator Pitch

A mobile-first web app for tracking gym workouts. Users log in, create and organize lifts into named workouts, then track their sets/reps/weight during sessions. Tapping any lift shows a history graph of progress over time. A body weight tracker lets users monitor their weight trend.

---

## User Roles

| Role | Description |
| --- | --- |
| **User** | Logs in, manages lifts, creates workouts, logs sessions, tracks body weight |

### Test Accounts (v1)

| Username | Password |
| --- | --- |
| Jake | temporary123 |
| Kate | temporary123 |

Passwords are hashed with bcrypt in the seed script. These are temporary test credentials.

### Seed Data (1 Month of Realistic History)

The seed script should populate **one month** of realistic workout data for Jake so the charts and history features are immediately testable:

- **3 workouts created:** "Push Day" (bench press, overhead press, tricep pushdown, lateral raise), "Pull Day" (deadlift, barbell row, lat pulldown, bicep curl), "Leg Day" (squat, leg press, lunges, calf raise)
- **\~12 sessions** spread across 4 weeks (3x/week pattern: Mon Push, Wed Pull, Fri Legs)
- **Progressive overload pattern:** reps gradually increase over sessions at the same weight, then weight bumps up and reps reset lower (matching the lift history chart style)
- **3–5 sets per lift per session** with realistic weight/rep values
- **Body weight entries:** ~12 readings over the month showing a slight downward trend (e.g., 185 → 182 lbs)
- All data attributed to Jake's account; Kate starts fresh

---

## Terminology

| Term | Meaning |
| --- | --- |
| **Lift** | A single exercise (e.g., Bench Press, Squat, Bicep Curl) |
| **Workout** | A named group of lifts (e.g., "Arms", "Legs", "Chest Day") |
| **Session** | An active workout in progress — the data entry screen where reps/weight are logged |
| **Set** | One entry of reps + weight for a lift within a session |

---

## Core Features

### 1. Authentication

- Login page with username + password
- Session-based auth via NextAuth v5 (Credentials provider)
- Protected routes — redirect to `/login` if unauthenticated
- Logout in settings/header

### 2. Lifts

- View all available lifts (pre-seeded common lifts + user-created)
- Pre-seeded with ~25 common lifts (bench press, squat, deadlift, overhead press, barbell row, bicep curl, tricep pushdown, lat pulldown, leg press, calf raise, lunges, Romanian deadlift, shoulder press, lateral raise, face pull, cable fly, incline bench, leg curl, leg extension, pull-up, dip, plank, hammer curl, skull crusher, seated row)
- Create custom lifts (name + muscle group)
- **Tap any lift → see a history graph** with dual Y-axes on the same chart:
  - **Weight (blue, left axis):** step-line that increases in discrete jumps when the user progresses
  - **Reps (red, right axis):** line that gradually climbs, then resets when weight increases
  - X-axis is date; data points come from all logged sets for that lift
- Lifts are global (shared across users) for pre-seeded ones; user-created lifts are owned by the user

### 3. Workouts (Named Groups of Lifts)

- Create a workout by selecting multiple lifts and giving it a name
- Examples: "Arms", "Legs", "Push Day", "Full Body"
- Edit workouts (rename, add/remove lifts)
- Delete workouts
- Each user manages their own workouts

### 4. Sessions (Active Workout Tracking)

- Start a session by selecting a workout
- **One scrollable page** showing all lifts in the workout
- For each lift:
  - Shows the **last recorded weight and reps** (from most recent session) so the user knows what to load
  - Input fields for weight and reps
  - "Add Set" button to log multiple sets per lift
  - Sets display as rows: Set 1, Set 2, etc.
- "Finish Workout" button saves all data
- "Cancel" with confirmation prompt
- Timer showing elapsed time (client-side, start time saved to DB)

### 5. Body Weight Tracker

- Enter a body weight reading (number input + date, defaults to today)
- View a line chart of body weight over time (all entries plotted chronologically)
- Simple trend view — no calculations or averages needed in v1

### 6. Navigation

- Bottom tab bar (mobile pattern) with 3 tabs:
  - **Lifts** — browse/create lifts, tap for history
  - **Workouts** — create/manage workout groups, start sessions
  - **Weight** — body weight tracker
- User name + logout in header area

---

## Data Model

### User
- id, username (unique), password (hashed), createdAt

### Lift
- id, name, muscleGroup, isGlobal (boolean), userId (null if global)
- Pre-seeded lifts have isGlobal=true, userId=null
- User-created lifts have isGlobal=false, userId=creator

### Workout
- id, name, userId (owner), createdAt

### WorkoutLift (join table)
- id, workoutId, liftId, order

### Session
- id, userId, workoutId, startedAt, finishedAt

### SessionSet
- id, sessionId, liftId, setNumber, weight (decimal), reps (integer), createdAt

### BodyWeight
- id, userId, weight (decimal), recordedAt (date)

---

## Business Rules & Constraints

1. Users can only see/edit their own workouts and sessions
2. Pre-seeded lifts are visible to all users (isGlobal=true)
3. User-created lifts are only visible to their creator
4. Weight is stored as a decimal (lbs) — no unit conversion in v1
5. Reps are integers
6. Only one session can be active at a time per user (finishedAt is null)
7. Deleting a workout does NOT delete past sessions that used it
8. Lift history graph shows data from all sessions, ordered by date
9. Body weight entries are one per day max (upsert on date)

---

## Out of Scope for v1

- Session history page (list of past workout sessions)
- Superset / compound set grouping
- Warm-up set designation
- Rest timer (auto countdown between sets)
- Exercise images/illustrations
- Aggregate analytics (total volume, PRs, streaks)
- Social features / sharing
- Export / import data
- PWA / offline support
- Unit conversion (lbs ↔ kg)
- Email verification or password reset

---

## Tech Stack

- **Framework:** Next.js (TypeScript, App Router, `src/` directory)
- **Styling:** Tailwind CSS v4, mobile-first (375px baseline)
- **Database:** Neon PostgreSQL via Prisma ORM
- **Auth:** NextAuth v5 (beta) with Credentials provider + bcrypt
- **Charts:** Lightweight client-side charting (Recharts)
- **Deployment:** Vercel (auto-deploy from GitHub `main`)
- **Dev port:** 3030
- **GitHub repo:** `workout-tracker` under `gbayer98`

---

## Design Direction

- Dark theme (inspired by reference screenshots)
- Mobile-first — designed for phone use in the gym
- Large tap targets for gloved/sweaty hands
- Minimal navigation — 3-tab bottom bar
- Clean, high-contrast UI — easy to read under gym lighting
- Numbers and inputs should be large and easy to tap

---

## Pre-seeded Lift List

| Lift | Muscle Group |
| --- | --- |
| Bench Press | Chest |
| Incline Bench Press | Chest |
| Cable Fly | Chest |
| Dip | Chest |
| Overhead Press | Shoulders |
| Lateral Raise | Shoulders |
| Face Pull | Shoulders |
| Squat | Legs |
| Leg Press | Legs |
| Leg Curl | Legs |
| Leg Extension | Legs |
| Lunges | Legs |
| Calf Raise | Legs |
| Deadlift | Back |
| Romanian Deadlift | Back |
| Barbell Row | Back |
| Seated Row | Back |
| Lat Pulldown | Back |
| Pull-Up | Back |
| Bicep Curl | Arms |
| Hammer Curl | Arms |
| Tricep Pushdown | Arms |
| Skull Crusher | Arms |
| Plank | Core |
