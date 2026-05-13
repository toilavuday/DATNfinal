import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  providers: [OrderService,PrismaService],
  controllers: [OrderController]
})
export class OrderModule {}
