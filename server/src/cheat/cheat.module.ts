import { Module } from '@nestjs/common';
import { CheatService } from './cheat.service';
import { CheatGateway } from './cheat.gateway';
import { CheatController } from './cheat.controller';

@Module({
  controllers: [CheatController],
  providers: [CheatService, CheatGateway],
  exports: [CheatService],
})
export class CheatModule {}
