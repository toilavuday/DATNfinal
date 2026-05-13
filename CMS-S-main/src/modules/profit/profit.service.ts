import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateProfitDto } from './profit.dto';

@Injectable()
export class ProfitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  async createProfit(data: CreateProfitDto) {
    return this.prisma.profit.create({
      data,
    });
  }

  async getAllProfits(year?: number, month?: string) {
    const where: any = {};

    if (year) {
      where.year = year;
    }

    if (month) {
      where.month = month;
    }

    return this.prisma.profit.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async calculateProfitForMonth(year: number, month: string, employeeId?: string) {
    const startOfMonth = new Date(`${year}-${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(startOfMonth.getMonth() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
        ...(employeeId && employeeId !== 'all' ? { userId: employeeId } : {}),
      },
      select: {
        amount: true,
      },
    });

    const revenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
        ...(employeeId && employeeId !== 'all' ? { userId: employeeId } : {}),
      },
      include: {
        user: {
          select: {
            hourlyRate: true,
          },
        },
      },
    });

    const totalSalary = schedules.reduce((sum, schedule) => {
      let rate = schedule.user?.hourlyRate || 0;
      if (schedule.shifts && schedule.shifts.includes("Ca 3")) {
        rate += 5000;
      }
      return sum + schedule.hoursWorked * rate;
    }, 0);

    const batches = await this.prisma.stockEntryBatch.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
        ...(employeeId && employeeId !== 'all' ? { userId: employeeId } : {}),
      },
      include: {
        entries: true,
      },
    });

    let totalImportCost = 0;
    let totalExportCost = 0;

    for (const batch of batches) {
      for (const entry of batch.entries) {
        if (entry.type === 'IMPORT') {
          totalImportCost += Number(entry.price || 0) * Number(entry.quantity || 0);
        }

        if (entry.type === 'EXPORT') {
          const avgPrice = await this.stockService.getEffectiveAveragePrice(entry.category, entry.productDetail, entry.unit);
          const entryPrice = Number(entry.price || avgPrice);
          totalExportCost += entryPrice * Number(entry.quantity || 0);
        }
      }
    }

    const stockCost = totalImportCost - totalExportCost;
    const profit = revenue - stockCost - totalSalary;

    const existing = await this.prisma.profit.findFirst({
      where: {
        year,
        month,
      },
    });

    if (existing) {
      return this.prisma.profit.update({
        where: { id: existing.id },
        data: {
          revenue,
          stockVariation: stockCost,
          totalSalary,
          profit,
        },
      });
    }

    return this.prisma.profit.create({
      data: {
        year,
        month,
        revenue,
        stockVariation: stockCost,
        totalSalary,
        profit,
      },
    });
  }
}
