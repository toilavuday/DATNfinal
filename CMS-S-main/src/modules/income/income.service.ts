import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateSalariesForUsers(userIds: string[], month: string) {
    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(startOfMonth.getMonth() + 1);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, hourlyRate: true },
    });

    if (users.length === 0) {
      throw new Error('Không tìm thấy nhân viên nào');
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        userId: { in: userIds },
        date: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      orderBy: { userId: 'asc' },
    });

    const salaryData = users.map((user) => {
      const userSchedules = schedules.filter(
        (schedule) => schedule.userId === user.id,
      );
      const totalHoursWorked = userSchedules.reduce(
        (total, schedule) => total + schedule.hoursWorked,
        0,
      );
      const salary = userSchedules.reduce((sum, schedule) => {
        let rate = user.hourlyRate || 0;
        if (schedule.shifts && schedule.shifts.includes("Ca 3")) {
          rate += 5000;
        }
        return sum + schedule.hoursWorked * rate;
      }, 0);

      return {
        userId: user.id,
        totalHoursWorked,
        salary,
      };
    });

    return salaryData;
  }
}
