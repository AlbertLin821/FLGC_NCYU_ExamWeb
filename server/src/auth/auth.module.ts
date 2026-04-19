import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const rawSecret = config.get<string>('JWT_SECRET');
        const secret =
          typeof rawSecret === 'string' && rawSecret.trim().length > 0
            ? rawSecret.trim()
            : 'fallback-secret';
        const rawExp = config.get<string>('JWT_EXPIRES_IN');
        const expiresIn =
          typeof rawExp === 'string' && rawExp.trim().length > 0
            ? rawExp.trim()
            : '24h';
        const nodeEnv = config.get<string>('NODE_ENV')?.trim() || '';
        if (nodeEnv === 'production' && secret === 'fallback-secret') {
          throw new Error(
            'JWT_SECRET 未設定或為空白；正式環境無法簽發登入憑證，請設定 server/.env',
          );
        }
        return {
          secret,
          signOptions: { expiresIn },
        } as any;
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
