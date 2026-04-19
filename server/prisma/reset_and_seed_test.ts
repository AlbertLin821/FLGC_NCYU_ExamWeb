import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new pg.Pool({
  connectionString:
    process.env.DIRECT_URL || process.env.DB_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Cleaning up database...');

  await prisma.cheatLog.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.class.deleteMany();

  await prisma.teacher.updateMany({
    data: {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  console.log('Seeding test data...');

  const hashedPassword = await bcrypt.hash('SystemDemo123!', 12);
  const admin = await prisma.teacher.upsert({
    where: { email: 'system@ncyu.edu.tw' },
    update: { passwordHash: hashedPassword },
    create: {
      email: 'system@ncyu.edu.tw',
      name: 'E2E 系統管理',
      passwordHash: hashedPassword,
      role: 'admin',
    },
  });

  const testClass = await prisma.class.create({
    data: {
      name: 'E2E 測試班級',
      description: '用於全面功能測試',
      createdBy: admin.id,
      teachers: {
        create: { teacherId: admin.id, role: 'owner' },
      },
      students: {
        create: [
          { studentId: 'TEST001', name: '測試生甲' },
          { studentId: 'TEST002', name: '測試生乙' },
        ],
      },
    },
  });

  const exam = await prisma.exam.create({
    data: {
      title: 'E2E 綜合測試考卷',
      difficulty: 'medium',
      timeLimit: 10,
      startTime: new Date(Date.now() - 60000),
      endTime: new Date(Date.now() + 3600000),
      status: 'published',
      createdBy: admin.id,
      examClasses: {
        create: { classId: testClass.id },
      },
      questions: {
        create: [
          {
            type: 'multiple_choice',
            content: 'What is the capital of France?',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            answer: 'B',
            orderNum: 1,
          },
          {
            type: 'essay',
            content: 'Please describe your favorite hobby in English.',
            orderNum: 2,
          },
        ],
      },
    },
  });

  console.log('Test environment ready.');
  console.log('- 教師／管理員：system@ncyu.edu.tw / SystemDemo123!');
  console.log('- Student ID: TEST001 (測試生甲)');
  console.log(`- Exam ID: ${exam.id} ("${exam.title}")`);
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
