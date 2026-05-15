import { Module } from '@nestjs/common';
import { ProfitService } from './profit.service';
import { ProfitController } from './profit.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { StockModule } from '../stock/stock.module';
import { SalaryModule } from '../salary/salary.module';

@Module({
  imports: [StockModule, SalaryModule],
  providers: [ProfitService, PrismaService],
  controllers: [ProfitController],
  exports: [ProfitService],
})
export class ProfitModule {}
