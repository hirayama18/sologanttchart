-- CreateTable
CREATE TABLE "public"."project_assignee_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_assignee_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_assignee_options_projectId_order_key" ON "public"."project_assignee_options"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignee_options_projectId_name_key" ON "public"."project_assignee_options"("projectId", "name");

-- AddForeignKey
ALTER TABLE "public"."project_assignee_options" ADD CONSTRAINT "project_assignee_options_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
