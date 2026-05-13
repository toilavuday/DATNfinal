import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}


  @Post('add-multiple')
  async addMultipleStock(
    @Body()
    data: {
      userId?: string;
      entries: {
        category: string;
        productDetail: string;
        quantity: number;
        unit: string;
        supplierName: string;
        expiryDate?: string;
      }[];
    },
  ) {
    return this.stockService.addMultipleStock(data.userId, data.entries);
  }

  @Post('export')
  async exportStock(
    @Body()
    data: {
      userId?: string;
      entries: {
        category: string;
        productDetail: string;
        quantity: number;
        unit: string;
      }[];
    },
  ) {
    return this.stockService.exportStock(data.userId, data.entries);
  }

  @Get('inventory')
  async getInventorySummary() {
    return this.stockService.getInventorySummary();
  }

  @Get('ai-suggestions')
  async getAiRestockSuggestions(
    @Query('reserveDays') reserveDays?: string,
    @Query('minStock') minStock?: string,
  ) {
    return this.stockService.getAiRestockSuggestions({
      reserveDays,
      minStock,
    });
  }

  @Get('batches')
  async getStockBatches() {
    return this.stockService.getStockBatches();
  }

  @Get('batches/:batchId')
  async getStockEntries(@Param('batchId') batchId: string) {
    return this.stockService.getStockEntries(batchId);
  }

  @Patch('entries/:id')
  async updateStockEntry(
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ) {
    return this.stockService.updateStockEntry(id, body);
  }

  @Delete('entries/:id')
  async deleteStockEntry(@Param('id') id: string) {
    return this.stockService.deleteStockEntry(id);
  }

  @Delete('batches/:batchId')
  async deleteStockBatch(@Param('batchId') batchId: string) {
    return this.stockService.deleteStockBatch(batchId);
  }
}
