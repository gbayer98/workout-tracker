# Is the current state of the project saved so that if something goes wrong, you can revert back to the current state? V2 Upgrades — Assessment & Implementation Plan

## Rating Scale
- **Difficulty 1-5**: High confidence — can knock this out on the first try
- **Difficulty 6-8**: Moderate — may need iteration or debugging
- **Difficulty 9-10**: Complex — multiple systems affected, likely needs multiple passes

---

## 1. Lift Types (Strength / Bodyweight / Endurance)

**Difficulty: 4/10**

**What changes:**
Currently all lifts track weight + reps. This introduces three lift types:
- **Strength** — weight (lbs) + reps (existing behavior)
- **Bodyweight** — reps only (e.g., push-ups, pull-ups, sit-ups)
- **Endurance** — time in seconds/minutes (e.g., plank, wall sit, running in place)

**Implementation:**
1. **Schema**: Add `type` enum (`STRENGTH`, `BODYWEIGHT`, `ENDURANCE`) to `Lift` model. Default to `STRENGTH` for backward compatibility. Migrate existing lifts.
2. **Seed**: Categorize pre-seeded lifts — Pull-Up → `BODYWEIGHT`, Plank → `ENDURANCE`, rest → `STRENGTH`.
3. **Create Lift UI**: Add type selector (three buttons/tabs) when creating a new lift.
4. **Session UI**: Conditionally render inputs per type:
  - Strength: Weight + Reps fields (current)
  - Bodyweight: Reps field only (hide weight, store weight as 0 or null)
  - Endurance: Time input (MM:SS) — store as seconds in a new `duration` column on `SessionSet`
5. **SessionSet schema**: Add optional `duration Int?` column for endurance sets.
6. **History chart**: Adapt per type — Strength shows weight+reps, Bodyweight shows reps only, Endurance shows duration.
7. **Dashboard stats**: Volume calculation skips bodyweight/endurance lifts (or calculates differently — reps × bodyweight for bodyweight lifts if we want to get fancy later).

**Files touched:** `schema.prisma`, `seed.ts`, `lifts-client.tsx`, `session-client.tsx`, `LiftHistoryChart.tsx`, `/api/lifts/route.ts`, `/api/lifts/[id]/history/route.ts`, `/api/dashboard/route.ts`

---

## 2. Sanity Checks (Quirky "Are You Sure?" Prompts)

**Difficulty: 3/10**

**What changes:**
Add contextual validation prompts throughout the app when user input looks suspicious or unusual.

**Sanity checks to implement:**

| Location | Trigger | Message |
| --- | --- | --- |
| Session — weight input | Entered weight is ≥ 2× last session's weight for that lift | "Whoa — that's double what you did last time. Feeling superhuman? 🦸" |
| Session — reps input | Entered reps ≥ 2× last session's reps | "That's twice the reps from last time. Are you sure you counted right?" |
| Session — weight input | Weight is 0 or negative | "Pretty sure that's not how gravity works. Check your weight?" |
| Session — reps input | Reps > 100 | "100+ reps? That's either cardio or a typo." |
| Session — weight input | Weight > 1000 lbs | "Over 1,000 lbs? Are you a forklift? Double-check that number." |
| Body weight entry | Weight changed > 10 lbs from last entry | "That's a big jump from your last weigh-in. Sure about that?" |
| Body weight entry | Weight < 50 or > 500 lbs | "That doesn't look like a human weight. Want to double-check?" |
| Session — finish | No sets logged for any lift | "You're finishing without logging anything for [Lift]. Skip it on purpose?" |
| Session — finish | Session lasted < 5 minutes | "5-minute workout? Speed run? Just making sure you're done." |
| Create lift | Lift name matches existing lift (fuzzy) | "There's already a lift called '[name]'. Want to use that instead?" |

**Implementation:**
1. Create a reusable `SanityCheckModal` component — modal overlay with the message, "Yes, I'm sure" and "Let me fix that" buttons.
2. In `session-client.tsx`: wrap set input handlers with sanity check logic. Before committing a value, compare against last session data (already fetched).
3. In `weight-client.tsx`: check on submit against last body weight entry.
4. In `lifts-client.tsx`: fuzzy match on lift name before creating.

**Files touched:** New `components/SanityCheckModal.tsx`, `session-client.tsx`, `weight-client.tsx`, `lifts-client.tsx`

---

## 3. Green Checks — Gray Out Completed Sets

**Difficulty: 2/10**

**What changes:**
When a user taps the green checkmark on a set during a session, that set row should visually gray out and become read-only (inputs disabled). The user moves on to the next set. This prevents accidental edits to already-completed sets.

**Implementation:**
1. Add a `completed` boolean to the set state in `session-client.tsx`.
2. When checkmark is tapped: set `completed = true`, disable weight/reps inputs, apply gray styling (`opacity-50`, `pointer-events-none` on inputs).
3. The checkmark becomes a static gray check (not interactive) once completed.
4. Allow un-checking only via a deliberate long-press or "Edit" button (to prevent accidental undos too).

