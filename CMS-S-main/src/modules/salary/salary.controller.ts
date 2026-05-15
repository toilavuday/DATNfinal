import { Controller, Get, Post, Body, Query, Param, Patch } from '@nestjs/common';
import { SalaryService } from './salary.service';

@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Get()
  async getSalaries(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('userId') userId?: string,
  ) {
    return this.salaryService.getSalaries(
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
      userId,
    );
  }

  @Post('sync')
  async syncSalary(
    @Body('userId') userId: string,
    @Body('month') month: number,
    @Body('year') year: number,
  ) {
    return this.salaryService.syncSalaryRecord(userId, month, year);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.salaryService.updateSalaryStatus(id, status);
  }

  @Get('calculate/:userId')
  async calculate(
    @Param('userId') userId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.salaryService.calculateSalaryForUser(
      userId,
      parseInt(month),
      parseInt(year),
    );
  }
}
