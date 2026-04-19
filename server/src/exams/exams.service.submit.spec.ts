import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExamsService } from './exams.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';

describe('ExamsService submit flows', () => {
  let service: ExamsService;
  const mockScoreObjectiveOnly = jest.fn().mockResolvedValue([]);
  const mockPrisma = {
    examSession: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    answer: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ScoringService,
          useValue: { scoreObjectiveOnly: mockScoreObjectiveOnly },
        },
      ],
    }).compile();

    service = module.get(ExamsService);
  });

  it('submitExam rejects duplicate submit', async () => {
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 1,
      status: 'submitted',
      exam: { timeLimit: 60 },
    });

    await expect(service.submitExam(1)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submitExam(1)).rejects.toMatchObject({ message: '已交卷' });
    expect(mockScoreObjectiveOnly).not.toHaveBeenCalled();
  });

  it('submitExam rejects when session missing', async () => {
    mockPrisma.examSession.findUnique.mockResolvedValue(null);

    await expect(service.submitExam(999)).rejects.toBeInstanceOf(NotFoundException);
    expect(mockScoreObjectiveOnly).not.toHaveBeenCalled();
  });

  it('submitExam triggers background scoring without awaiting failure', async () => {
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 2,
      status: 'in_progress',
      exam: { timeLimit: 10 },
    });
    mockPrisma.examSession.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.examSession.findUniqueOrThrow.mockResolvedValue({ id: 2, status: 'submitted' });
    mockScoreObjectiveOnly.mockRejectedValue(new Error('scoring boom'));

    const result = await service.submitExam(2);

    expect(result.status).toBe('submitted');
    await new Promise((r) => setImmediate(r));
    expect(mockScoreObjectiveOnly).toHaveBeenCalledWith(2);
  });

  it('submitAnswer 於時間歸零後拒絕作答', async () => {
    const started = new Date(Date.now() - 61 * 60 * 1000);
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 3,
      status: 'in_progress',
      startedAt: started,
      exam: { timeLimit: 60 },
    });

    await expect(service.submitAnswer(3, 10, 'late')).rejects.toMatchObject({
      message: '作答時間已結束',
    });
    expect(mockPrisma.answer.upsert).not.toHaveBeenCalled();
  });

  it('submitAnswer 重複寫入以 upsert 單一筆（同一題覆寫）', async () => {
    const started = new Date();
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 4,
      status: 'in_progress',
      startedAt: started,
      exam: { timeLimit: 60 },
    });
    mockPrisma.answer.upsert.mockResolvedValue({ id: 1 });

    await service.submitAnswer(4, 20, 'a');
    await service.submitAnswer(4, 20, 'b');

    expect(mockPrisma.answer.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.answer.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { sessionId_questionId: { sessionId: 4, questionId: 20 } },
        update: { content: 'b' },
      }),
    );
  });
});