**Files touched:** `session-client.tsx`

---

## 4. Workouts Remember Last Session State

**Difficulty: 4/10**

**What changes:**
When starting a workout, pre-populate all lifts with the weights, reps, and set count from the last time that workout was performed. Currently, the session page shows "last weight/reps" as reference text but doesn't pre-fill inputs.

**Implementation:**
1. **API change** (`GET /api/sessions/[id]`): Already fetches `lastByLift` data. Extend to return full set breakdown (all sets, not just max) from the most recent finished session of the same workout.
2. **Session client**: On load, pre-populate the set grid with last session's data — same number of sets, same weights, same reps. User can then modify as needed.
3. **State initialization**: Instead of starting with 1 empty set per lift, start with N sets pre-filled from last session. If no previous session exists, fall back to 1 empty set.

**Files touched:** `/api/sessions/[id]/route.ts` or new endpoint, `session-client.tsx`

---

## 5. Remove Personal Best from Home Screen

**Difficulty: 1/10**

**What changes:**
Remove the "Top Personal Records" section from the home dashboard.

**Implementation:**
1. Remove the PR section from `home-client.tsx`.
2. Optionally remove the `personalRecords` query from `/api/dashboard/route.ts` (or leave it for the leaderboard feature later).

**Files touched:** `home-client.tsx`, optionally `/api/dashboard/route.ts`

---

## 6. Replace "Volume" with "Mass Moved"

**Difficulty: 2/10**

**What changes:**
Rename the "Volume" stat card on the home screen to "Mass Moved" and keep the same calculation (sum of weight × reps across all sets in the time period). Just a terminology change + keeping the rollup concept.

**Implementation:**
1. In `home-client.tsx`: Change the label from "Volume" to "Mass Moved".
2. Format with units (e.g., "12,450 lbs" or "12.4K lbs").
3. Keep the week-over-week comparison logic intact.

**Files touched:** `home-client.tsx`

---

## 7. Leaderboard (Cross-Account Competition)

**Difficulty: 8/10**

**What changes:**
A new page/tab showing a leaderboard where users compete on specific, immutable lift categories. The leaderboard tracks personal bests across all accounts.

**Leaderboard categories:**
| Category | Metric | Rule |
| --- | --- | --- |
| Bench Press | Max weight | Must have completed ≥ 3 reps at that weight |
| Squat | Max weight | Must have completed ≥ 3 reps at that weight |
| Workouts This Week | Count | Number of finished sessions in current Mon-Sun week |
| Push-Ups | Max reps | Single set, bodyweight only |

**Implementation:**
1. **Schema**: Create `LeaderboardCategory` model (id, name, liftId?, metric, rule description, displayOrder). Seed with the 4 categories above. These are system-level, not user-editable.
2. **API** (`/api/leaderboard`):
  - `GET`: For each category, query all users' qualifying bests. For bench/squat: find max weight from SessionSets where reps ≥ 3 and the lift matches. For workouts this week: count sessions. For push-ups: find max reps for push-up lift.
  - Returns ranked list per category with username, value, and date achieved.
3. **Leaderboard page** (`/leaderboard`):
  - Show each category as a card/section.
  - Clearly display the qualification rule (e.g., "Bench Press — heaviest weight with at least 3 reps").
  - Ranked table: position, username, value, date.
  - Highlight current user's row.
4. **Navigation**: Add Leaderboard tab to BottomNav (5th tab, or replace one — need to decide).
5. **Immutability**: Leaderboard categories are seeded and not editable via UI. No API to create/modify categories.

**Why difficulty 8:** This is the first cross-user feature. Need to query across all users, handle edge cases (no qualifying lifts, ties), design a new page, modify navigation, and ensure the qualification rules are bulletproof. The push-ups category requires the bodyweight lift type from upgrade #1 to exist first.

**Dependencies:** Upgrade #1 (Lift Types) should be done first so Push-Ups can be a `BODYWEIGHT` type lift.

**Files touched:** `schema.prisma`, `seed.ts`, new `leaderboard/` page + client, `/api/leaderboard/route.ts`, `BottomNav.tsx`, `globals.css`

---

## 8. Movement Tab (Running & Walking Tracker)

**Difficulty: 7/10**

**What changes:**
A new tab for tracking cardio movement — runs and walks. Users input the activity type and distance. The home page shows weekly distance, and the movement tab shows interesting aggregate stats.

**Implementation:**
1. **Schema**: New `Movement` model:
  - id, userId, type (`RUN` | `WALK`), distance (Decimal, miles), duration (Int?, minutes — optional), date, createdAt
