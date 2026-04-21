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
  console.log('Seeding database...');

  const hash = (p: string) => bcrypt.hash(p, 12);

  const system = await prisma.teacher.upsert({
    where: { email: 'system@ncyu.edu.tw' },
    update: { passwordHash: await hash('SystemDemo123!'), name: '語言中心系統管理' },
    create: {
      email: 'system@ncyu.edu.tw',
      name: '語言中心系統管理',
      passwordHash: await hash('SystemDemo123!'),
      role: 'admin',
    },
  });

  const teacherUser = await prisma.teacher.upsert({
    where: { email: 'teacher@ncyu.edu.tw' },
    update: { passwordHash: await hash('TeacherDemo123!') },
    create: {
      email: 'teacher@ncyu.edu.tw',
      name: '示範教師',
      passwordHash: await hash('TeacherDemo123!'),
      role: 'teacher',
    },
  });

  const viewerUser = await prisma.teacher.upsert({
    where: { email: 'viewer@ncyu.edu.tw' },
    update: { passwordHash: await hash('ViewerDemo123!') },
    create: {
      email: 'viewer@ncyu.edu.tw',
      name: '示範檢視帳號',
      passwordHash: await hash('ViewerDemo123!'),
      role: 'viewer',
    },
  });

  const existingClass = await prisma.class.findFirst({
    where: { name: '113-1 英文示範班' },
  });

  const classA =
    existingClass ||
    (await prisma.class.create({
      data: {
        name: '113-1 英文示範班',
        description: '嘉義大學語言中心示範班級',
        createdBy: system.id,
        teachers: {
          createMany: {
            data: [
              { teacherId: system.id, role: 'owner' },
              { teacherId: teacherUser.id, role: 'member' },
              { teacherId: viewerUser.id, role: 'member' },
            ],
            skipDuplicates: true,
          },
        },
        students: {
          createMany: {
            data: [
              { studentId: '411200001', name: '王小明', schoolName: '國立嘉義大學' },
              { studentId: '411200002', name: '李小華', schoolName: '國立嘉義大學' },
              { studentId: '411200003', name: '張測試', schoolName: '國立嘉義大學' },
            ],
            skipDuplicates: true,
          },
        },
      },
    }));

  const existingExam = await prisma.exam.findFirst({
    where: { title: '英文能力鑑定 - 造句測驗 (初級)' },
  });

  if (!existingExam) {
    await prisma.exam.create({
      data: {
        title: '英文能力鑑定 - 造句測驗 (初級)',
        difficulty: 'easy',
        timeLimit: 30,
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'published',
        createdBy: teacherUser.id,
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
      },
    });
  }

  console.log('Seeding complete.');
  console.log('- 系統管理 system@ncyu.edu.tw / SystemDemo123!');
  console.log('- 示範教師 teacher@ncyu.edu.tw / TeacherDemo123!');
  console.log('- 檢視／監控 viewer@ncyu.edu.tw / ViewerDemo123!');
  console.log('- 學生登入：輸入學號 411200001（另見 411200002／411200003）');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
