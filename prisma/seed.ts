import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("temporary123", 10);

  // Upsert test users (won't destroy real registered users)
  const jake = await prisma.user.upsert({
    where: { username: "Jake" },
    update: { role: "ADMIN" },
    create: { username: "Jake", password: hashedPassword, role: "ADMIN" },
  });

  const kate = await prisma.user.upsert({
    where: { username: "Kate" },
    update: {},
    create: { username: "Kate", password: hashedPassword },
  });

  console.log("Upserted users: Jake (admin), Kate");

  // Upsert global lifts (won't duplicate if they exist)
  const liftData: Array<{
    name: string;
    muscleGroup: string;
    type?: "STRENGTH" | "BODYWEIGHT" | "ENDURANCE";
  }> = [
    { name: "Bench Press", muscleGroup: "Chest" },
    { name: "Incline Bench Press", muscleGroup: "Chest" },
    { name: "Cable Fly", muscleGroup: "Chest" },
    { name: "Dip", muscleGroup: "Chest", type: "BODYWEIGHT" },
    { name: "Push-Up", muscleGroup: "Chest", type: "BODYWEIGHT" },
    { name: "Overhead Press", muscleGroup: "Shoulders" },
    { name: "Lateral Raise", muscleGroup: "Shoulders" },
    { name: "Face Pull", muscleGroup: "Shoulders" },
    { name: "Squat", muscleGroup: "Legs" },
    { name: "Leg Press", muscleGroup: "Legs" },
    { name: "Leg Curl", muscleGroup: "Legs" },
    { name: "Leg Extension", muscleGroup: "Legs" },
    { name: "Lunges", muscleGroup: "Legs" },
    { name: "Calf Raise", muscleGroup: "Legs" },
    { name: "Deadlift", muscleGroup: "Back" },
    { name: "Romanian Deadlift", muscleGroup: "Back" },
    { name: "Barbell Row", muscleGroup: "Back" },
    { name: "Seated Row", muscleGroup: "Back" },
    { name: "Lat Pulldown", muscleGroup: "Back" },
    { name: "Pull-Up", muscleGroup: "Back", type: "BODYWEIGHT" },
    { name: "Bicep Curl", muscleGroup: "Arms" },
    { name: "Hammer Curl", muscleGroup: "Arms" },
    { name: "Tricep Pushdown", muscleGroup: "Arms" },
    { name: "Skull Crusher", muscleGroup: "Arms" },
    { name: "Plank", muscleGroup: "Core", type: "ENDURANCE" },
    { name: "Wall Sit", muscleGroup: "Legs", type: "ENDURANCE" },
    { name: "Dead Hang", muscleGroup: "Back", type: "ENDURANCE" },
  ];

  const lifts: Record<string, string> = {};
  for (const lift of liftData) {
    // Check if this global lift already exists
    const existing = await prisma.lift.findFirst({
      where: { name: lift.name, isGlobal: true },
    });
    if (existing) {
      lifts[lift.name] = existing.id;
    } else {
      const created = await prisma.lift.create({
        data: {
          name: lift.name,
          muscleGroup: lift.muscleGroup,
          type: lift.type || "STRENGTH",
          isGlobal: true,
        },
      });
      lifts[lift.name] = created.id;
    }
  }

  console.log(`Ensured ${liftData.length} global lifts exist`);

  // Upsert leaderboard categories by name
  const leaderboardCategories = [
    {
      name: "Bench Press",
      liftName: "Bench Press" as string | null,
      metric: "Max weight with at least 3 reps",
      rule: "Heaviest weight where you completed 3 or more reps in a single set",
      displayOrder: 1,
    },
    {
      name: "Squat",
      liftName: "Squat" as string | null,
      metric: "Max weight with at least 3 reps",
      rule: "Heaviest weight where you completed 3 or more reps in a single set",
      displayOrder: 2,
    },
    {
      name: "Push-Ups",
      liftName: "Push-Up" as string | null,
      metric: "Max reps in a single set",
      rule: "Most push-ups completed in a single set",
      displayOrder: 3,
    },
    {
      name: "Pull-Ups",
      liftName: "Pull-Up" as string | null,
      metric: "Max reps in a single set",
      rule: "Most pull-ups completed in a single set",
      displayOrder: 4,
    },
    {
      name: "Romanian Deadlift",
      liftName: "Romanian Deadlift" as string | null,
      metric: "Max weight with at least 3 reps",
      rule: "Heaviest weight where you completed 3 or more reps in a single set",
      displayOrder: 5,
    },
    {
      name: "Workouts This Week",
      liftName: null as string | null,
      metric: "Finished sessions this week",
      rule: "Number of completed workouts in the current Monday-Sunday week",
      displayOrder: 6,
    },
    {
      name: "Miles This Month",
      liftName: null as string | null,
      metric: "Monthly distance",
      rule: "Total miles logged across all runs and walks this calendar month",
      displayOrder: 7,
    },
  ];

  for (const cat of leaderboardCategories) {
    const existing = await prisma.leaderboardCategory.findFirst({
      where: { name: cat.name },
    });
    if (!existing) {
      await prisma.leaderboardCategory.create({ data: cat });
    }
  }

  console.log("Ensured leaderboard categories exist");

  // Only seed demo data if Jake has no sessions yet
  const jakeSessions = await prisma.session.count({
    where: { userId: jake.id },
  });

  if (jakeSessions > 0) {
    console.log("Jake already has session data — skipping demo data seeding");
    console.log("\nSeed complete (safe mode — existing data preserved)!");
    return;
  }

  console.log("Jake has no sessions — seeding demo data...");

  // Create Jake's workouts
  const pushDay = await prisma.workout.create({
    data: {
      name: "Push Day",
      userId: jake.id,
      workoutLifts: {
        create: [
          { liftId: lifts["Bench Press"], order: 0 },
          { liftId: lifts["Overhead Press"], order: 1 },
          { liftId: lifts["Tricep Pushdown"], order: 2 },
          { liftId: lifts["Lateral Raise"], order: 3 },
        ],
      },
    },
  });

  const pullDay = await prisma.workout.create({
    data: {
      name: "Pull Day",
      userId: jake.id,
      workoutLifts: {
        create: [
          { liftId: lifts["Deadlift"], order: 0 },
          { liftId: lifts["Barbell Row"], order: 1 },
          { liftId: lifts["Lat Pulldown"], order: 2 },
          { liftId: lifts["Bicep Curl"], order: 3 },
        ],
      },
    },
  });

  const legDay = await prisma.workout.create({
    data: {
      name: "Leg Day",
      userId: jake.id,
      workoutLifts: {
        create: [
          { liftId: lifts["Squat"], order: 0 },
          { liftId: lifts["Leg Press"], order: 1 },
          { liftId: lifts["Lunges"], order: 2 },
          { liftId: lifts["Calf Raise"], order: 3 },
        ],
      },
    },
  });

  console.log("Created Jake's workouts: Push Day, Pull Day, Leg Day");

  // Generate 4 weeks of sessions (Mon Push, Wed Pull, Fri Legs)
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);

  const dayOfWeek = fourWeeksAgo.getDay();
  const startMonday = new Date(fourWeeksAgo);
  startMonday.setDate(
    fourWeeksAgo.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
  );

  const liftProgression: Record<
    string,
    { weight: number; reps: number; increment: number }
  > = {
    "Bench Press": { weight: 155, reps: 6, increment: 10 },
    "Overhead Press": { weight: 95, reps: 7, increment: 5 },
    "Tricep Pushdown": { weight: 50, reps: 8, increment: 5 },
    "Lateral Raise": { weight: 20, reps: 10, increment: 5 },
    Deadlift: { weight: 225, reps: 5, increment: 10 },
    "Barbell Row": { weight: 135, reps: 7, increment: 5 },
    "Lat Pulldown": { weight: 120, reps: 8, increment: 10 },
    "Bicep Curl": { weight: 30, reps: 9, increment: 5 },
    Squat: { weight: 185, reps: 6, increment: 10 },
    "Leg Press": { weight: 270, reps: 8, increment: 20 },
    Lunges: { weight: 40, reps: 8, increment: 5 },
    "Calf Raise": { weight: 135, reps: 12, increment: 10 },
  };

  const workoutSchedule = [
    {
      day: 0,
      workout: pushDay,
      liftNames: [
        "Bench Press",
        "Overhead Press",
        "Tricep Pushdown",
        "Lateral Raise",
      ],
    },
    {
      day: 2,
      workout: pullDay,
      liftNames: ["Deadlift", "Barbell Row", "Lat Pulldown", "Bicep Curl"],
    },
    {
      day: 4,
      workout: legDay,
      liftNames: ["Squat", "Leg Press", "Lunges", "Calf Raise"],
    },
  ];

  let sessionCount = 0;

  for (let week = 0; week < 4; week++) {
    for (const schedule of workoutSchedule) {
      const sessionDate = new Date(startMonday);
      sessionDate.setDate(
        startMonday.getDate() + week * 7 + schedule.day
      );
      sessionDate.setHours(7, 0, 0, 0);

      const finishDate = new Date(sessionDate);
      finishDate.setMinutes(
        finishDate.getMinutes() + 45 + Math.floor(Math.random() * 30)
      );

      const session = await prisma.session.create({
        data: {
          userId: jake.id,
          workoutId: schedule.workout.id,
          startedAt: sessionDate,
          finishedAt: finishDate,
        },
      });

      for (const liftName of schedule.liftNames) {
        const prog = liftProgression[liftName];
        const sessionIndex = week;

        let currentWeight = prog.weight;
        let currentReps = prog.reps + sessionIndex;

        const maxReps = liftName === "Calf Raise" ? 15 : 10;
        if (currentReps > maxReps) {
          currentWeight += prog.increment;
          currentReps = prog.reps;
        }

        const isCompound = [
          "Bench Press",
          "Overhead Press",
          "Deadlift",
          "Barbell Row",
          "Squat",
          "Leg Press",
        ].includes(liftName);
        const numSets = isCompound
          ? 4 + (week >= 2 ? 1 : 0)
          : 3 + (week >= 3 ? 1 : 0);

        for (let setNum = 1; setNum <= numSets; setNum++) {
          const setReps =
            setNum === numSets
              ? Math.max(currentReps - 2, 3)
              : currentReps;
          const setWeight =
            setNum >= numSets && isCompound
              ? currentWeight - 5
              : currentWeight;

          await prisma.sessionSet.create({
            data: {
              sessionId: session.id,
              liftId: lifts[liftName],
              setNumber: setNum,
              weight: setWeight,
              reps: setReps,
            },
          });
        }
      }

      sessionCount++;
    }
  }

  console.log(`Created ${sessionCount} sessions with progressive overload data`);

  // Body weight entries for Jake
  const bodyWeightStart = 185;
  const bodyWeightEnd = 182;
  const numEntries = 12;
  const bwDailyDrop = (bodyWeightStart - bodyWeightEnd) / (numEntries - 1);

  for (let i = 0; i < numEntries; i++) {
    const date = new Date(startMonday);
    date.setDate(startMonday.getDate() + Math.floor((i * 28) / numEntries));

    const weight =
      bodyWeightStart - bwDailyDrop * i + (Math.random() - 0.5);
    const roundedWeight = Math.round(weight * 10) / 10;

    await prisma.bodyWeight.create({
      data: {
        userId: jake.id,
        weight: roundedWeight,
        recordedAt: date,
      },
    });
  }

  console.log(`Created ${numEntries} body weight entries for Jake`);

  // Movement data for Jake
  const movementData = [
    { type: "RUN" as const, distance: 3.1, duration: 28, daysAgo: 25 },
    { type: "WALK" as const, distance: 1.5, duration: 25, daysAgo: 23 },
    { type: "RUN" as const, distance: 2.8, duration: 26, daysAgo: 20 },
    { type: "WALK" as const, distance: 2.0, duration: 35, daysAgo: 17 },
    { type: "RUN" as const, distance: 3.5, duration: 30, daysAgo: 14 },
    { type: "RUN" as const, distance: 3.0, duration: 27, daysAgo: 10 },
    { type: "WALK" as const, distance: 1.8, duration: 30, daysAgo: 7 },
    { type: "RUN" as const, distance: 4.0, duration: 35, daysAgo: 5 },
    { type: "WALK" as const, distance: 2.2, duration: 38, daysAgo: 3 },
    { type: "RUN" as const, distance: 3.2, duration: 28, daysAgo: 1 },
  ];

  for (const m of movementData) {
    const mDate = new Date(now);
    mDate.setDate(now.getDate() - m.daysAgo);
    await prisma.movement.create({
      data: {
        userId: jake.id,
        type: m.type,
        distance: m.distance,
        duration: m.duration,
        date: mDate,
      },
    });
  }

  console.log(`Created ${movementData.length} movement entries for Jake`);

  // === Kate's data ===
  // Only seed Kate's demo data if she has no sessions
  const kateSessions = await prisma.session.count({
    where: { userId: kate.id },
  });

  if (kateSessions > 0) {
    console.log("Kate already has session data — skipping her demo data");
    console.log("\nSeed complete!");
    return;
  }

  const kateUpperBody = await prisma.workout.create({
    data: {
      name: "Upper Body",
      userId: kate.id,
      workoutLifts: {
        create: [
          { liftId: lifts["Bench Press"], order: 0 },
          { liftId: lifts["Overhead Press"], order: 1 },
          { liftId: lifts["Push-Up"], order: 2 },
        ],
      },
    },
  });

  const kateLowerBody = await prisma.workout.create({
    data: {
      name: "Lower Body",
      userId: kate.id,
      workoutLifts: {
        create: [
          { liftId: lifts["Squat"], order: 0 },
          { liftId: lifts["Leg Press"], order: 1 },
          { liftId: lifts["Lunges"], order: 2 },
        ],
      },
    },
  });

  console.log("Created Kate's workouts: Upper Body, Lower Body");

  const kateSchedule = [
    {
      day: 0,
      workout: kateUpperBody,
      liftNames: ["Bench Press", "Overhead Press", "Push-Up"],
    },
    {
      day: 3,
      workout: kateLowerBody,
      liftNames: ["Squat", "Leg Press", "Lunges"],
    },
  ];

  const kateProgression: Record<
    string,
    { weight: number; reps: number }
  > = {
    "Bench Press": { weight: 95, reps: 8 },
    "Overhead Press": { weight: 65, reps: 8 },
    "Push-Up": { weight: 0, reps: 25 },
    Squat: { weight: 135, reps: 8 },
    "Leg Press": { weight: 200, reps: 10 },
    Lunges: { weight: 30, reps: 10 },
  };

  let kateSessionCount = 0;
  const threeWeeksAgo = new Date(now);
  threeWeeksAgo.setDate(now.getDate() - 21);
  const kateStartMonday = new Date(threeWeeksAgo);
  const kateDayOfWeek = kateStartMonday.getDay();
  kateStartMonday.setDate(
    kateStartMonday.getDate() -
      (kateDayOfWeek === 0 ? 6 : kateDayOfWeek - 1)
  );

  for (let week = 0; week < 3; week++) {
    for (const schedule of kateSchedule) {
      const sessionDate = new Date(kateStartMonday);
      sessionDate.setDate(
        kateStartMonday.getDate() + week * 7 + schedule.day
      );
      sessionDate.setHours(18, 0, 0, 0);

      const finishDate = new Date(sessionDate);
      finishDate.setMinutes(
        finishDate.getMinutes() + 40 + Math.floor(Math.random() * 20)
      );

      const kateSession = await prisma.session.create({
        data: {
          userId: kate.id,
          workoutId: schedule.workout.id,
          startedAt: sessionDate,
          finishedAt: finishDate,
        },
      });

      for (const liftName of schedule.liftNames) {
        const prog = kateProgression[liftName];
        const isPushUp = liftName === "Push-Up";

        const currentWeight = isPushUp ? 0 : prog.weight + week * 5;
        const currentReps = isPushUp
          ? prog.reps + week * 3
          : prog.reps + week;

        const numSets = isPushUp ? 3 : 4;

        for (let setNum = 1; setNum <= numSets; setNum++) {
          const setReps =
            setNum === numSets
              ? Math.max(currentReps - 2, 3)
              : currentReps;
          const setWeight = isPushUp
            ? 0
            : setNum >= numSets
              ? currentWeight - 5
              : currentWeight;

          await prisma.sessionSet.create({
            data: {
              sessionId: kateSession.id,
              liftId: lifts[liftName],
              setNumber: setNum,
              weight: setWeight,
              reps: setReps,
            },
          });
        }
      }

      kateSessionCount++;
    }
  }

  console.log(`Created ${kateSessionCount} sessions for Kate`);

  // Kate's body weight entries
  for (let i = 0; i < 8; i++) {
    const date = new Date(kateStartMonday);
    date.setDate(kateStartMonday.getDate() + Math.floor((i * 21) / 8));
    const weight = 140 - i * 0.2 + (Math.random() - 0.5) * 0.4;
    await prisma.bodyWeight.create({
      data: {
        userId: kate.id,
        weight: Math.round(weight * 10) / 10,
        recordedAt: date,
      },
    });
  }

  console.log("Created body weight entries for Kate");

  // Kate's movement data
  const kateMovement = [
    { type: "RUN" as const, distance: 4.2, duration: 38, daysAgo: 18 },
    { type: "RUN" as const, distance: 3.5, duration: 30, daysAgo: 15 },
    { type: "WALK" as const, distance: 2.5, duration: 42, daysAgo: 12 },
    { type: "RUN" as const, distance: 5.0, duration: 44, daysAgo: 9 },
    { type: "RUN" as const, distance: 3.8, duration: 33, daysAgo: 6 },
    { type: "WALK" as const, distance: 3.0, duration: 50, daysAgo: 4 },
    { type: "RUN" as const, distance: 4.5, duration: 40, daysAgo: 2 },
    { type: "RUN" as const, distance: 3.2, duration: 28, daysAgo: 0 },
  ];

  for (const m of kateMovement) {
    const mDate = new Date(now);
    mDate.setDate(now.getDate() - m.daysAgo);
    await prisma.movement.create({
      data: {
        userId: kate.id,
        type: m.type,
        distance: m.distance,
        duration: m.duration,
        date: mDate,
      },
    });
  }

  console.log(`Created ${kateMovement.length} movement entries for Kate`);

  console.log("\nSeed complete!");
  console.log("Test accounts:");
  console.log("  Jake / temporary123 (admin, workout data, movement data)");
  console.log("  Kate / temporary123 (workout data, movement data)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
