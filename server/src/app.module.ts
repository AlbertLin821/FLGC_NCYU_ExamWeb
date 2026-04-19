import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RolesGuard } from './auth/guards';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassesModule } from './classes/classes.module';
import { StudentsModule } from './students/students.module';
import { ExamsModule } from './exams/exams.module';
import { QuestionsModule } from './questions/questions.module';
import { ScoringModule } from './scoring/scoring.module';
import { CheatModule } from './cheat/cheat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TeachersModule,
    ClassesModule,
    StudentsModule,
    ExamsModule,
    QuestionsModule,
    ScoringModule,
    CheatModule,
  ],
  controllers: [AppController],
  providers: [AppService, RolesGuard],
})
export class AppModule {}
