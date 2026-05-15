const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('--- Đang bắt đầu đồng bộ dữ liệu lương từ lịch làm việc ---');

  try {
    // 1. Lấy tất cả các ca làm việc
    const schedules = await prisma.schedule.findMany({
      include: {
        user: {
          select: {
            id: true,
            hourlyRate: true,
            name: true
          }
        }
      }
    });

    if (schedules.length === 0) {
      console.log('Không tìm thấy dữ liệu lịch làm việc để tính lương.');
      return;
    }

    // 2. Gôm nhóm theo userId, tháng, năm
    const salaryGroups = {};

    for (const s of schedules) {
      if (!s.user) continue;

      const date = new Date(s.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const userId = s.userId;

      const groupKey = `${userId}-${month}-${year}`;

      if (!salaryGroups[groupKey]) {
        salaryGroups[groupKey] = {
          userId,
          month,
          year,
          totalHours: 0,
          totalSalary: 0,
          hourlyRate: s.user.hourlyRate || 50000,
          userName: s.user.name
        };
      }

      let rate = s.user.hourlyRate || 50000;
      // Phụ cấp ca đêm (Ca 3)
      if (s.shifts && s.shifts.includes("Ca 3")) {
        rate += 5000;
      }

      salaryGroups[groupKey].totalHours += (s.hoursWorked || 0);
      salaryGroups[groupKey].totalSalary += (s.hoursWorked || 0) * rate;
    }

    // 3. Đưa dữ liệu vào bảng Salary
    console.log(`Đang xử lý ${Object.keys(salaryGroups).length} bản ghi lương...`);

    for (const key in salaryGroups) {
      const g = salaryGroups[key];
      
      await prisma.salary.upsert({
        where: {
          userId_month_year: {
            userId: g.userId,
            month: g.month,
            year: g.year
          }
        },
        update: {
          totalHours: g.totalHours,
          hourlyRate: g.hourlyRate,
          totalSalary: g.totalSalary
        },
        create: {
          userId: g.userId,
          month: g.month,
          year: g.year,
          totalHours: g.totalHours,
          hourlyRate: g.hourlyRate,
          totalSalary: g.totalSalary,
          status: 'PENDING'
        }
      });
      console.log(`✓ Đã cập nhật lương cho ${g.userName} (Tháng ${g.month}/${g.year})`);
    }

    console.log('--- Hoàn tất đồng bộ dữ liệu lương! ---');
  } catch (error) {
    console.error('Lỗi khi đồng bộ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
