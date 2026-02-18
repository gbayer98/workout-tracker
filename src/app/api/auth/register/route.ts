import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const trimmed = username.trim().toLowerCase();

    // Username validation
    if (trimmed.length < 3 || trimmed.length > 20) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Password validation
    if (!/\S/.test(password)) {
      return NextResponse.json(
        { error: "Password cannot be only whitespace" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password must be 128 characters or fewer" },
        { status: 400 }
      );
    }

    // Check if username is taken (case-insensitive via lowercased trimmed)
    const existing = await prisma.user.findFirst({
      where: { username: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: trimmed,
        password: hashedPassword,
        displayName: trimmed,
      },
    });

    // Seed new account with a starter workout (non-blocking — don't fail registration)
    try {
      const starterLifts = await prisma.lift.findMany({
        where: {
          isGlobal: true,
          name: { in: ["Bench Press", "Squat", "Barbell Row", "Overhead Press", "Deadlift"] },
        },
      });

      if (starterLifts.length > 0) {
        await prisma.workout.create({
          data: {
            name: "Getting Started",
            userId: user.id,
            workoutLifts: {
              create: starterLifts.map((lift, i) => ({
                liftId: lift.id,
                order: i,
              })),
            },
          },
        });
      }
    } catch {
      // Starter workout is optional — don't fail registration
    }

    return NextResponse.json(
      { username: user.username },
      { status: 201 }
    );
  } catch (err) {
    // Handle Prisma unique constraint violations (race condition on double-submit)
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
