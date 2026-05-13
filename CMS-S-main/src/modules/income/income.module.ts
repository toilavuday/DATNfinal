import { Module } from '@nestjs/common';
import { IncomeService } from './income.service';
import { IncomeController } from './income.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [IncomeService, PrismaService],
  controllers: [IncomeController],
})
export class IncomeModule {}
