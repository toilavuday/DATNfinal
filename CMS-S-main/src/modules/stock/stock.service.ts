import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeStockKey(category?: string, productDetail?: string, unit?: string) {
    return [category, productDetail, unit]
      .map((value) => value?.trim().toLowerCase() || '')
      .join('::');
  }

  private getStockRiskStatus(daysRemaining: number | null) {
    if (daysRemaining === null) return 'unknown';
    if (daysRemaining < 5) return 'critical';
    if (daysRemaining <= 10) return 'low';
    return 'normal';
  }

  private parseExpiryDate(value?: string | Date | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getDateKey(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private getExpiryKey(value?: Date | null) {
    return value ? this.getDateKey(value) : 'NO_EXPIRY';
  }

  private isExpiredDate(value?: Date | null) {
    if (!value) return false;
    return this.getDateKey(value) < this.getDateKey(new Date());
  }

  private sortLotsForExport<T extends { expiryDate: Date | null; quantity: number }>(lots: T[]): T[] {
    return [...lots].sort((a, b) => {
      const aExpired = this.isExpiredDate(a.expiryDate);
      const bExpired = this.isExpiredDate(b.expiryDate);
      if (aExpired !== bExpired) return aExpired ? 1 : -1;

      const aKey = a.expiryDate ? this.getDateKey(a.expiryDate) : '9999-12-31';
      const bKey = b.expiryDate ? this.getDateKey(b.expiryDate) : '9999-12-31';
      return aKey.localeCompare(bKey);
    });
  }

  private deductFromLots(
    lots: Map<string, { expiryDate: Date | null; quantity: number; totalValue: number }>,
    quantity: number,
    preferredExpiryDate?: Date | null,
  ) {
    let remaining = quantity;
    const sortedLots = this.sortLotsForExport(Array.from(lots.values()).filter((lot) => lot.quantity > 0));

    const orderedLots = preferredExpiryDate
      ? [
          ...sortedLots.filter(
            (lot) => this.getExpiryKey(lot.expiryDate) === this.getExpiryKey(preferredExpiryDate),
          ),
          ...sortedLots.filter(
            (lot) => this.getExpiryKey(lot.expiryDate) !== this.getExpiryKey(preferredExpiryDate),
          ),
        ]
      : sortedLots;

    for (const lot of orderedLots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.quantity, remaining);
      const unitValue = lot.quantity > 0 ? lot.totalValue / lot.quantity : 0;
      lot.quantity -= take;
      lot.totalValue = Math.max(0, lot.totalValue - unitValue * take);
      remaining -= take;
    }
  }

  private getExpiryDateForCreate(value?: string | Date | null) {
    const parsed = this.parseExpiryDate(value);
    return parsed || undefined;
  }

  private validateImportExpiryDate(value?: string | Date | null, productDetail?: string) {
    const label = productDetail?.trim() || 'nguyên liệu';
    const hasExpiryInput =
      value instanceof Date ||
      (value !== undefined && value !== null && String(value).trim() !== '');

    if (!hasExpiryInput) {
      throw new Error(`Vui lòng nhập ngày hết hạn cho ${label}.`);
    }

    const parsed = this.parseExpiryDate(value);
    if (!parsed) {
      throw new Error(`Ngày hết hạn của ${label} không hợp lệ.`);
    }

    if (this.isExpiredDate(parsed)) {
      throw new Error(`Không thể nhập kho ${label} vì ngày hết hạn đã qua.`);
    }

    return parsed;
  }

  private findInventoryMatch(
    inventory: Array<{ category: string; productDetail: string; unit: string; quantity: number; expiryDetails?: Array<{ expiryDate: string | null; quantity: number }> }>,
    entry: { category: string; productDetail: string; unit: string },
  ) {
    return inventory.find((i) =>
      i.category?.trim().toLowerCase() === entry.category?.trim().toLowerCase() &&
      i.productDetail?.trim().toLowerCase() === entry.productDetail?.trim().toLowerCase() &&
      i.unit?.trim().toLowerCase() === entry.unit?.trim().toLowerCase()
    );
  }

  private splitByExpiryLots(
    inventoryItem: { quantity: number; expiryDetails?: Array<{ expiryDate: string | null; quantity: number }> },
    quantity: number,
  ) {
    let remaining = quantity;
    const sourceLots = inventoryItem.expiryDetails?.length
      ? inventoryItem.expiryDetails
      : [{ expiryDate: null, quantity: inventoryItem.quantity }];

    const result: Array<{ quantity: number; expiryDate?: Date }> = [];
    for (const lot of sourceLots) {
      if (remaining <= 0) break;
      const lotQuantity = Number(lot.quantity || 0);
      if (lotQuantity <= 0) continue;

      const take = Math.min(lotQuantity, remaining);
      result.push({
        quantity: take,
        expiryDate: this.getExpiryDateForCreate(lot.expiryDate),
      });
      remaining -= take;
    }

    return result;
  }

  async getAiRestockSuggestions(options?: {
    reserveDays?: number | string;
    minStock?: number | string;
  }) {
    const reserveDaysNumber = Number(options?.reserveDays);
    const minStockNumber = Number(options?.minStock);
    const reserveDays =
      Number.isFinite(reserveDaysNumber) && reserveDaysNumber > 0
        ? reserveDaysNumber
        : 7;
    const minStock =
      Number.isFinite(minStockNumber) && minStockNumber > 0
        ? minStockNumber
        : 0;

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [inventory, recentConsumption] = await Promise.all([
      this.getInventorySummary(),
      this.prisma.stockEntry.findMany({
        where: {
          type: 'CONSUME',
          createdAt: {
            gte: since,
          },
        },
      }),
    ]);

    const consumedByProduct = new Map<string, number>();
    for (const entry of recentConsumption) {
      const key = this.normalizeStockKey(
        entry.category,
        entry.productDetail,
        entry.unit,
      );
      consumedByProduct.set(
        key,
        (consumedByProduct.get(key) || 0) + Number(entry.quantity || 0),
      );
    }

    const statusPriority: Record<string, number> = {
      critical: 0,
      low: 1,
      normal: 2,
      unknown: 3,
    };

    return inventory
      .map((item) => {
        const key = this.normalizeStockKey(
          item.category,
          item.productDetail,
          item.unit,
        );
        const stock = Number(item.quantity || 0);
        const totalSoldLast7Days = consumedByProduct.get(key) || 0;
        const avgSalePerDay = totalSoldLast7Days / 7;
        const forecastDemand = avgSalePerDay * reserveDays;
        const suggestedImport = Math.max(
          0,
          Math.ceil(forecastDemand + minStock - stock),
        );
        const daysRemaining =
          avgSalePerDay > 0
            ? Number((stock / avgSalePerDay).toFixed(1))
            : null;
        const status = this.getStockRiskStatus(daysRemaining);

        return {
          category: item.category,
          productDetail: item.productDetail,
          unit: item.unit,
          stock,
          totalSoldLast7Days,
          avgSalePerDay: Number(avgSalePerDay.toFixed(2)),
          reserveDays,
          minStock,
          forecastDemand: Number(forecastDemand.toFixed(2)),
          suggestedImport,
          daysRemaining,
          status,
        };
      })
      .sort((a, b) => {
        const statusDiff = statusPriority[a.status] - statusPriority[b.status];
        if (statusDiff !== 0) return statusDiff;
        return b.suggestedImport - a.suggestedImport;
      });
  }
  
  // Hàm Nhập Kho (IMPORT)
  async addMultipleStock(
    userId: string | undefined,
    entries: {
      category: string;
      productDetail: string;
      quantity: number | string;
      unit: string;
      price?: number | string;
      supplierName?: string;
      expiryDate?: string | Date;
    }[],
  ) {
    if (!entries.length) {
      throw new Error('Danh sách nguyên liệu không được để trống.');
    }

    try {
      const currentInventory = await this.getInventorySummary();
      const formattedEntries = await Promise.all(entries.map(async (entry) => {
        if (!entry.category || !entry.productDetail || !entry.unit) {
          throw new Error('Thiếu thông tin phân loại hoặc đơn vị.');
        }

        const quantityNumber = parseFloat(entry.quantity as string);
        if (isNaN(quantityNumber) || quantityNumber <= 0) {
          throw new Error(`Số lượng không hợp lệ`);
        }
        
        let priceNumber = entry.price ? parseFloat(entry.price as string) : NaN;
        if (isNaN(priceNumber) || priceNumber <= 0) {
          priceNumber = await this.getEffectiveAveragePrice(entry.category, entry.productDetail, entry.unit, currentInventory);
        }
        
        return {
          category: entry.category,
          productDetail: entry.productDetail,
          quantity: quantityNumber,
          unit: entry.unit,
          price: priceNumber || 0,
          supplierName: entry.supplierName || null,
          expiryDate: this.validateImportExpiryDate(entry.expiryDate, entry.productDetail),
          type: "IMPORT"
        };
      }));

      const batch = await this.prisma.stockEntryBatch.create({
        data: {
          userId: userId || undefined,
          entries: {
            create: formattedEntries,
          },
        },
        include: { entries: true },
      });

      return {
        message: 'Nhập kho thành công',
        batch,
      };
    } catch (error: any) {
      console.error('Lỗi nhập kho:', error);
      throw new BadRequestException('Lỗi khi nhập kho: ' + (error.message || error));
    }
  }

  // Hàm Xuất Kho (EXPORT)
  async exportStock(
    userId: string | undefined,
    entries: {
      category: string;
      productDetail: string;
      quantity: number | string;
      unit: string;
      price?: number | string;
    }[],
  ) {
    if (!entries.length) {
      throw new BadRequestException('Danh sách nguyên liệu xuất không được để trống.');
    }

    const inventory = await this.getInventorySummary();

    const formattedEntries = (await Promise.all(entries.map(async (entry) => {
      const quantityNumber = parseFloat(entry.quantity as string);
      if (isNaN(quantityNumber) || quantityNumber <= 0) {
        throw new BadRequestException(`Số lượng xuất không hợp lệ`);
      }

      const inventoryItem = this.findInventoryMatch(inventory, entry);
      const currentStock = inventoryItem?.quantity || 0;

      if (quantityNumber > currentStock) {
        throw new BadRequestException(`Không đủ tồn kho để xuất ${entry.productDetail}. Hiện chỉ còn ${currentStock} ${entry.unit}.`);
      }

      const entryPrice = entry.price ? parseFloat(entry.price as string) : undefined;
      const averagePrice = await this.getEffectiveAveragePrice(entry.category, entry.productDetail, entry.unit);
      const effectivePrice = entryPrice && entryPrice > 0 ? entryPrice : averagePrice;
      return this.splitByExpiryLots(inventoryItem!, quantityNumber).map((lot) => ({
        category: entry.category?.trim(),
        productDetail: entry.productDetail?.trim(),
        quantity: lot.quantity,
        unit: entry.unit?.trim(),
        price: effectivePrice,
        priceDifference: (effectivePrice - averagePrice) * lot.quantity,
        expiryDate: lot.expiryDate,
        type: "EXPORT"
      }));
    }))).flat();

    // 2. Lưu lịch sử xuất kho
    const batch = await this.prisma.stockEntryBatch.create({
      data: {
        userId: userId || undefined,
        entries: {
          create: formattedEntries,
        },
      },
      include: { entries: true },
    });

    return {
      message: 'Xuất kho thành công',
      batch,
    };
  }

  // Theo dõi Nguyên liệu tiêu thụ cho Đơn bán hàng
  async consumeStock(
    userId: string | undefined,
    entries: {
      category: string;
      productDetail: string;
      quantity: number | string;
      unit: string;
    }[],
  ) {
    if (!entries.length) return;

    const inventory = await this.getInventorySummary();
    const formattedEntries = (await Promise.all(entries.map(async (entry) => {
      const quantityNumber = parseFloat(entry.quantity as string);
      if (isNaN(quantityNumber) || quantityNumber <= 0) {
        throw new BadRequestException(`Số lượng tiêu thụ không hợp lệ`);
      }

      const inventoryItem = this.findInventoryMatch(inventory, entry);
      const currentStock = inventoryItem?.quantity || 0;

      if (quantityNumber > currentStock) {
        throw new BadRequestException(`Không đủ tồn kho để tiêu thụ ${entry.productDetail}. Hiện chỉ còn ${currentStock} ${entry.unit}.`);
      }

      const averagePrice = await this.getEffectiveAveragePrice(entry.category, entry.productDetail, entry.unit, inventory);
      return this.splitByExpiryLots(inventoryItem!, quantityNumber).map((lot) => ({
        category: entry.category?.trim(),
        productDetail: entry.productDetail?.trim(),
        quantity: lot.quantity,
        unit: entry.unit?.trim(),
        price: averagePrice,
        priceDifference: 0,
        expiryDate: lot.expiryDate,
        type: "CONSUME"
      }));
    }))).flat();

    try {
      await this.prisma.stockEntryBatch.create({
        data: {
          userId: userId || undefined,
          entries: {
            create: formattedEntries,
          },
        },
      });
    } catch (error) {
      console.error('Lỗi khi tiêu thụ kho:', error);
      throw new BadRequestException('Lỗi khi tiêu thụ kho: ' + (error instanceof Error ? error.message : error));
    }
  }

  // Hàm Báo Cáo Tồn Kho
  async getInventorySummary() {
    const allEntries = await this.prisma.stockEntry.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const inventoryMap = new Map<string, {
      category: string;
      productDetail: string;
      unit: string;
      lots: Map<string, { expiryDate: Date | null; quantity: number; totalValue: number }>;
      lastStockOutAt?: Date;
    }>();

    for (const entry of allEntries) {
      const cat = entry.category?.trim().toLowerCase() || "";
      const prod = entry.productDetail?.trim().toLowerCase() || "";
      let unt = entry.unit?.trim().toLowerCase() || "";
      if (unt === "pcs") unt = "cái";

      const key = `${cat}-${prod}-${unt}`;
      const existing = inventoryMap.get(key) || {
        category: entry.category?.trim() || "",
        productDetail: entry.productDetail?.trim() || "",
        unit: unt,
        lots: new Map<string, { expiryDate: Date | null; quantity: number; totalValue: number }>(),
      };

      const expiryDate = this.parseExpiryDate((entry as any).expiryDate);
      const quantity = Number(entry.quantity || 0);

      if (entry.type === "IMPORT") {
        const expiryKey = this.getExpiryKey(expiryDate);
        const lot = existing.lots.get(expiryKey) || {
          expiryDate,
          quantity: 0,
          totalValue: 0,
        };
        lot.quantity += quantity;
        lot.totalValue += Number((entry as any).price || 0) * quantity;
        existing.lots.set(expiryKey, lot);
      } else if (entry.type === "EXPORT" || entry.type === "CONSUME") {
        this.deductFromLots(existing.lots, quantity, expiryDate);
      }

      inventoryMap.set(key, existing);
    }

    return Array.from(inventoryMap.values()).map((item) => {
      const positiveLots = Array.from(item.lots.values()).filter((lot) => lot.quantity > 0);
      const activeLots = positiveLots.filter((lot) => !this.isExpiredDate(lot.expiryDate));
      const expiredLots = positiveLots.filter((lot) => this.isExpiredDate(lot.expiryDate));
      const quantity = activeLots.reduce((sum, lot) => sum + lot.quantity, 0);
      const totalValue = activeLots.reduce((sum, lot) => sum + lot.totalValue, 0);
      const expiredQuantity = expiredLots.reduce((sum, lot) => sum + lot.quantity, 0);

      const buildDetails = (lots: typeof activeLots) =>
        this.sortLotsForExport(lots).map((lot) => ({
          expiryDate: lot.expiryDate ? lot.expiryDate.toISOString() : null,
          quantity: Number(lot.quantity.toFixed(2)),
          unit: item.unit,
          averagePrice:
            lot.quantity > 0 ? Math.max(0, Math.round(lot.totalValue / lot.quantity)) : 0,
          totalValue: Math.max(0, Math.round(lot.totalValue)),
        }));

      return {
        category: item.category,
        productDetail: item.productDetail,
        unit: item.unit,
        quantity: Number(quantity.toFixed(2)),
        expiredQuantity: Number(expiredQuantity.toFixed(2)),
        averagePrice: quantity > 0 ? Math.max(0, Math.round(totalValue / quantity)) : 0,
        totalValue: Math.max(0, Math.round(totalValue)),
        expiryDetails: buildDetails(activeLots),
        expiredDetails: buildDetails(expiredLots),
        lastStockOutAt: quantity <= 0 ? item.lastStockOutAt || new Date() : undefined,
      };
    });
  }

  async getInventorySummaryLegacy() {
    const allEntries = await this.prisma.stockEntry.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    // Group by productDetail
    const inventoryMap = new Map<string, { category: string, productDetail: string, unit: string, quantity: number, lastStockOutAt?: Date, averagePrice: number, totalValue: number }>();
    
    for (const entry of allEntries) {
      const cat = entry.category?.trim().toLowerCase() || "";
      const prod = entry.productDetail?.trim().toLowerCase() || "";
      let unt = entry.unit?.trim().toLowerCase() || "";
      if (unt === "pcs") unt = "cái";

      const key = `${cat}-${prod}-${unt}`;
      
      const existing = inventoryMap.get(key) || {
        category: entry.category?.trim() || "",
        productDetail: entry.productDetail?.trim() || "",
        unit: unt,
        quantity: 0,
        averagePrice: 0,
        totalValue: 0
      };
      
      const prevQty = existing.quantity;

      if (entry.type === "IMPORT") {
        existing.quantity += entry.quantity;
        if ((entry as any).price != null && (entry as any).price > 0) {
          existing.totalValue += (entry as any).price * entry.quantity;
        }
      } else if (entry.type === "EXPORT" || entry.type === "CONSUME") {
        const outPrice = existing.averagePrice;
        
        existing.quantity -= entry.quantity;
        existing.totalValue -= outPrice * entry.quantity;
      }
      
      if (existing.quantity > 0) {
          existing.averagePrice = Math.max(0, Math.round(existing.totalValue / existing.quantity));
      } else {
          existing.averagePrice = 0;
          existing.totalValue = 0;
      }
      
      if (existing.quantity <= 0) {
        if (prevQty > 0 || !existing.lastStockOutAt) {
          existing.lastStockOutAt = entry.createdAt;
        }
      } else {
        existing.lastStockOutAt = undefined;
      }
      
      inventoryMap.set(key, existing);
    }
    
    return Array.from(inventoryMap.values());
  }

  async getStockBatches() {
    return this.prisma.stockEntryBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: { entries: true, user: true }, 
    });
  }
  
  async getStockEntries(batchId: string) {
    return this.prisma.stockEntry.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEffectiveAveragePrice(category: string, productDetail: string, unit: string, inventory?: Array<{ category: string; productDetail: string; unit: string; averagePrice: number }>) {
    const normalizedCategory = category?.trim().toLowerCase() || "";
    const normalizedProduct = productDetail?.trim().toLowerCase() || "";
    const normalizedUnit = unit?.trim().toLowerCase() || "";

    const inventoryToUse = inventory || await this.getInventorySummary();
    const existing = inventoryToUse.find(i =>
      i.category?.trim().toLowerCase() === normalizedCategory &&
      i.productDetail?.trim().toLowerCase() === normalizedProduct &&
      i.unit?.trim().toLowerCase() === normalizedUnit
    );

    if (existing && existing.averagePrice > 0) {
      return existing.averagePrice;
    }

    const lastImport = await this.prisma.stockEntry.findFirst({
      where: {
        category: { equals: category?.trim(), mode: 'insensitive' },
        productDetail: { equals: productDetail?.trim(), mode: 'insensitive' },
        unit: { equals: unit?.trim(), mode: 'insensitive' },
        type: 'IMPORT',
        price: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Number(lastImport?.price || 0);
  }

  async updateStockEntry(id: string, data: { quantity: number }) {
    return this.prisma.stockEntry.update({
      where: { id },
      data,
    });
  }
  
  async deleteStockEntry(id: string) {
    return this.prisma.stockEntry.delete({
      where: { id },
    });
  }

  async deleteStockBatch(batchId: string) {
    return this.prisma.stockEntryBatch.delete({
      where: { id: batchId },
    });
  }
}
