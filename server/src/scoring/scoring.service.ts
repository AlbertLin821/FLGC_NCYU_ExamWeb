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
    // Extract JSON from response
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
      this.logger.error(`AI scoring failed: ${error}`);
      try {
        if (aiModel.startsWith('gpt') && this.gemini) {
          return await this.scoreWithGemini(prompt);
        } else if (this.openai) {
          return await this.scoreWithOpenAI(prompt);
        }
      } catch (fallbackError) {
        this.logger.error(`Fallback scoring also failed: ${fallbackError}`);
      }
      throw error;
    }
  }

  async scoreSession(sessionId: number) {
    const answers = await this.prisma.answer.findMany({
      where: { sessionId, aiScore: null },
      include: { question: true },
    });

    const results = await Promise.all(
      answers.map(async (answer) => {
        if (!answer.content) return { answerId: answer.id, skipped: true };

        const q = answer.question;
        let score = 0;
        let feedback = '';
        let model = 'system';

        try {
          if (q.type === 'essay') {
            const res = await this.scoreAI(this.buildEssayPrompt(q.content || '', answer.content));
            score = res.score;
            feedback = res.feedback;
            model = res.model;
          } else if (q.type === 'multiple_choice') {
            score = answer.content === q.answer ? 100 : 0;
            feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
          } else if (q.type === 'multiple_selection') {
            const studentAns = answer.content.split(',').sort().join(',');
            const correctAns = q.answer?.split(',').sort().join(',');
            score = studentAns === correctAns ? 100 : 0;
            feedback = score === 100 ? '正確' : `錯誤 (正確答案: ${q.answer})`;
          }

          await this.prisma.answer.update({
            where: { id: answer.id },
            data: {
              aiScore: score,
              aiFeedback: feedback,
              aiModel: model,
            },
          });

          return { answerId: answer.id, score, feedback };
        } catch (err: any) {
          this.logger.error(`Failed to score answer ${answer.id}: ${err.message}`);
          return { answerId: answer.id, error: err.message };
        }
      }),
    );

    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'graded' },
    });

    return results;
  }
}
