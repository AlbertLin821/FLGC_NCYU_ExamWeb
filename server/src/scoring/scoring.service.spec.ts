import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScoringService, classifyAiScoringError } from './scoring.service';
import { PrismaService } from '../prisma/prisma.service';

describe('classifyAiScoringError', () => {
  it('detects rate limit / quota', () => {
    expect(classifyAiScoringError(new Error('429 quota exceeded'))).toBe('rate_limit');
    expect(classifyAiScoringError(new Error('RESOURCE_EXHAUSTED'))).toBe('rate_limit');
    expect(classifyAiScoringError(new Error('Too Many Requests'))).toBe('rate_limit');
  });

  it('detects provider errors', () => {
    expect(classifyAiScoringError(new Error('500 INTERNAL'))).toBe('provider');
  });

  it('defaults to other', () => {
    expect(classifyAiScoringError(new Error('weird'))).toBe('other');
  });
});

describe('ScoringService', () => {
  let service: ScoringService;
  const mockPrisma = {
    answer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    examSession: {
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    exam: {
      findFirst: jest.fn().mockResolvedValue({ id: 1, examClasses: [] }),
    },
    student: {
      findUnique: jest.fn().mockResolvedValue({ id: 1, classes: [] }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) => {
              if (key === 'AI_MODEL') return 'gemini-2.5-flash';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ScoringService);
  });

  it('scoreObjectiveOnly skips essay answers (no AI, no answer update)', async () => {
    mockPrisma.answer.findMany.mockImplementation((args: { where?: { questionId?: { in?: number[] } } }) => {
      if (args.where?.questionId?.in) {
        return Promise.resolve([{ questionId: 99, aiScore: null }]);
      }
      return Promise.resolve([
        {
          id: 10,
          content: 'essay text',
          sessionId: 5,
          question: { type: 'essay', content: 'Q?', answer: null },
        },
      ]);
    });
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 5,
      exam: {
        questions: [{ id: 99, type: 'essay' }],
      },
    });

    const spy = jest.spyOn(service, 'scoreAI');
    const results = await service.scoreObjectiveOnly(5);

    expect(spy).not.toHaveBeenCalled();
    expect(mockPrisma.answer.update).not.toHaveBeenCalled();
    expect(results).toEqual([]);
    expect(mockPrisma.examSession.update).not.toHaveBeenCalled();
  });

  it('scoreObjectiveOnly marks graded when exam has no essay questions', async () => {
    mockPrisma.answer.findMany.mockImplementation((args: { where?: { questionId?: { in?: number[] } } }) => {
      if (args.where?.questionId?.in) {
        return Promise.resolve([]);
      }
      return Promise.resolve([
        {
          id: 2,
          content: 'A',
          sessionId: 1,
          question: { type: 'multiple_choice', content: 'Q', answer: 'A' },
        },
      ]);
    });
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 1,
      exam: {
        questions: [{ id: 1, type: 'multiple_choice' }],
      },
    });

    const spy = jest.spyOn(service, 'scoreAI');
    await service.scoreObjectiveOnly(1);

    expect(spy).not.toHaveBeenCalled();
    expect(mockPrisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ aiScore: 100, aiModel: 'system' }),
      }),
    );
    expect(mockPrisma.examSession.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'graded' },
    });
  });

  it('scoreObjectiveOnly does not set graded while essay scores still null', async () => {
    mockPrisma.answer.findMany.mockImplementation((args: { where?: { questionId?: { in?: number[] } } }) => {
      if (args.where?.questionId?.in) {
        return Promise.resolve([{ questionId: 20, aiScore: null }]);
      }
      return Promise.resolve([
        {
          id: 2,
          content: 'A',
          sessionId: 1,
          question: { type: 'multiple_choice', content: 'Q', answer: 'A' },
        },
        {
          id: 3,
          content: '',
          sessionId: 1,
          question: { type: 'essay', content: 'E', answer: null },
        },
      ]);
    });
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 1,
      exam: {
        questions: [
          { id: 1, type: 'multiple_choice' },
          { id: 20, type: 'essay' },
        ],
      },
    });

    await service.scoreObjectiveOnly(1);

    expect(mockPrisma.examSession.update).not.toHaveBeenCalled();
  });

  it('manualGradeAnswer sets teacher_manual and clamps score', async () => {
    mockPrisma.answer.findUnique.mockResolvedValue({
      id: 3,
      session: { examId: 1, student: { id: 1 } },
    });
    mockPrisma.answer.update.mockResolvedValue({ id: 3, aiModel: 'teacher_manual' });
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 1,
      exam: { questions: [] },
    });

    const out = await service.manualGradeAnswer(3, 85.4, '佳', { id: 1, role: 'admin' });

    expect(mockPrisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({
          aiScore: 85.4,
          aiModel: 'teacher_manual',
          aiFeedback: '佳',
        }),
      }),
    );
    expect(out).toEqual(expect.objectContaining({ id: 3 }));
  });

  it('scoreSubmittedSession sends all writing answers in one AI request', async () => {
    mockPrisma.answer.findMany.mockImplementation((args: { where?: any }) => {
      if (args.where?.sessionId && args.where?.aiScore === null) {
        return Promise.resolve([]);
      }
      if (args.where?.questionId?.in) {
        return Promise.resolve([]);
      }
      if (args.where?.id?.in) {
        return Promise.resolve([
          {
            id: 11,
            questionId: 101,
            content: 'This is my short answer.',
            writingDurationSeconds: 30,
            wordCount: 5,
            question: {
              id: 101,
              orderNum: 1,
              type: 'essay',
              maxPoints: 50,
              content: 'Write one sentence.',
            },
          },
          {
            id: 12,
            questionId: 102,
            content: 'I agree because academic discussion improves communication.',
            writingDurationSeconds: 120,
            wordCount: 8,
            question: {
              id: 102,
              orderNum: 2,
              type: 'paragraph_writing',
              maxPoints: 50,
              content: 'Discuss your opinion.',
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    mockPrisma.answer.upsert
      .mockResolvedValueOnce({ id: 11 })
      .mockResolvedValueOnce({ id: 12 });
    mockPrisma.examSession.findUnique.mockImplementation((args: { include?: any }) => {
      if (args.include?.answers) {
        return Promise.resolve({
          id: 7,
          exam: {
            questions: [
              { id: 101, orderNum: 1, type: 'essay' },
              { id: 102, orderNum: 2, type: 'paragraph_writing' },
            ],
          },
          answers: [],
        });
      }
      return Promise.resolve({
        id: 7,
        exam: {
          questions: [
            { id: 101, type: 'essay' },
            { id: 102, type: 'paragraph_writing' },
          ],
        },
      });
    });
    const callSpy = jest
      .spyOn(service as any, 'callBatchGradingModel')
      .mockResolvedValue({
        modelUsed: 'gemini-test',
        raw: JSON.stringify({
          items: [
            {
              answerId: 11,
              questionId: 101,
              aiScore: 90,
              aiFeedback: '句子自然。',
              writingScore: null,
              cefrLevel: null,
            },
            {
              answerId: 12,
              questionId: 102,
              aiScore: 80,
              aiFeedback: 'Evaluation Report\nFinal Score: 4 / 5',
              writingScore: 4,
              cefrLevel: 'B2',
            },
          ],
          overallFeedbackEn: 'Good work.',
          overallFeedbackZh: '整體表現良好。',
        }),
      });

    await service.scoreSubmittedSession(7, true);
    await new Promise((resolve) => setImmediate(resolve));

    expect(callSpy).toHaveBeenCalledTimes(1);
    const prompt = callSpy.mock.calls[0][0] as string;
    expect(prompt).toContain('answerId: 11');
    expect(prompt).toContain('answerId: 12');
    expect(mockPrisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({ aiScore: 90, aiModel: 'gemini-test' }),
      }),
    );
    expect(mockPrisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12 },
        data: expect.objectContaining({ aiScore: 80, writingScore: 4, cefrLevel: 'B2' }),
      }),
    );
  });
});
