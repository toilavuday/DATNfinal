import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { ProfitService } from './profit.service';

@Controller('profit')
export class ProfitController {
  constructor(private readonly profitService: ProfitService) {}

  @Get()
  async getProfitRecords(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.profitService.getAllProfits(
      year ? Number(year) : undefined,
      month,
    );
  }

  @Post('calculate')
  async calculateProfit(@Body() body: { year?: number; month?: string; employeeId?: string }) {
    const { year, month, employeeId } = body;
    if (!year || !month) {
      throw new BadRequestException('year và month là bắt buộc');
    }

    return this.profitService.calculateProfitForMonth(year, month, employeeId);
  }
}
