import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("sample", 10);

  // Create the sample user (NOT added to any groups — invisible on leaderboards)
  const sample = await prisma.user.upsert({
    where: { username: "sample" },
    update: {},
    create: {
      username: "sample",
      password: hashedPassword,
      displayName: "Sample User",
    },
  });

  console.log(`Upserted sample user: ${sample.id}`);

  // Check if sample already has sessions — skip if so
  const existingSessions = await prisma.session.count({
    where: { userId: sample.id },
  });
  if (existingSessions > 0) {
    console.log("Sample user already has data — skipping");
    return;
  }

  // Get global lifts
  const globalLifts = await prisma.lift.findMany({
    where: { isGlobal: true },
  });
  const lift = (name: string) => {
    const found = globalLifts.find((l) => l.name === name);
    if (!found) throw new Error(`Lift not found: ${name}`);
    return found.id;
  };

  // Create 5 diverse workouts
  const pushDay = await prisma.workout.create({
    data: {
      name: "Push Day",
      userId: sample.id,
      workoutLifts: {
        create: [
          { liftId: lift("Bench Press"), order: 0 },
          { liftId: lift("Incline Bench Press"), order: 1 },
          { liftId: lift("Overhead Press"), order: 2 },
          { liftId: lift("Lateral Raise"), order: 3 },
          { liftId: lift("Tricep Pushdown"), order: 4 },
          { liftId: lift("Cable Fly"), order: 5 },
        ],
      },
    },
  });

  const pullDay = await prisma.workout.create({
    data: {
      name: "Pull Day",
      userId: sample.id,
      workoutLifts: {
        create: [
          { liftId: lift("Deadlift"), order: 0 },
          { liftId: lift("Barbell Row"), order: 1 },
          { liftId: lift("Lat Pulldown"), order: 2 },
          { liftId: lift("Seated Row"), order: 3 },
          { liftId: lift("Bicep Curl"), order: 4 },
          { liftId: lift("Hammer Curl"), order: 5 },
          { liftId: lift("Face Pull"), order: 6 },
        ],
      },
    },
  });

  const legDay = await prisma.workout.create({
    data: {
      name: "Leg Day",
      userId: sample.id,
      workoutLifts: {
        create: [
          { liftId: lift("Squat"), order: 0 },
          { liftId: lift("Romanian Deadlift"), order: 1 },
          { liftId: lift("Leg Press"), order: 2 },
          { liftId: lift("Leg Curl"), order: 3 },
          { liftId: lift("Leg Extension"), order: 4 },
          { liftId: lift("Calf Raise"), order: 5 },
        ],
      },
    },
  });

  const bodyweightDay = await prisma.workout.create({
    data: {
      name: "Bodyweight & Core",
      userId: sample.id,
      workoutLifts: {
        create: [
          { liftId: lift("Pull-Up"), order: 0 },
          { liftId: lift("Push-Up"), order: 1 },
          { liftId: lift("Dip"), order: 2 },
          { liftId: lift("Plank"), order: 3 },
          { liftId: lift("Wall Sit"), order: 4 },
          { liftId: lift("Dead Hang"), order: 5 },
        ],
      },
    },
  });

  const fullBody = await prisma.workout.create({
    data: {
      name: "Full Body Friday",
      userId: sample.id,
      workoutLifts: {
        create: [
          { liftId: lift("Squat"), order: 0 },
          { liftId: lift("Bench Press"), order: 1 },
          { liftId: lift("Barbell Row"), order: 2 },
          { liftId: lift("Overhead Press"), order: 3 },
          { liftId: lift("Bicep Curl"), order: 4 },
          { liftId: lift("Skull Crusher"), order: 5 },
        ],
      },
    },
  });

  console.log("Created 5 workouts for sample user");

  // ------------------------------------------------------------------
  // Generate 8 weeks of training data (realistic PPL + extras)
  // ------------------------------------------------------------------
  const now = new Date();
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(now.getDate() - 56);

  // Align to Monday
  const dow = eightWeeksAgo.getDay();
  const startMonday = new Date(eightWeeksAgo);
  startMonday.setDate(eightWeeksAgo.getDate() - (dow === 0 ? 6 : dow - 1));

  // Progressive overload configs
  const progression: Record<string, { startWeight: number; startReps: number; weeklyWeightBump: number; setsMin: number; setsMax: number }> = {
    "Bench Press":         { startWeight: 135, startReps: 8,  weeklyWeightBump: 5,  setsMin: 4, setsMax: 5 },
    "Incline Bench Press": { startWeight: 115, startReps: 8,  weeklyWeightBump: 5,  setsMin: 3, setsMax: 4 },
    "Overhead Press":      { startWeight: 85,  startReps: 8,  weeklyWeightBump: 2.5, setsMin: 3, setsMax: 4 },
    "Lateral Raise":       { startWeight: 15,  startReps: 12, weeklyWeightBump: 2.5, setsMin: 3, setsMax: 4 },
    "Tricep Pushdown":     { startWeight: 45,  startReps: 10, weeklyWeightBump: 5,  setsMin: 3, setsMax: 4 },
    "Cable Fly":           { startWeight: 25,  startReps: 12, weeklyWeightBump: 2.5, setsMin: 3, setsMax: 3 },
    "Deadlift":            { startWeight: 225, startReps: 5,  weeklyWeightBump: 10, setsMin: 3, setsMax: 5 },
    "Barbell Row":         { startWeight: 135, startReps: 8,  weeklyWeightBump: 5,  setsMin: 4, setsMax: 5 },
    "Lat Pulldown":        { startWeight: 120, startReps: 10, weeklyWeightBump: 5,  setsMin: 3, setsMax: 4 },
    "Seated Row":          { startWeight: 100, startReps: 10, weeklyWeightBump: 5,  setsMin: 3, setsMax: 4 },
    "Bicep Curl":          { startWeight: 25,  startReps: 10, weeklyWeightBump: 2.5, setsMin: 3, setsMax: 4 },
    "Hammer Curl":         { startWeight: 25,  startReps: 10, weeklyWeightBump: 2.5, setsMin: 3, setsMax: 3 },
    "Face Pull":           { startWeight: 30,  startReps: 15, weeklyWeightBump: 2.5, setsMin: 3, setsMax: 3 },
    "Squat":               { startWeight: 185, startReps: 6,  weeklyWeightBump: 5,  setsMin: 4, setsMax: 5 },
    "Romanian Deadlift":   { startWeight: 155, startReps: 8,  weeklyWeightBump: 5,  setsMin: 3, setsMax: 4 },
    "Leg Press":           { startWeight: 270, startReps: 10, weeklyWeightBump: 10, setsMin: 3, setsMax: 4 },
    "Leg Curl":            { startWeight: 80,  startReps: 10, weeklyWeightBump: 5,  setsMin: 3, setsMax: 3 },
    "Leg Extension":       { startWeight: 90,  startReps: 10, weeklyWeightBump: 5,  setsMin: 3, setsMax: 3 },
    "Calf Raise":          { startWeight: 135, startReps: 15, weeklyWeightBump: 10, setsMin: 3, setsMax: 4 },
    "Skull Crusher":       { startWeight: 50,  startReps: 10, weeklyWeightBump: 5,  setsMin: 3, setsMax: 3 },
  };

  // Bodyweight/endurance configs (no weight progression)
  const bwProgression: Record<string, { startReps: number; weeklyRepBump: number; setsMin: number; setsMax: number }> = {
    "Pull-Up":   { startReps: 8,  weeklyRepBump: 1, setsMin: 3, setsMax: 5 },
    "Push-Up":   { startReps: 20, weeklyRepBump: 2, setsMin: 3, setsMax: 4 },
    "Dip":       { startReps: 10, weeklyRepBump: 1, setsMin: 3, setsMax: 4 },
  };

  const enduranceProgression: Record<string, { startDuration: number; weeklyBump: number; sets: number }> = {
    "Plank":     { startDuration: 45, weeklyBump: 5, sets: 3 },
    "Wall Sit":  { startDuration: 40, weeklyBump: 5, sets: 3 },
    "Dead Hang": { startDuration: 30, weeklyBump: 3, sets: 3 },
  };

  // Weekly schedule:
  // Mon: Push, Tue: Pull, Wed: rest, Thu: Legs, Fri: Full Body, Sat: Bodyweight, Sun: rest
  // Skip a few sessions to be realistic (week 3 Thu, week 6 Sat)
  const schedule = [
    { dayOffset: 0, workout: pushDay, liftNames: ["Bench Press", "Incline Bench Press", "Overhead Press", "Lateral Raise", "Tricep Pushdown", "Cable Fly"] },
    { dayOffset: 1, workout: pullDay, liftNames: ["Deadlift", "Barbell Row", "Lat Pulldown", "Seated Row", "Bicep Curl", "Hammer Curl", "Face Pull"] },
    { dayOffset: 3, workout: legDay, liftNames: ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Leg Extension", "Calf Raise"] },
    { dayOffset: 4, workout: fullBody, liftNames: ["Squat", "Bench Press", "Barbell Row", "Overhead Press", "Bicep Curl", "Skull Crusher"] },
    { dayOffset: 5, workout: bodyweightDay, liftNames: ["Pull-Up", "Push-Up", "Dip", "Plank", "Wall Sit", "Dead Hang"] },
  ];

  // Skipped sessions for realism
  const skips = new Set(["3-3", "6-5"]); // "week-dayOffset"

  let sessionCount = 0;

  for (let week = 0; week < 8; week++) {
    for (const sched of schedule) {
      const skipKey = `${week}-${sched.dayOffset}`;
      if (skips.has(skipKey)) continue;

      const sessionDate = new Date(startMonday);
      sessionDate.setDate(startMonday.getDate() + week * 7 + sched.dayOffset);

      // Vary start time: morning on weekdays, midday on Sat
      const hour = sched.dayOffset === 5 ? 10 : 6;
      sessionDate.setHours(hour, Math.floor(Math.random() * 30), 0, 0);

      const durationMinutes = 50 + Math.floor(Math.random() * 35); // 50-85 min
      const finishDate = new Date(sessionDate.getTime() + durationMinutes * 60000);

      const session = await prisma.session.create({
        data: {
          userId: sample.id,
          workoutId: sched.workout.id,
          startedAt: sessionDate,
          finishedAt: finishDate,
        },
      });

      for (const liftName of sched.liftNames) {
        const liftId = lift(liftName);

        if (enduranceProgression[liftName]) {
          // Endurance lift
          const ep = enduranceProgression[liftName];
          const duration = ep.startDuration + week * ep.weeklyBump;
          for (let s = 1; s <= ep.sets; s++) {
            const setDuration = s === ep.sets
              ? Math.max(duration - 10, 15)
              : duration + Math.floor((Math.random() - 0.3) * 8);
            await prisma.sessionSet.create({
              data: {
                sessionId: session.id,
                liftId,
                setNumber: s,
                weight: 0,
                reps: 0,
                duration: setDuration,
              },
            });
          }
        } else if (bwProgression[liftName]) {
          // Bodyweight lift
          const bp = bwProgression[liftName];
          const reps = bp.startReps + week * bp.weeklyRepBump;
          const numSets = bp.setsMin + (week >= 4 ? Math.min(week - 3, bp.setsMax - bp.setsMin) : 0);
          for (let s = 1; s <= numSets; s++) {
            const setReps = s === numSets
              ? Math.max(reps - 3, 3)
              : reps + Math.floor((Math.random() - 0.3) * 3);
            await prisma.sessionSet.create({
              data: {
                sessionId: session.id,
                liftId,
                setNumber: s,
                weight: 0,
                reps: Math.max(1, setReps),
              },
            });
          }
        } else {
          // Strength lift
          const prog = progression[liftName];
          if (!prog) continue;

          const weight = prog.startWeight + week * prog.weeklyWeightBump;
          const reps = prog.startReps;
          const numSets = prog.setsMin + (week >= 4 ? Math.min(week - 3, prog.setsMax - prog.setsMin) : 0);

          for (let s = 1; s <= numSets; s++) {
            // Last set: drop set (slightly less weight, fewer reps)
            const isLastSet = s === numSets;
            // Penultimate sets get slight rep variation
            const setWeight = isLastSet ? weight - 5 : weight;
            const setReps = isLastSet
              ? Math.max(reps - 2, 3)
              : reps + Math.floor((Math.random() - 0.3) * 2);

            await prisma.sessionSet.create({
              data: {
                sessionId: session.id,
                liftId,
                setNumber: s,
                weight: setWeight,
                reps: Math.max(1, setReps),
              },
            });
          }
        }
      }

      sessionCount++;
    }
  }

  console.log(`Created ${sessionCount} sessions for sample user`);

  // ------------------------------------------------------------------
  // Body weight entries — 8 weeks, ~3 entries per week (realistic cut)
  // ------------------------------------------------------------------
  const bwStart = 195;
  const bwEnd = 188;
  const bwEntries = 22;
  const bwDrop = (bwStart - bwEnd) / (bwEntries - 1);

  for (let i = 0; i < bwEntries; i++) {
    const date = new Date(startMonday);
    date.setDate(startMonday.getDate() + Math.floor((i * 56) / bwEntries));

    // Add realistic day-to-day fluctuation
    const fluctuation = (Math.random() - 0.5) * 1.5;
    const weight = bwStart - bwDrop * i + fluctuation;
    const rounded = Math.round(weight * 10) / 10;

    await prisma.bodyWeight.create({
      data: {
        userId: sample.id,
        weight: rounded,
        recordedAt: date,
      },
    });
  }

  console.log(`Created ${bwEntries} body weight entries`);

  // ------------------------------------------------------------------
  // Movement data — mix of runs and walks over 8 weeks
  // ------------------------------------------------------------------
  const movements = [
    { type: "RUN" as const, distance: 2.5,  duration: 24, daysAgo: 54 },
    { type: "WALK" as const, distance: 1.8, duration: 30, daysAgo: 52 },
    { type: "RUN" as const, distance: 3.0,  duration: 28, daysAgo: 49 },
    { type: "RUN" as const, distance: 2.8,  duration: 26, daysAgo: 46 },
    { type: "WALK" as const, distance: 2.2, duration: 38, daysAgo: 44 },
    { type: "RUN" as const, distance: 3.1,  duration: 27, daysAgo: 41 },
    { type: "RUN" as const, distance: 3.5,  duration: 30, daysAgo: 38 },
    { type: "WALK" as const, distance: 2.0, duration: 33, daysAgo: 36 },
    { type: "RUN" as const, distance: 3.2,  duration: 28, daysAgo: 33 },
    { type: "RUN" as const, distance: 4.0,  duration: 35, daysAgo: 30 },
    { type: "WALK" as const, distance: 2.5, duration: 42, daysAgo: 28 },
    { type: "RUN" as const, distance: 3.8,  duration: 32, daysAgo: 25 },
    { type: "RUN" as const, distance: 3.5,  duration: 30, daysAgo: 22 },
    { type: "WALK" as const, distance: 1.5, duration: 25, daysAgo: 20 },
    { type: "RUN" as const, distance: 4.2,  duration: 36, daysAgo: 17 },
    { type: "RUN" as const, distance: 3.0,  duration: 26, daysAgo: 14 },
    { type: "WALK" as const, distance: 3.0, duration: 50, daysAgo: 12 },
    { type: "RUN" as const, distance: 4.5,  duration: 38, daysAgo: 10 },
    { type: "RUN" as const, distance: 3.8,  duration: 33, daysAgo: 7 },
    { type: "WALK" as const, distance: 2.8, duration: 46, daysAgo: 5 },
    { type: "RUN" as const, distance: 5.0,  duration: 42, daysAgo: 3 },
    { type: "RUN" as const, distance: 3.5,  duration: 30, daysAgo: 1 },
  ];

  for (const m of movements) {
    const mDate = new Date(now);
    mDate.setDate(now.getDate() - m.daysAgo);
    await prisma.movement.create({
      data: {
        userId: sample.id,
        type: m.type,
        distance: m.distance,
        duration: m.duration,
        date: mDate,
      },
    });
  }

  console.log(`Created ${movements.length} movement entries`);

  console.log("\nSample account seeded!");
  console.log("  Login: sample / sample");
  console.log("  NOT in any groups — won't appear on leaderboards");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
