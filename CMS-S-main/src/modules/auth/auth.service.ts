import { FileUploadService } from './../../shared/utils/file-upload.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ForgotPasswordDto, ResetPasswordDto } from '../../shared/dto/User.dto';
import { MailService } from '../../modules/email/email.service';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private fileUploadService: FileUploadService,
    private mailService: MailService,
  ) {}

  async register(userData: {
    email: string;
    password: string;
    name: string;
    image: Express.Multer.File;
    role?: string;
    hourlyRate?: number | string;
  }): Promise<any> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictException(
        'Email đã tồn tại. Vui lòng sử dụng email khác.',
      );
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const imageUrl = await this.fileUploadService.uploadImage(userData.image);
    const normalizedRole = userData.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const parsedHourlyRate = Number(userData.hourlyRate);
    const normalizedHourlyRate =
      Number.isFinite(parsedHourlyRate) && parsedHourlyRate > 0
        ? parsedHourlyRate
        : 50000;

    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        image: imageUrl,
        role: normalizedRole,
        hourlyRate: normalizedHourlyRate,
      },
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu không chính xác');
    }

    if (user.isLocked) {
      throw new BadRequestException(
        'Tài khoản đã bị khóa. Vui lòng liên hệ với bộ phận hỗ trợ.',
      );
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }

  decodeToken(token: string) {
    try {
      const decoded = this.jwtService.decode(token);
      if (!decoded) {
        throw new UnauthorizedException('Token không hợp lệ');
      }
      return decoded;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }

  async validateUser(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'Không tìm thấy người dùng',
        status: 'faild',
      };
    }

    const resetToken = crypto.randomBytes(6).toString('hex');

    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 900000),
      },
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <style>
        .container {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f9f9f9;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          margin-top: 20px;
          color: white;
          background-color: #007bff;
          text-decoration: none;
          border-radius: 5px;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888;
          text-align: center;
        }

        .token {
          padding: 20px;
          font-weight: bold;
          width: fit-content;
          text-align: center;
          border-radius: 5px;
          border: 2px solid #007bff;
          background-color: #e3f2fd;
          color: #0056b3;
          font-size: 1.2em;
          margin: auto;
        }
          .name{
          font-weight: bold;
          color: #0056b3;
                    }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Yêu cầu đặt lại mật khẩu</h1>
        <p>Xin chào,<span class="name"> ${user.name}</span> </p>
        <p>Chúng tôi gửi cho bạn mật khẩu sử dụng 1 lần:</p>
        <p class="token">${resetToken}</p>
        <p>Vui lòng đăng nhập vào website để đổi mật khẩu</p>
        <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
        <p>Thanks,<br> Lâm Xuân Vũ</p>
        <div class="footer">
          <p>© 2026 Lâm Xuân Vũ</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await this.mailService.sendMail(
      email,
      'Reset Password',
      resetToken,
      htmlContent,
    );

    return {
      message: 'Mật khẩu đã được gửi tới email của bạn',
      status: 'success',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword, email } = resetPasswordDto;

    // Tìm người dùng theo token và email
    const user = await this.prisma.user.findFirst({
      where: { email: email, resetToken: token },
    });

    // Kiểm tra nếu không tìm thấy người dùng với token và email
    if (!user) {
      return {
        message: 'Token không chính xác',
        status: 'failed',
        code: 400, // Mã lỗi 400 (Bad Request)
      };
    }

    // Kiểm tra xem token đã hết hạn chưa
    if (new Date(user.resetTokenExpiry) < new Date()) {
      await this.prisma.user.update({
        where: { email: user.email },
        data: {
          resetToken: null, // Xoá token khi hết hạn
          resetTokenExpiry: null, // Xoá thời gian hết hạn token
        },
      });
      return {
        message: 'Token đã hết hạn',
        status: 'failed',
        code: 400, // Mã lỗi 400 (Bad Request)
      };
    }

    // Kiểm tra nếu token đã được sử dụng
    if (user.resetToken === null) {
      return {
        message: 'Token đã được sử dụng.',
        status: 'failed',
        code: 400, // Mã lỗi 400 (Bad Request)
      };
    }

    // Băm mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu mới cho người dùng và xoá token
    await this.prisma.user.update({
      where: { email: user.email },
      data: {
        password: hashedPassword,
        resetToken: null, // Xoá token
        resetTokenExpiry: null, // Xoá thời gian hết hạn token
      },
    });

    return {
      message: 'Mật khẩu được khôi phục thành công',
      status: 'success',
      code: 200, // Mã trạng thái 200 (OK)
    };
  }
}