2. **API** (`/api/movement`):
  - `GET`: List movements for user, with optional date range filter.
  - `POST`: Create movement entry (type, distance, optional duration, date).
  - Stats endpoint or include in dashboard: weekly distance, all-time distance, average pace (if duration provided), longest run, streak.
3. **Movement page** (`/movement`):
  - Input form: type toggle (Run/Walk), distance input, optional duration, date picker.
  - Stats section:
    - Distance this week (runs + walks combined)
    - Total distance all-time
    - Longest single run
    - Average distance per outing
    - Run vs walk split (pie chart or bar)
    - Weekly distance trend (line chart, last 8 weeks)
4. **Home page**: Add "Distance This Week" stat card showing combined run + walk miles.
5. **Navigation**: This makes 6 potential tabs (Home, Lifts, Workouts, Weight, Movement, Leaderboard). Need to redesign BottomNav — possibly use 5 tabs with a "More" menu, or consolidate Weight + Movement under a "Tracking" tab.

**Why difficulty 7:** New data model, new page with multiple stat calculations, chart, and the navigation redesign is non-trivial. The stats calculations (pace, streaks, trends) add complexity.

**Files touched:** `schema.prisma`, `seed.ts`, new `movement/` page + client, `/api/movement/route.ts`, `/api/dashboard/route.ts`, `BottomNav.tsx`, `home-client.tsx`

---

## 9. Chart Axes — Remove Zero Baseline

**Difficulty: 2/10**

**What changes:**
Currently the lift history and body weight charts may start Y-axes at 0. Instead, let Recharts auto-scale the axes based on the data range for better granularity.

**Implementation:**
1. **LiftHistoryChart.tsx**: Set `domain={['auto', 'auto']}` on both YAxis components. Add padding (e.g., `dataMin - 5` to `dataMax + 5`) for breathing room.
2. **Weight chart** (`weight-client.tsx`): Same approach — already partially implemented (has 2 lbs padding). Verify it's not forcing a zero baseline.
3. Test with seed data to make sure the auto-scaling looks good and doesn't produce awkward tick values.

**Files touched:** `LiftHistoryChart.tsx`, `weight-client.tsx`

---

## 10. Session Persistence (Save on Input, Resume Later)

**Difficulty: 5/10**

**What changes:**
Currently, set data is only saved when the user clicks "Finish Workout." If they leave mid-session (close the app, navigate away), all entered data is lost. This upgrade saves sets to the database as they're entered, so resuming an active session restores all progress.

**Implementation:**
1. **Auto-save on checkmark**: When a user completes a set (taps green check), immediately POST/PUT that set to the database (not just local state).
2. **API change**: Modify `PUT /api/sessions/[id]` to accept partial saves (save sets without setting `finishedAt`). Or create a `POST /api/sessions/[id]/sets` endpoint for individual set saves.
3. **Load existing sets on resume**: When navigating to `/session/[id]`, fetch any already-saved sets and populate the UI. The `GET /api/sessions/[id]` route already includes sets — just need to use them for state initialization.
4. **Debounced auto-save**: Optionally save draft values (un-checked sets) every 30 seconds to prevent any data loss.
5. **Home page banner**: Already shows "Resume Workout" for active sessions — just ensure it links correctly and the session loads with all saved data.

**Why difficulty 5:** The main challenge is managing the dual state (local UI state vs database state) without conflicts. Need to handle: saving individual sets, updating existing sets, deleting removed sets, and ensuring the "Finish" action doesn't duplicate already-saved sets.

**Files touched:** `session-client.tsx`, `/api/sessions/[id]/route.ts` (or new sets endpoint), potentially new `/api/sessions/[id]/sets/route.ts`

---

## Implementation Order (Recommended)

Based on dependencies and complexity:

| Phase | Upgrade | Difficulty | Rationale |
| --- | --- | --- | --- |
| 1 | #5 Remove PR from home | 1 | Quick win, clean up |
| 1 | #6 Volume → Mass Moved | 2 | Quick win, rename |
| 1 | #9 Chart auto-scale | 2 | Quick win, visual improvement |
| 1 | #3 Gray out completed sets | 2 | Quick win, UX improvement |
| 2 | #2 Sanity checks | 3 | Self-contained, fun feature |
| 2 | #1 Lift types | 4 | Schema change, needed for leaderboard |
| 2 | #4 Workouts remember last session | 4 | Improves core workflow |
| 3 | #10 Session persistence | 5 | Important reliability feature |
| 3 | #8 Movement tab | 7 | New feature, new schema |
| 4 | #7 Leaderboard | 8 | Depends on #1, cross-user, most complex |

**Phase 1** (quick wins): ~1 session, all under difficulty 3
**Phase 2** (core improvements): ~1-2 sessions, difficulty 3-4
**Phase 3** (new features): ~2 sessions, difficulty 5-7
**Phase 4** (social feature): ~1-2 sessions, difficulty 8
