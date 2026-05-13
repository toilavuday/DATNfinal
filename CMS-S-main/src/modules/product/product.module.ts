import { Module } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { ProductController } from './product.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { FileUploadService } from '../../shared/utils/file-upload.service';
@Module({
  providers: [ProductService, PrismaService, FileUploadService],
  controllers: [ProductController],
})
export class ProductModule {}
