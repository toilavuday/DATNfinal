import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './Jwt/jwt.strategy';
import { FileUploadService } from '../../shared/utils/file-upload.service';
import { MailService } from '../../modules/email/email.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'your_jwt_secret',
      signOptions: { expiresIn: '10d' },
    }),
  ],
  providers: [
    AuthService,
    PrismaService,
    JwtStrategy,
    FileUploadService,
    MailService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
