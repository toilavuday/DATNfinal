import { Express } from 'express';
import {
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProduct {
  @ApiProperty({ description: 'Tên sản phẩm', example: 'Coffee Mug' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Mô tả sản phẩm',
    example: 'A durable coffee mug.',
  })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Giá của sản phẩm', example: 199.99 })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Thương hiệu sản phẩm', example: 'NestBrand' })
  @IsString()
  brand: string;

  @ApiProperty({
    description: 'Hình ảnh sản phẩm',
    type: 'string',
    format: 'binary',
  })
  image: Express.Multer.File;

  @ApiPropertyOptional({ description: 'Số lượng sản phẩm trong kho', example: 100 })
  @IsOptional()
  @IsNumberString()
  stock?: number;

  @ApiPropertyOptional({ description: 'Danh mục', example: 'Cà phê' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Công thức JSON string', example: '[]' })
  @IsOptional()
  @IsString()
  recipe?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Tên sản phẩm mới',
    example: 'Updated Coffee Mug',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Mô tả sản phẩm mới',
    example: 'An updated durable coffee mug.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Giá của sản phẩm mới', example: 149.99 })
  @IsOptional()
  @IsNumberString()
  price?: number;

  @ApiPropertyOptional({
    description: 'Thương hiệu sản phẩm mới',
    example: 'UpdatedBrand',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Hình ảnh sản phẩm mới',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  image?: Express.Multer.File;

  @ApiPropertyOptional({ description: 'Số lượng sản phẩm trong kho', example: 150 })
  @IsOptional()
  @IsNumberString()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Danh mục', example: 'Cà phê' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Công thức JSON string', example: '[]' })
  @IsOptional()
  @IsString()
  recipe?: string;
}
