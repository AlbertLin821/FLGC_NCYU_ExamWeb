-- 已作答題數（冗餘欄，供列表／監看端避免每次 JOIN answers 現算）與 (exam_id, status) 查詢用索引

ALTER TABLE "exam_sessions" ADD COLUMN "answered_question_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "exam_sessions" AS s
SET "answered_question_count" = sub.cnt
FROM (
  SELECT
    a."session_id" AS session_id,
    COUNT(*)::integer AS cnt
  FROM "answers" AS a
  WHERE
    a."content" IS NOT NULL
    AND TRIM(a."content") <> ''
  GROUP BY a."session_id"
) AS sub
WHERE s."id" = sub.session_id;

CREATE INDEX "exam_sessions_exam_id_status_idx" ON "exam_sessions"("exam_id", "status");
