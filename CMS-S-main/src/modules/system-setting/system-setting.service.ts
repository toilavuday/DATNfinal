import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemSettingService {
  constructor(private prisma: PrismaService) {}

  async getEditScheduleStatus(): Promise<boolean> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'edit_schedule_enabled' },
    });
    return setting ? setting.value : false;
  }

  async toggleEditScheduleStatus(isEnabled: boolean): Promise<boolean> {
    await this.prisma.systemSetting.upsert({
      where: { key: 'edit_schedule_enabled' },
      update: { value: isEnabled },
      create: { key: 'edit_schedule_enabled', value: isEnabled },
    });

    return isEnabled;
  }
}
