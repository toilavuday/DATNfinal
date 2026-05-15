import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính toán lương cho một nhân viên cụ thể trong tháng/năm
   */
  async calculateSalaryForUser(userId: string, month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        user: {
          select: {
            hourlyRate: true,
          },
        },
      },
    });

    const totalHours = schedules.reduce((sum, s) => sum + (s.hoursWorked || 0), 0);
    const hourlyRate = schedules[0]?.user?.hourlyRate || 50000;

    const totalSalary = schedules.reduce((sum, schedule) => {
      let rate = schedule.user?.hourlyRate || 50000;
      // Thêm phụ cấp ca đêm nếu làm Ca 3
      if (schedule.shifts && schedule.shifts.includes("Ca 3")) {
        rate += 5000;
      }
      return sum + (schedule.hoursWorked || 0) * rate;
    }, 0);

    return {
      totalHours,
      hourlyRate,
      totalSalary,
    };
  }

  /**
   * Đồng bộ dữ liệu vào bảng Salary (Upsert)
   */
  async syncSalaryRecord(userId: string, month: number, year: number) {
    const { totalHours, hourlyRate, totalSalary } = await this.calculateSalaryForUser(userId, month, year);

    return this.prisma.salary.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      update: {
        totalHours,
        hourlyRate,
        totalSalary,
      },
      create: {
        userId,
        month,
        year,
        totalHours,
        hourlyRate,
        totalSalary,
        status: 'PENDING',
      },
    });
  }

  /**
   * Lấy danh sách lương
   */
  async getSalaries(year?: number, month?: number, userId?: string) {
    return this.prisma.salary.findMany({
      where: {
        ...(year ? { year } : {}),
        ...(month ? { month } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /**
   * Cập nhật trạng thái thanh toán
   */
  async updateSalaryStatus(id: string, status: string) {
    return this.prisma.salary.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Tính tổng lương toàn bộ nhân viên trong kỳ (Dùng cho báo cáo Profit)
   */
  async getTotalSalaryForPeriod(month: number, year: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        user: {
          select: {
            hourlyRate: true,
          },
        },
      },
    });

    return schedules.reduce((sum, schedule) => {
      let rate = schedule.user?.hourlyRate || 50000;
      if (schedule.shifts && schedule.shifts.includes("Ca 3")) {
        rate += 5000;
      }
      return sum + (schedule.hoursWorked || 0) * rate;
    }, 0);
  }
}
