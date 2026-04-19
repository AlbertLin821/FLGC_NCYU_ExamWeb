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
    console.log('Seeding database...');
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
                    ],
                    skipDuplicates: true
                }
            }
        }
    });
    const existingExam = await prisma.exam.findFirst({
        where: { title: '英文能力鑑定 - 造句測驗 (初級)' },
    });
    const exam = existingExam || await prisma.exam.create({
        data: {
            title: '英文能力鑑定 - 造句測驗 (初級)',
            difficulty: 'easy',
            timeLimit: 30,
            startTime: new Date(),
            endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'published',
            createdBy: teacher.id,
            examClasses: {
                create: { classId: classA.id },
            },
            questions: {
                createMany: {
                    data: [
                        { word1: 'apple', word2: 'red', orderNum: 1 },
                        { word1: 'book', word2: 'read', orderNum: 2 },
                        { word1: 'school', word2: 'happy', orderNum: 3 },
                    ]
                }
            }
        }
    });
    console.log('Seeding complete.');
    console.log(`- Teacher login: admin@nchu.edu.tw / admin123`);
    console.log(`- Default Admin: albertlin94821@gmail.com / Tt12345678`);
    console.log(`- Student IDs: 411200001 (王小明), 411200002 (李小華)`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map