import { Module } from '@nestjs/common';
import { SystemSettingController } from './system-setting.controller';
import { SystemSettingService } from './system-setting.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [SystemSettingController],
  providers: [SystemSettingService, PrismaService],
})
export class SystemSettingModule {}
