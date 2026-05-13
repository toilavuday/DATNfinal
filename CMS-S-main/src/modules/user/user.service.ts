import { FileUploadService } from './../../shared/utils/file-upload.service';
import { UpdateUserDto } from '../../shared/dto/User.dto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
  ) {}
  async getAllUser(): Promise<User[]> {
    return await this.prisma.user.findMany();
  }

  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
  async updateUser(
    id: string,
    updateUserData: UpdateUserDto & { image?: Express.Multer.File },
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }

    if (updateUserData.email && updateUserData.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserData.email },
      });

      if (existingUser) {
        throw new ConflictException(
          'Email đã tồn tại. Vui lòng sử dụng email khác.',
        );
      }
    }

    let imageUrl = user.image;
    if (updateUserData.image) {
      await this.fileUploadService.deleteImage(user.image);
      imageUrl = await this.fileUploadService.uploadImage(updateUserData.image);
    }

    const bankCode =
      updateUserData.bankCode !== undefined
        ? Number(updateUserData.bankCode)
        : user.bankCode;
    const hourlyRate =
      updateUserData.hourlyRate !== undefined
        ? Number(updateUserData.hourlyRate)
        : user.hourlyRate;
    const role: UserRole =
      updateUserData.role === 'ADMIN' || updateUserData.role === 'STAFF'
        ? (updateUserData.role as UserRole)
        : user.role;

    if (user.role === 'ADMIN' && role === 'STAFF') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ConflictException(
          'Không thể thay đổi quyền của quản lý cuối cùng trong hệ thống.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: updateUserData.name ?? user.name,
        image: imageUrl,
        email: updateUserData.email ?? user.email,
        bank: updateUserData.bank ?? user.bank,
        isLocked: updateUserData.isLocked ?? user.isLocked,
        bankCode,
        hourlyRate,
        role,
      },
    });
  }
  async deleteUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.role === 'ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: { role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        throw new ConflictException(
          'Khong the xoa quan ly cuoi cung trong he thong.',
        );
      }
    }

    await Promise.all([
      this.prisma.order.deleteMany({ where: { userId: id } }),
      this.prisma.incomeRecord.deleteMany({ where: { userId: id } }),
      this.prisma.schedule.deleteMany({ where: { userId: id } }),
      this.prisma.activity.deleteMany({ where: { userId: id } }),
    ]);

    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });

    try {
      await this.fileUploadService.deleteImage(user.image);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }

    return deletedUser;
  }

  async lockUser(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isLocked: !user.isLocked },
    });
  }
}
