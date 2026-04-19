import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScoringService, classifyAiScoringError } from './scoring.service';
import { PrismaService } from '../prisma/prisma.service';

describe('classifyAiScoringError', () => {
  it('detects rate limit / quota', () => {
    expect(classifyAiScoringError(new Error('429 quota exceeded'))).toBe('rate_limit');
    expect(classifyAiScoringError(new Error('RESOURCE_EXHAUSTED'))).toBe('rate_limit');
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
      update: jest.fn().mockResolvedValue({}),
    },
    examSession: {
      update: jest.fn().mockResolvedValue({}),
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
              if (key === 'AI_MODEL') return 'gemini-2.0-flash';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ScoringService);
  });

  it('marks essay as pending_review when AI fails (does not throw)', async () => {
    mockPrisma.answer.findMany.mockResolvedValue([
      {
        id: 10,
        content: 'essay text',
        sessionId: 5,
        question: { type: 'essay', content: 'Q?', answer: null },
      },
    ]);

    jest.spyOn(service, 'scoreAI').mockRejectedValue(new Error('429 RESOURCE_EXHAUSTED quota'));

    const results = await service.scoreSession(5);

    expect(mockPrisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          aiModel: 'pending_review',
          aiScore: 0,
        }),
      }),
    );
    expect(results).toEqual(
      expect.arrayContaining([expect.objectContaining({ answerId: 10, pendingReview: true })]),
    );
    expect(mockPrisma.examSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: { status: 'graded' },
      }),
    );
  });

  it('scores multiple_choice without calling AI', async () => {
    mockPrisma.answer.findMany.mockResolvedValue([
      {
        id: 2,
        content: 'A',
        sessionId: 1,
        question: { type: 'multiple_choice', content: 'Q', answer: 'A' },
      },
    ]);

    const spy = jest.spyOn(service, 'scoreAI');

    await service.scoreSession(1);

    expect(spy).not.toHaveBeenCalled();
    expect(mockPrisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ aiScore: 100, aiModel: 'system' }),
      }),
    );
  });
});
