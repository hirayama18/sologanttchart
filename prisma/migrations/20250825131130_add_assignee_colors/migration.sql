-- CreateTable
CREATE TABLE "public"."assignee_colors" (
    "id" TEXT NOT NULL,
    "assignee" TEXT NOT NULL,
    "colorIndex" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignee_colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assignee_colors_projectId_assignee_key" ON "public"."assignee_colors"("projectId", "assignee");

-- AddForeignKey
ALTER TABLE "public"."assignee_colors" ADD CONSTRAINT "assignee_colors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
