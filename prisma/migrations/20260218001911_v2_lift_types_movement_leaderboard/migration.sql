-- CreateEnum
CREATE TYPE "LiftType" AS ENUM ('STRENGTH', 'BODYWEIGHT', 'ENDURANCE');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RUN', 'WALK');

-- AlterTable
ALTER TABLE "Lift" ADD COLUMN     "type" "LiftType" NOT NULL DEFAULT 'STRENGTH';

-- AlterTable
ALTER TABLE "SessionSet" ADD COLUMN     "duration" INTEGER,
ALTER COLUMN "weight" SET DEFAULT 0,
ALTER COLUMN "reps" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "distance" DECIMAL(65,30) NOT NULL,
    "duration" INTEGER,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "liftName" TEXT,
    "metric" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "LeaderboardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movement_userId_idx" ON "Movement"("userId");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
