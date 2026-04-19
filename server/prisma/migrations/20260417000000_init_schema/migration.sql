-- Baseline：空資料庫首次 migrate deploy 時需先建立 exams 等資料表（含 exams.class_id）。
-- 後續 20260418120000_exam_many_classes 會建立 exam_classes 並移轉後刪除 class_id；
-- 20260419130000_exam_soft_delete_question_max_points 會新增 deleted_at 與 max_points。

CREATE TABLE "teachers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'teacher',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invite_token" TEXT,
    "invite_expires" TIMESTAMP(3),
    "reset_password_token" TEXT,
    "reset_password_expires" TIMESTAMP(3),

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_classes" (
    "teacher_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "teacher_classes_pkey" PRIMARY KEY ("teacher_id","class_id")
);

CREATE TABLE "students" (
    "id" SERIAL NOT NULL,
    "student_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class_id" INTEGER NOT NULL,
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exams" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT,
    "time_limit" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "class_id" INTEGER NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "questions" (
    "id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'multiple_choice',
    "content" TEXT,
    "options" JSONB,
    "answer" TEXT,
    "word1" TEXT,
    "word2" TEXT,
    "order_num" INTEGER NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_sessions" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "exam_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "answers" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "content" TEXT,
    "ai_score" DECIMAL(5,2),
    "ai_feedback" TEXT,
    "ai_model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cheat_logs" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "details" JSONB,
    "resolved_by" INTEGER,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cheat_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");
CREATE INDEX "teachers_role_idx" ON "teachers"("role");
CREATE INDEX "classes_created_by_idx" ON "classes"("created_by");
CREATE INDEX "teacher_classes_class_id_idx" ON "teacher_classes"("class_id");
CREATE UNIQUE INDEX "students_student_id_key" ON "students"("student_id");
CREATE INDEX "students_class_id_idx" ON "students"("class_id");
CREATE INDEX "exams_status_idx" ON "exams"("status");
CREATE INDEX "exams_start_time_end_time_idx" ON "exams"("start_time", "end_time");
CREATE INDEX "exams_created_by_idx" ON "exams"("created_by");
CREATE INDEX "exams_class_id_idx" ON "exams"("class_id");
CREATE INDEX "questions_exam_id_idx" ON "questions"("exam_id");
CREATE INDEX "exam_sessions_status_idx" ON "exam_sessions"("status");
CREATE INDEX "exam_sessions_student_id_idx" ON "exam_sessions"("student_id");
CREATE INDEX "exam_sessions_submitted_at_idx" ON "exam_sessions"("submitted_at");
CREATE UNIQUE INDEX "exam_sessions_student_id_exam_id_key" ON "exam_sessions"("student_id", "exam_id");
CREATE UNIQUE INDEX "answers_session_id_question_id_key" ON "answers"("session_id", "question_id");
CREATE INDEX "cheat_logs_session_id_idx" ON "cheat_logs"("session_id");
CREATE INDEX "cheat_logs_event_type_idx" ON "cheat_logs"("event_type");
CREATE INDEX "cheat_logs_resolved_by_idx" ON "cheat_logs"("resolved_by");

ALTER TABLE "classes" ADD CONSTRAINT "classes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teacher_classes" ADD CONSTRAINT "teacher_classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_classes" ADD CONSTRAINT "teacher_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cheat_logs" ADD CONSTRAINT "cheat_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cheat_logs" ADD CONSTRAINT "cheat_logs_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
