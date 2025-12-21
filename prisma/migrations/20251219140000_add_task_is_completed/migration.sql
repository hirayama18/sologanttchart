-- Add isCompleted flag to tasks
ALTER TABLE "tasks"
ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from legacy completedAt
UPDATE "tasks"
SET "isCompleted" = true
WHERE "completedAt" IS NOT NULL;



