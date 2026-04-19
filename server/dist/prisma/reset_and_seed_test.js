"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg = __importStar(require("pg"));
const bcrypt = __importStar(require("bcryptjs"));
const pool = new pg.Pool({
    connectionString: process.env.DIRECT_URL || process.env.DB_URL || process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
        }
    });
    console.log('Seeding test data...');
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
//# sourceMappingURL=reset_and_seed_test.js.map