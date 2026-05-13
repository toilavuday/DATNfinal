import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../../shared/utils/file-upload.service';

@Module({
  providers: [UserService, PrismaService, FileUploadService],
  controllers: [UserController],
})
export class UserModule {}
