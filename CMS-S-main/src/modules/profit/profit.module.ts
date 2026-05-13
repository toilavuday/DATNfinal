import { Module } from '@nestjs/common';
import { ProfitService } from './profit.service';
import { ProfitController } from './profit.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [ProfitService, PrismaService],
  controllers: [ProfitController],
  exports: [ProfitService],
})
export class ProfitModule {}
