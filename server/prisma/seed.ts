import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as bcrypt from 'bcryptjs';

// 與 prisma.config.ts 的 datasource 順序一致；遷移／seed 建議使用 Session 端點（DIRECT_URL），
// 避免僅 DATABASE_URL（Transaction pooler）設定錯誤時導致 seed 失敗。
const pool = new pg.Pool({
  connectionString:
    process.env.DIRECT_URL || process.env.DB_URL || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Teacher
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const teacher = await prisma.teacher.upsert({
    where: { email: 'admin@nchu.edu.tw' },
    update: { passwordHash: hashedPassword },
    create: {
      email: 'admin@nchu.edu.tw',
      name: '語言中心管理員',
      passwordHash: hashedPassword,
      role: 'admin',
    },
  });

  // Create Default Admin for User
  const defaultAdminPassword = await bcrypt.hash('Tt12345678', 10);
  await prisma.teacher.upsert({
    where: { email: 'albertlin94821@gmail.com' },
    update: { passwordHash: defaultAdminPassword },
    create: {
      email: 'albertlin94821@gmail.com',
      name: 'Albert Lin',
      passwordHash: defaultAdminPassword,
      role: 'admin',
    },
  });

  // 2. Create or find Class
  const existingClass = await prisma.class.findFirst({
    where: { name: '112-1 英文 A B 班' },
  });

  const classA = existingClass || await prisma.class.create({
    data: {
      name: '112-1 英文 A B 班',
      description: '周一 08:10-10:00',
      createdBy: teacher.id,
      teachers: {
        create: { teacherId: teacher.id, role: 'owner' }
      },
      students: {
        createMany: {
          data: [
            { studentId: '411200001', name: '王小明' },
            { studentId: '411200002', name: '李小華' },
            { studentId: '411200003', name: '張測試' },
          ],
          skipDuplicates: true
        }
      }
    }
  });

  // 3. Create or find Exam
  const existingExam = await prisma.exam.findFirst({
    where: { title: '英文能力鑑定 - 造句測驗 (初級)' },
  });

  const exam = existingExam || await prisma.exam.create({
    data: {
      title: '英文能力鑑定 - 造句測驗 (初級)',
      difficulty: 'easy',
      timeLimit: 30,
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
      status: 'published',
      createdBy: teacher.id,
      examClasses: {
        create: { classId: classA.id },
      },
      questions: {
        createMany: {
          data: [
            {
              type: 'essay',
              content: '請使用單字 "apple" 與 "red" 造一句英文。',
              word1: 'apple',
              word2: 'red',
              orderNum: 1,
            },
            {
              type: 'essay',
              content: '請使用單字 "book" 與 "read" 造一句英文。',
              word1: 'book',
              word2: 'read',
              orderNum: 2,
            },
            {
              type: 'essay',
              content: '請使用單字 "school" 與 "happy" 造一句英文。',
              word1: 'school',
              word2: 'happy',
              orderNum: 3,
            },
          ],
        },
      },
    }
  });

  console.log('Seeding complete.');
  console.log(`- Teacher login: admin@nchu.edu.tw / admin123`);
  console.log(`- Default Admin: albertlin94821@gmail.com / Tt12345678`);
  console.log(`- Student IDs: 411200001 (王小明), 411200002 (李小華), 411200003 (張測試)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
