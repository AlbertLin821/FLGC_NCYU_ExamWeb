/**
 * 需可連線資料庫（Prisma）且 JWT 與後端一致。
 * 執行：cd server && npm run test:e2e
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import { AppModule } from '../src/app.module';

describe('Teacher API JWT / 角色 (e2e)', () => {
  let app: INestApplication;
  let jwtSecret: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    jwtSecret =
      app.get(ConfigService).get<string>('JWT_SECRET') || 'fallback-secret';
  });

  afterAll(async () => {
    await app.close();
  });

  it('無 token 存取 GET /api/exams 為 401', () => {
    return request(app.getHttpServer()).get('/api/exams').expect(401);
  });

  it('student 角色 JWT 存取 GET /api/exams 為 403', () => {
    const token = sign(
      { sub: 1, email: 'stu@test.edu.tw', role: 'student' },
      jwtSecret,
      { expiresIn: '1h' },
    );
    return request(app.getHttpServer())
      .get('/api/exams')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('過期 teacher JWT 存取 GET /api/exams 為 401', () => {
    const token = sign(
      { sub: 1, email: 't@test.edu.tw', role: 'teacher' },
      jwtSecret,
      { expiresIn: '-10s' },
    );
    return request(app.getHttpServer())
      .get('/api/exams')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('有效 teacher JWT 存取 GET /api/exams 為 200', () => {
    const token = sign(
      { sub: 1, email: 't@test.edu.tw', role: 'teacher' },
      jwtSecret,
      { expiresIn: '1h' },
    );
    return request(app.getHttpServer())
      .get('/api/exams')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
