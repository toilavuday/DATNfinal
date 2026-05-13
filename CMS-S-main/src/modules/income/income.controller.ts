import { Controller, Get, Query, Body } from '@nestjs/common';
import { IncomeService } from './income.service';

@Controller('income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get('calculate-salaries')
  async calculateSalaries(
    @Query('month') month: string,
    @Query('userIds') userIds: string,
  ) {
    if (!month || !userIds) {
      return {
        message:
          'Thiếu thông tin bắt buộc: tháng (month) hoặc danh sách nhân viên (userIds)',
      };
    }

    try {
      const parsedUserIds = JSON.parse(userIds);
      const salaries = await this.incomeService.calculateSalariesForUsers(
        parsedUserIds,
        month,
      );
      return {
        message: 'Tính lương thành công',
        data: salaries,
      };
    } catch (error) {
      return {
        message: 'Đã xảy ra lỗi khi tính lương',
        error: error.message,
      };
    }
  }
}
