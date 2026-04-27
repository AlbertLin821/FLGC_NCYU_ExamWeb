CREATE TABLE "student_classes" (
  "student_id" INTEGER NOT NULL,
  "class_id" INTEGER NOT NULL,
  CONSTRAINT "student_classes_pkey" PRIMARY KEY ("student_id", "class_id")
);

INSERT INTO "student_classes" ("student_id", "class_id")
SELECT "id", "class_id"
FROM "students"
WHERE "class_id" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX "student_classes_class_id_idx" ON "student_classes"("class_id");

ALTER TABLE "student_classes"
  ADD CONSTRAINT "student_classes_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_classes"
  ADD CONSTRAINT "student_classes_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "students_class_id_idx";
ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_class_id_fkey";
ALTER TABLE "students" DROP COLUMN IF EXISTS "class_id";
