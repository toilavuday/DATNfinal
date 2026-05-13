import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
} from '../../shared/dto/schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string, month?: string) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (month) {
      const startOfMonth = new Date(`${month}-01`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(startOfMonth.getMonth() + 1);

      where.date = {
        gte: startOfMonth,
        lt: endOfMonth,
      };
    }

    return this.prisma.schedule.findMany({ where });
  }

  async findOne(id: string) {
    return this.prisma.schedule.findUnique({
      where: { id },
    });
  }

  async create(createScheduleDto: CreateScheduleDto) {
    const { userId, date } = createScheduleDto;

    // Tìm và xóa tất cả lịch cũ của người dùng này trong cùng một ngày
    // Sử dụng dải 48 giờ để đảm bảo quét sạch mọi khả năng lệch múi giờ, 
    // sau đó lọc chính xác bằng chuỗi ngày (YYYY-MM-DD)
    const targetDate = new Date(date);
    const windowStart = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const existing = await this.prisma.schedule.findMany({
      where: {
        userId,
        date: { gte: windowStart, lt: windowEnd },
      },
    });

    const targetDayStr = targetDate.toISOString().split('T')[0];
    const idsToDelete = existing
      .filter((s) => s.date.toISOString().split('T')[0] === targetDayStr)
      .map((s) => s.id);

    if (idsToDelete.length > 0) {
      await this.prisma.schedule.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    // Tạo lịch mới
    return this.prisma.schedule.create({
      data: createScheduleDto,
    });
  }

  async update(id: string, updateScheduleDto: UpdateScheduleDto) {
    const existingSchedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      throw new Error('Lịch làm việc không tồn tại');
    }

    return this.prisma.schedule.update({
      where: { id },
      data: updateScheduleDto,
    });
  }

  async remove(id: string) {
    return this.prisma.schedule.delete({
      where: { id },
    });
  }
}
