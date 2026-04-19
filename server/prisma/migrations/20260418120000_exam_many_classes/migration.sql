-- 考卷改為多班級：新增 exam_classes，並移轉 exams.class_id 資料後刪除該欄

CREATE TABLE "exam_classes" (
    "exam_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,

    CONSTRAINT "exam_classes_pkey" PRIMARY KEY ("exam_id","class_id")
);

CREATE INDEX "exam_classes_class_id_idx" ON "exam_classes"("class_id");

ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_classes" ADD CONSTRAINT "exam_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "exam_classes" ("exam_id", "class_id") SELECT "id", "class_id" FROM "exams";

ALTER TABLE "exams" DROP CONSTRAINT IF EXISTS "exams_class_id_fkey";
DROP INDEX IF EXISTS "exams_class_id_idx";
ALTER TABLE "exams" DROP COLUMN IF EXISTS "class_id";
