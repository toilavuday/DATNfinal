import { FileUploadService } from './../../shared/utils/file-upload.service';
import { Product } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProductDto } from 'shared/dto/product.dto';
@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private fileUploadService: FileUploadService,
  ) { }
  async getAllProducts(): Promise<Product[]> {
    return await this.prisma.product.findMany();
  }
  async createProduct(proData: {
    name: string;
    description: string;
    price: any;
    brand: string;
    category?: string;
    recipe?: string;
    image: Express.Multer.File;
  }): Promise<any> {
    const imageUrl = await this.fileUploadService.uploadImage(proData.image);

    let parsedRecipe = null;
    if (proData.recipe) {
      try {
        parsedRecipe = JSON.parse(proData.recipe);
      } catch (e) {
        console.warn('Lỗi parse recipe JSON', e);
      }
    }

    const priceValue = parseFloat(proData.price as unknown as string);
    if (isNaN(priceValue) || priceValue <= 0) {
      throw new BadRequestException(
        'Price and quantity must be valid numbers greater than 0.',
      );
    }

    // Lưu vào database
    const product = await this.prisma.product.create({
      data: {
        name: proData.name,
        description: proData.description,
        price: priceValue,
        brand: proData.brand,
        category: proData.category || "Cà phê",
        recipe: parsedRecipe || undefined,
        image: imageUrl,
      },
    });

    return product;
  }

  async updateProduct(
    id: string,
    updateDataProduct: UpdateProductDto & { image?: Express.Multer.File, category?: string, recipe?: string },
  ): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error(`Product with id ${id} not found`);
    }

    let imageUrl = product.image;

    if (updateDataProduct.image) {
      await this.fileUploadService.deleteImage(product.image);

      imageUrl = await this.fileUploadService.uploadImage(
        updateDataProduct.image,
      );
    }

    const updateFields: any = {
      ...updateDataProduct,
      image: imageUrl,
    };

    if (updateDataProduct.recipe) {
      try {
        updateFields.recipe = JSON.parse(updateDataProduct.recipe as string);
      } catch (e) {
        // ignore
      }
    }

    if (updateDataProduct.price !== undefined) {
      updateFields.price = parseFloat(updateDataProduct.price as unknown as string);
    }

    return this.prisma.product.update({
      where: { id },
      data: updateFields,
    });
  }

  async deleteProduct(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error(`Product with id ${id} not found`);
    }

    const deletedProduct = await this.prisma.product.delete({ where: { id } });

    try {
      await this.fileUploadService.deleteImage(product.image);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }

    return deletedProduct;
  }
}
