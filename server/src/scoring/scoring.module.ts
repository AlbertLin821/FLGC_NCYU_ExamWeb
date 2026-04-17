import { Module, forwardRef } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { ScoringController } from './scoring.controller';
import { ExamsModule } from '../exams/exams.module';

@Module({
  imports: [forwardRef(() => ExamsModule)],
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
