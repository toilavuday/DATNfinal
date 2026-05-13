import { Controller, Get, Post, Body, UseGuards, Put } from '@nestjs/common';
import { SystemSettingService } from './system-setting.service';

@Controller('system-settings')
export class SystemSettingController {
  constructor(private readonly systemSettingService: SystemSettingService) {}

  @Get('edit-schedule')
  async getEditScheduleStatus() {
    const status = await this.systemSettingService.getEditScheduleStatus();
    return { isEnabled: status };
  }

  @Put('edit-schedule/toggle')
  async toggleEditSchedule(@Body('isEnabled') isEnabled: boolean) {
    const status =
      await this.systemSettingService.toggleEditScheduleStatus(isEnabled);
    return {
      success: true,
      message: ` ${status ? 'Đã bật' : 'Đã tắt'} chỉnh sửa lịch  `,
    };
  }
}
