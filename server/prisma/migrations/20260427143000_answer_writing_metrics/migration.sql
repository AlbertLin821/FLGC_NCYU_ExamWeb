ALTER TABLE "answers" ADD COLUMN "writing_duration_seconds" INTEGER;
ALTER TABLE "answers" ADD COLUMN "word_count" INTEGER;
ALTER TABLE "answers" ADD COLUMN "writing_score" DECIMAL(4, 2);
ALTER TABLE "answers" ADD COLUMN "cefr_level" TEXT;
