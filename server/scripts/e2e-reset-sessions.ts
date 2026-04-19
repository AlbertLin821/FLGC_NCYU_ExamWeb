/**
 * 清除 E2E 指定學號的考試 session（答案、防弊紀錄），讓 Playwright 可重複跑「進入考場→交卷」。
 * 執行目錄：server/（需可讀取 .env 的 DATABASE_URL / DIRECT_URL）
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DB_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** 與 client/tests/e2e/student_exam_smoke.spec.ts 使用之學號一致 */
const TARGET_STUDENT_IDS = ['411200002'];

async function main() {
  for (const studentId of TARGET_STUDENT_IDS) {
    const student = await prisma.student.findUnique({ where: { studentId } });
    if (!student) {
      console.warn(`[e2e-reset] 找不到學號 ${studentId}，略過`);
      continue;
    }
    const sessions = await prisma.examSession.findMany({ where: { studentId: student.id } });
    for (const s of sessions) {
      await prisma.answer.deleteMany({ where: { sessionId: s.id } });
      await prisma.cheatLog.deleteMany({ where: { sessionId: s.id } });
    }
    const deleted = await prisma.examSession.deleteMany({ where: { studentId: student.id } });
    console.log(`[e2e-reset] 學號 ${studentId}：已刪除 ${deleted.count} 筆 session`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
