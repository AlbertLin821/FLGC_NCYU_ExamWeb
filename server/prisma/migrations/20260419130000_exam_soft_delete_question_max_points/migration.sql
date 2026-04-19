-- AlterTable
ALTER TABLE "exams" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "questions" ADD COLUMN "max_points" INTEGER NOT NULL DEFAULT 100;
