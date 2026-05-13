import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email cua nguoi dung',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Ten cua nguoi dung', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @Matches(
    /^[A-Z](?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{7,}$/,
    {
      message:
        'Password must be at least 8 characters long, start with an uppercase letter, and contain at least one special character',
    },
  )
  @ApiProperty({
    description:
      'The password for the user account. It must be at least 8 characters long, start with an uppercase letter, and contain at least one special character.',
    example: 'Secure@123',
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: 'Anh dai dien cua nguoi dung',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  image: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Vai tro cua nguoi dung',
    example: 'STAFF',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'STAFF'])
  role?: string;

  @ApiPropertyOptional({
    description: 'Luong theo gio cua nhan vien',
    example: 50000,
  })
  @IsOptional()
  @IsNotEmpty()
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Trang thai khoa tai khoan',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

export class LoginUserDto {
  @ApiProperty({
    description: 'Email cua nguoi dung',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @Matches(
    /^[A-Z](?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{7,}$/,
    {
      message:
        'Password must be at least 8 characters long, start with an uppercase letter, and contain at least one special character',
    },
  )
  @ApiProperty({
    description:
      'The password for the user account. It must be at least 8 characters long, start with an uppercase letter, and contain at least one special character.',
    example: 'Secure@123',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Email moi cua nguoi dung',
    example: 'newemail@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Ten moi cua nguoi dung',
    example: 'John Smith',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Anh dai dien moi',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  image?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Trang thai khoa tai khoan moi',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({
    description: 'Ma ngan hang moi cua nguoi dung',
    example: 123,
  })
  @IsOptional()
  @IsNotEmpty()
  bankCode?: number;

  @ApiPropertyOptional({
    description: 'Ten ngan hang moi cua nguoi dung',
    example: 'ACB',
  })
  @IsOptional()
  @IsString()
  bank?: string;

  @ApiPropertyOptional({
    description: 'Vai tro moi cua nguoi dung',
    example: 'STAFF',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'STAFF'])
  role?: string;

  @ApiPropertyOptional({
    description: 'Luong theo gio cua nhan vien',
    example: 50000,
  })
  @IsOptional()
  @IsNotEmpty()
  hourlyRate?: number;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The email address of the user requesting password reset',
    example: 'user@example.com',
  })
  email: string;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({
    description: 'Email moi cua nguoi dung',
    example: 'newemail@example.com',
  })
  @IsOptional()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The token sent to the user via email includes 6 characters',
    example: 'abc123resetToken',
  })
  token: string;

  @IsString()
  @IsNotEmpty()
  @Matches(
    /^[A-Z](?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{7,}$/,
    {
      message:
        'Password must be at least 8 characters long, start with an uppercase letter, and contain at least one special character',
    },
  )
  @ApiProperty({
    description:
      'The password for the user account. It must be at least 8 characters long, start with an uppercase letter, and contain at least one special character.',
    example: 'Secure@123',
  })
  newPassword: string;
}
