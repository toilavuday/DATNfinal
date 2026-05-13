import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  ForgotPasswordDto,
  LoginUserDto,
  ResetPasswordDto,
} from '../../shared/dto/User.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async register(
    @UploadedFile() file: Express.Multer.File,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.authService.register({ ...createUserDto, image: file });
  }

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập tài khoản' })
  async login(@Body() loginUserDto: LoginUserDto) {
    const result = await this.authService.login(
      loginUserDto.email,
      loginUserDto.password,
    );
    if (!result) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return result;
  }

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin người dùng' })
  @ApiBearerAuth()
  async getUserData(@Headers('Authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Không có token');
    }

    const token = authHeader.replace('Bearer ', '');
    return this.authService.decodeToken(token);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }
}
