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

  // Delete in order to avoid FK constraints
  await prisma.cheatLog.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.examSession.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.class.deleteMany();
  
  // Optional: Keep teachers but reset their reset tokens
  await prisma.teacher.updateMany({
    data: {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    }
  });

  console.log('Seeding test data...');

  // 1. Ensure Admin Teacher exists
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.teacher.upsert({
    where: { email: 'admin@nchu.edu.tw' },
    update: { passwordHash: hashedPassword },
    create: {
      email: 'admin@nchu.edu.tw',
      name: '語言中心管理員',
      passwordHash: hashedPassword,
      role: 'admin',
    },
  });

  // 2. Create Test Class
  const testClass = await prisma.class.create({
    data: {
      name: 'E2E 測試班級',
      description: '用於全面功能測試',
      createdBy: admin.id,
      teachers: {
        create: { teacherId: admin.id, role: 'owner' }
      },
      students: {
        create: [
          { studentId: 'TEST001', name: '測試生甲' },
          { studentId: 'TEST002', name: '測試生乙' },
        ]
      }
    }
  });

  // 3. Create Test Exam
  const exam = await prisma.exam.create({
    data: {
      title: 'E2E 綜合測試考卷',
      difficulty: 'medium',
      timeLimit: 10,
      startTime: new Date(Date.now() - 60000), // Started 1 minute ago
      endTime: new Date(Date.now() + 3600000), // Ends in 1 hour
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
            orderNum: 1 
          },
          {
            type: 'essay',
            content: 'Please describe your favorite hobby in English.',
            orderNum: 2
          }
        ]
      }
    }
  });

  console.log('✅ Test environment ready!');
  console.log(`- Teacher: admin@nchu.edu.tw / admin123`);
  console.log(`- Student ID: TEST001 (測試生甲)`);
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
