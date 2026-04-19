import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

interface ScoringResult {
  score: number;
  feedback: string;
  model: string;
}

/** 供測試與日誌分類：是否為配額／速率限制類錯誤 */
export function classifyAiScoringError(err: unknown): 'rate_limit' | 'provider' | 'other' {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|RESOURCE_EXHAUSTED|quota|rate|limit: 0/i.test(msg)) {
    return 'rate_limit';
  }
  if (/500|502|503|504|INTERNAL|UNAVAILABLE/i.test(msg)) {
    return 'provider';
  }
  return 'other';
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private openai: OpenAI | null = null;
  private gemini: GoogleGenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');

    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
    if (geminiKey) {
      this.gemini = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  private buildEssayPrompt(prompt: string, answer: string): string {
    return `You are an English language teacher grading a student's short answer or essay.

Question Prompt: "${prompt}"
Student's Answer: "${answer}"

Please evaluate the answer for correctness, grammar, and relevance to the prompt.

Respond in this exact JSON format only:
{"score": <0-100>, "feedback": "<brief explanation in Traditional Chinese, max 50 characters>"}`;
  }

  async scoreWithOpenAI(prompt: string): Promise<ScoringResult> {
    if (!this.openai) throw new Error('OpenAI API key not configured');

    const model = this.config.get<string>('AI_MODEL', 'gpt-4o-mini');
    const response = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(content);

    return {
      score: Math.min(100, Math.max(0, parsed.score)),
      feedback: parsed.feedback,
      model,
    };
  }

  async scoreWithGemini(prompt: string): Promise<ScoringResult> {
    if (!this.gemini) throw new Error('Gemini API key not configured');

    const model = 'gemini-2.0-flash';
    const response = await this.gemini.models.generateContent({
      model,
      contents: prompt,
    });

    const content = response.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse Gemini response');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      score: Math.min(100, Math.max(0, parsed.score)),
      feedback: parsed.feedback,
      model,
    };
  }

  async scoreAI(prompt: string): Promise<ScoringResult> {
    const aiModel = this.config.get<string>('AI_MODEL', 'gpt-4o-mini');

    try {
      if (aiModel.startsWith('gpt') || aiModel.startsWith('o')) {
        return await this.scoreWithOpenAI(prompt);
      } else {
        return await this.scoreWithGemini(prompt);
      }
    } catch (error) {
      this.logger.warn(`Primary AI scoring failed, trying fallback: ${error}`);
      try {
        if (aiModel.startsWith('gpt') && this.gemini) {
          return await this.scoreWithGemini(prompt);
        } else if (!aiModel.startsWith('gpt') && this.openai) {
          return await this.scoreWithOpenAI(prompt);
        }
      } catch (fallbackError) {
        this.logger.warn(`Fallback scoring also failed: ${fallbackError}`);
      }
      throw error;
    }
  }

  /**
   * AI 評分失敗時：交卷流程已在 ExamsService 完成，此處不得拋錯中斷批次。
   * 以 0 分＋pending_review 標記，供教師後台複閱。
   */
  private async markEssayPendingReview(answerId: number, err: unknown): Promise<void> {
    const kind = classifyAiScoringError(err);
    const detail = err instanceof Error ? err.message : String(err);
    const logPayload = {
      answerId,
      kind,
      detailPreview: detail.slice(0, 500),
    };
    if (kind === 'rate_limit') {
      this.logger.warn(`AI scoring rate-limited / quota; marking pending_review ${JSON.stringify(logPayload)}`);
    } else {
      this.logger.warn(`AI scoring failed; marking pending_review ${JSON.stringify(logPayload)}`);
    }

    await this.prisma.answer.update({
      where: { id: answerId },
      data: {
        aiScore: 0,
        aiFeedback:
          kind === 'rate_limit'
            ? 'AI 評分服務目前配額不足，已暫以 0 分記錄並標記為待人工複閱。'
            : 'AI 評分暫時無法完成，已暫以 0 分記錄並標記為待人工複閱。',
        aiModel: 'pending_review',
      },
    });
  }

  async scoreSession(sessionId: number) {
    const answers = await this.prisma.answer.findMany({
      where: { sessionId, aiScore: null },
      include: { question: true },
    });

    const results: Array<
      | { answerId: number; score: number; feedback: string }
      | { answerId: number; skipped: true }
      | { answerId: number; pendingReview: true; kind: string }
    > = [];

    for (const answer of answers) {
      const content = answer.content?.trim();
      if (!content) {
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: {
            aiScore: 0,
            aiFeedback: '未作答',
            aiModel: 'system',
          },
        });
        results.push({ answerId: answer.id, skipped: true });
        continue;
      }

      const q = answer.question;

      if (q.type === 'essay') {
        try {
          const res = await this.scoreAI(this.buildEssayPrompt(q.content || '', content));
          await this.prisma.answer.update({
            where: { id: answer.id },
            data: {
              aiScore: res.score,
              aiFeedback: res.feedback,
              aiModel: res.model,
            },
          });
          results.push({ answerId: answer.id, score: res.score, feedback: res.feedback });
        } catch (err) {
          await this.markEssayPendingReview(answer.id, err);
          results.push({
            answerId: answer.id,
            pendingReview: true,
            kind: classifyAiScoringError(err),
          });
        }
        continue;
      }

      if (q.type === 'multiple_choice') {
        const score = content === q.answer ? 100 : 0;
        const feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: { aiScore: score, aiFeedback: feedback, aiModel: 'system' },
        });
        results.push({ answerId: answer.id, score, feedback });
        continue;
      }

      if (q.type === 'multiple_selection') {
        const studentAns = content.split(',').sort().join(',');
        const correctAns = q.answer?.split(',').sort().join(',');
        const score = studentAns === correctAns ? 100 : 0;
        const feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: { aiScore: score, aiFeedback: feedback, aiModel: 'system' },
        });
        results.push({ answerId: answer.id, score, feedback });
        continue;
      }

      await this.prisma.answer.update({
        where: { id: answer.id },
        data: {
          aiScore: 0,
          aiFeedback: `未知題型 (${q.type})，請人工複閱`,
          aiModel: 'pending_review',
        },
      });
      results.push({ answerId: answer.id, pendingReview: true, kind: 'unknown_type' });
    }

    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'graded' },
    });

    return results;
  }
}
