import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (reverse dependency order)
  await prisma.sessionSet.deleteMany();
  await prisma.session.deleteMany();
  await prisma.bodyWeight.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.workoutLift.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.lift.deleteMany();
  await prisma.leaderboardCategory.deleteMany();
  await prisma.user.deleteMany();

  console.log("Cleared existing data");

  // Create users
  const hashedPassword = await hash("temporary123", 10);

  const jake = await prisma.user.create({
    data: { username: "Jake", password: hashedPassword },
  });

  const kate = await prisma.user.create({
    data: { username: "Kate", password: hashedPassword },
  });

  console.log("Created users: Jake, Kate");

  // Create global lifts with types
  const liftData: Array<{ name: string; muscleGroup: string; type?: "STRENGTH" | "BODYWEIGHT" | "ENDURANCE" }> = [
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

  console.log(`Created ${liftData.length} global lifts`);

  // Create leaderboard categories
  await prisma.leaderboardCategory.createMany({
    data: [
      {
        name: "Bench Press",
        liftName: "Bench Press",
        metric: "Max weight with at least 3 reps",
        rule: "Heaviest weight where you completed 3 or more reps in a single set",
        displayOrder: 1,
      },
      {
        name: "Squat",
        liftName: "Squat",
        metric: "Max weight with at least 3 reps",
        rule: "Heaviest weight where you completed 3 or more reps in a single set",
        displayOrder: 2,
      },
      {
        name: "Push-Ups",
        liftName: "Push-Up",
        metric: "Max reps in a single set",
        rule: "Most push-ups completed in a single set",
        displayOrder: 3,
      },
      {
        name: "Workouts This Week",
        liftName: null,
        metric: "Finished sessions this week",
        rule: "Number of completed workouts in the current Monday-Sunday week",
        displayOrder: 4,
      },
    ],
  });

  console.log("Created leaderboard categories");

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
  // Starting from 4 weeks ago
  const now = new Date();
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);

  // Find the Monday of that week
  const dayOfWeek = fourWeeksAgo.getDay();
  const startMonday = new Date(fourWeeksAgo);
  startMonday.setDate(fourWeeksAgo.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  // Progressive overload data for each lift
  // Format: [startWeight, startReps, weightIncrement]
  // Reps go 6->7->8->9->10 then weight bumps up and reps reset to 6
  const liftProgression: Record<string, { weight: number; reps: number; increment: number }> = {
    "Bench Press": { weight: 155, reps: 6, increment: 10 },
    "Overhead Press": { weight: 95, reps: 7, increment: 5 },
    "Tricep Pushdown": { weight: 50, reps: 8, increment: 5 },
    "Lateral Raise": { weight: 20, reps: 10, increment: 5 },
    "Deadlift": { weight: 225, reps: 5, increment: 10 },
    "Barbell Row": { weight: 135, reps: 7, increment: 5 },
    "Lat Pulldown": { weight: 120, reps: 8, increment: 10 },
    "Bicep Curl": { weight: 30, reps: 9, increment: 5 },
    "Squat": { weight: 185, reps: 6, increment: 10 },
    "Leg Press": { weight: 270, reps: 8, increment: 20 },
    "Lunges": { weight: 40, reps: 8, increment: 5 },
    "Calf Raise": { weight: 135, reps: 12, increment: 10 },
  };

  const workoutSchedule = [
    { day: 0, workout: pushDay, liftNames: ["Bench Press", "Overhead Press", "Tricep Pushdown", "Lateral Raise"] },
    { day: 2, workout: pullDay, liftNames: ["Deadlift", "Barbell Row", "Lat Pulldown", "Bicep Curl"] },
    { day: 4, workout: legDay, liftNames: ["Squat", "Leg Press", "Lunges", "Calf Raise"] },
  ];

  let sessionCount = 0;

  for (let week = 0; week < 4; week++) {
    for (const schedule of workoutSchedule) {
      const sessionDate = new Date(startMonday);
      sessionDate.setDate(startMonday.getDate() + (week * 7) + schedule.day);
      sessionDate.setHours(7, 0, 0, 0); // Morning workout

      const finishDate = new Date(sessionDate);
      finishDate.setMinutes(finishDate.getMinutes() + 45 + Math.floor(Math.random() * 30));

      const session = await prisma.session.create({
        data: {
          userId: jake.id,
          workoutId: schedule.workout.id,
          startedAt: sessionDate,
          finishedAt: finishDate,
        },
      });

      // Create sets for each lift
      for (const liftName of schedule.liftNames) {
        const prog = liftProgression[liftName];
        const sessionIndex = week; // 0-3 for the 4 weeks

        // Progressive overload: increase reps each week, bump weight after week where reps hit target
        let currentWeight = prog.weight;
        let currentReps = prog.reps + sessionIndex;

        // If reps would exceed 10 (or 14 for calf raise), bump weight and reset reps
        const maxReps = liftName === "Calf Raise" ? 15 : 10;
        if (currentReps > maxReps) {
          currentWeight += prog.increment;
          currentReps = prog.reps;
        }

        // Create 3-5 sets per lift (compound lifts get 4-5, isolation gets 3-4)
        const isCompound = ["Bench Press", "Overhead Press", "Deadlift", "Barbell Row", "Squat", "Leg Press"].includes(liftName);
        const numSets = isCompound ? 4 + (week >= 2 ? 1 : 0) : 3 + (week >= 3 ? 1 : 0);

        for (let setNum = 1; setNum <= numSets; setNum++) {
          // Last set might have fewer reps (fatigue)
          const setReps = setNum === numSets ? Math.max(currentReps - 2, 3) : currentReps;
          // Slight weight variation for last sets on heavy compounds
          const setWeight = setNum >= numSets && isCompound ? currentWeight - 5 : currentWeight;

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

  // Body weight entries for Jake (slight downward trend: 185 -> 182)
  const bodyWeightStart = 185;
  const bodyWeightEnd = 182;
  const numEntries = 12;
  const bwDailyDrop = (bodyWeightStart - bodyWeightEnd) / (numEntries - 1);

  for (let i = 0; i < numEntries; i++) {
    const date = new Date(startMonday);
    date.setDate(startMonday.getDate() + Math.floor(i * 28 / numEntries));

    // Add slight random variation (-0.5 to +0.5 lbs)
    const weight = bodyWeightStart - (bwDailyDrop * i) + (Math.random() - 0.5);
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

  // Movement data for Jake (runs and walks)
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

  console.log("\nSeed complete!");
  console.log("Test accounts:");
  console.log("  Jake / temporary123 (has workout data)");
  console.log("  Kate / temporary123 (fresh account)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
