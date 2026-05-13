import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { Product } from '@prisma/client';
import { CreateProduct, UpdateProductDto } from '../../shared/dto/product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(public productService: ProductService) {}

  @Get('')
  @ApiOperation({ summary: 'Retrieve all products' })
  @ApiResponse({
    status: 200,
    description: 'List of all products retrieved successfully.',
  })
  async getAllProduct(): Promise<Product[]> {
    return this.productService.getAllProducts();
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create a new product' })
  @ApiConsumes('multipart/form-data')
  async createProduct(
    @UploadedFile() file: Express.Multer.File,
    @Body() createProductDto: any,
  ) {
    console.log('Received Data:', createProductDto);

    return this.productService.createProduct({
      ...createProductDto,
      price: Number(createProductDto.price),
      image: file,
    });
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiConsumes('multipart/form-data')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateDataProduct: UpdateProductDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Product> {
    return this.productService.updateProduct(id, {
      ...updateDataProduct,
      image: file ?? undefined, // Không đính kèm file nếu không có
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  async deleteProduct(@Param('id') id: string): Promise<Product> {
    return this.productService.deleteProduct(id);
  }
}
