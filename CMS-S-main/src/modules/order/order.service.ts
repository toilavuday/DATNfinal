import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Product, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGrabSimulatorOrderDto,
  CreateOrderDto,
} from '../../shared/dto/order.dto';
import { PaymentDto } from 'shared/dto/payment.dto';
import { StockService } from '../stock/stock.service';

type InventorySummaryItem = {
  category: string;
  productDetail: string;
  unit: string;
  quantity: number;
};

type RecipeIngredient = {
  category?: string;
  productDetail?: string;
  unit?: string;
  amount?: number | string;
};

type SimulatorSelectedProduct = {
  product: Product;
  quantity: number;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService
  ) { }

  private normalizeValue(value?: string | null) {
    return (value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\u0111/g, 'd');
  }

  private findInventoryItem(
    inventory: InventorySummaryItem[],
    ingredient: RecipeIngredient,
  ) {
    const normalizedCategory = this.normalizeValue(ingredient.category);
    const normalizedProductDetail = this.normalizeValue(
      ingredient.productDetail,
    );
    const normalizedUnit = this.normalizeValue(ingredient.unit);

    return inventory.find((item) => {
      const isSameCategory =
        this.normalizeValue(item.category) === normalizedCategory;
      const isSameProductDetail =
        this.normalizeValue(item.productDetail) === normalizedProductDetail;
      const isSameUnit = normalizedUnit
        ? this.normalizeValue(item.unit) === normalizedUnit
        : true;

      return isSameCategory && isSameProductDetail && isSameUnit;
    });
  }

  private calculateProductMaxQuantity(
    product: Product,
    inventory: InventorySummaryItem[],
  ) {
    if (!Array.isArray(product.recipe) || product.recipe.length === 0) {
      return 999;
    }

    let maxQuantity = Number.MAX_SAFE_INTEGER;

    for (const ingredient of product.recipe as RecipeIngredient[]) {
      if (!ingredient.category || !ingredient.productDetail) {
        continue;
      }

      const amountNeeded = Number(ingredient.amount);
      if (!Number.isFinite(amountNeeded) || amountNeeded <= 0) {
        continue;
      }

      const inventoryItem = this.findInventoryItem(inventory, ingredient);
      const inventoryQuantity = inventoryItem ? Number(inventoryItem.quantity) : 0;
      const possibleQuantity = Math.floor(inventoryQuantity / amountNeeded);

      if (possibleQuantity < maxQuantity) {
        maxQuantity = possibleQuantity;
      }
    }

    if (maxQuantity === Number.MAX_SAFE_INTEGER) {
      return 999;
    }

    return Math.max(0, maxQuantity);
  }

  private async resolveSimulatorUserId(requestedUserId?: string) {
    if (requestedUserId) {
      const requestedUser = await this.prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true },
      });

      if (!requestedUser) {
        throw new BadRequestException('Simulator user not found');
      }

      return requestedUser.id;
    }

    const fallbackUser = await this.prisma.user.findFirst({
      where: {
        role: {
          in: [UserRole.ADMIN, UserRole.STAFF],
        },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!fallbackUser) {
      throw new BadRequestException(
        'No admin or staff account is available to create simulator orders',
      );
    }

    return fallbackUser.id;
  }

  private generateSimulatorDisplayId(prefix: string) {
    const serial = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${serial}`;
  }

  private formatPartnerLabel(partnerCode: string) {
    const normalized = partnerCode.trim().toUpperCase();

    if (normalized === 'GRABFOOD') {
      return 'GrabFood';
    }

    if (normalized === 'SHOPEEFOOD') {
      return 'ShopeeFood';
    }

    if (normalized === 'GOFOOD') {
      return 'GoFood';
    }

    return normalized;
  }

  private generateDisplayIdFromPartner(partnerCode: string) {
    const normalized = partnerCode.trim().toUpperCase();
    const prefix =
      normalized.replace(/[^A-Z]/g, '').slice(0, 6) || 'DELIV';

    return this.generateSimulatorDisplayId(prefix);
  }

  private normalizeSimulatorItems(
    items: CreateGrabSimulatorOrderDto['items'],
  ) {
    const quantityByProductId = new Map<string, number>();

    for (const item of items || []) {
      const productId = item?.productId?.trim();
      const quantity = Number(item?.quantity);

      if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        continue;
      }

      quantityByProductId.set(
        productId,
        (quantityByProductId.get(productId) || 0) + quantity,
      );
    }

    return Array.from(quantityByProductId.entries()).map(
      ([productId, quantity]) => ({
        productId,
        quantity,
      }),
    );
  }

  private buildRequiredIngredientsMap(
    selectedProducts: SimulatorSelectedProduct[],
  ) {
    const requiredIngredientsMap = new Map<
      string,
      {
        category: string;
        productDetail: string;
        unit: string;
        quantity: number;
      }
    >();

    for (const selectedProduct of selectedProducts) {
      if (
        !Array.isArray(selectedProduct.product.recipe) ||
        selectedProduct.product.recipe.length === 0
      ) {
        continue;
      }

      for (const ingredient of selectedProduct.product
        .recipe as RecipeIngredient[]) {
        if (!ingredient.category || !ingredient.productDetail) {
          continue;
        }

        const requiredAmount =
          Number(ingredient.amount) * selectedProduct.quantity;
        if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
          continue;
        }

        const unit = ingredient.unit?.trim() || '';
        const key = `${this.normalizeValue(ingredient.category)}-${this.normalizeValue(
          ingredient.productDetail,
        )}-${this.normalizeValue(unit)}`;

        const existingRequirement = requiredIngredientsMap.get(key);
        if (existingRequirement) {
          existingRequirement.quantity += requiredAmount;
          continue;
        }

        requiredIngredientsMap.set(key, {
          category: ingredient.category.trim(),
          productDetail: ingredient.productDetail.trim(),
          unit,
          quantity: requiredAmount,
        });
      }
    }

    return Array.from(requiredIngredientsMap.values());
  }

  private validateSimulatorStockAvailability(
    selectedProducts: SimulatorSelectedProduct[],
    inventory: InventorySummaryItem[],
  ) {
    for (const selectedProduct of selectedProducts) {
      const maxQuantity = this.calculateProductMaxQuantity(
        selectedProduct.product,
        inventory,
      );

      if (selectedProduct.quantity > maxQuantity) {
        throw new BadRequestException(
          `Product ${selectedProduct.product.name} only has enough stock for ${maxQuantity} item(s)`,
        );
      }
    }

    const requiredIngredients = this.buildRequiredIngredientsMap(
      selectedProducts,
    );

    for (const ingredient of requiredIngredients) {
      const inventoryItem = this.findInventoryItem(inventory, ingredient);
      const inventoryQuantity = inventoryItem
        ? Number(inventoryItem.quantity)
        : 0;

      if (ingredient.quantity > inventoryQuantity) {
        throw new BadRequestException(
          `Not enough stock for ${ingredient.productDetail}. Remaining: ${inventoryQuantity} ${ingredient.unit}`,
        );
      }
    }
  }

  async createGrabSimulatorOrder(
    createGrabSimulatorOrderDto: CreateGrabSimulatorOrderDto = {},
  ) {
    const userId = await this.resolveSimulatorUserId(
      createGrabSimulatorOrderDto.userId,
    );

    const normalizedItems = this.normalizeSimulatorItems(
      createGrabSimulatorOrderDto.items,
    );

    if (normalizedItems.length === 0) {
      throw new BadRequestException(
        'Simulator order must contain at least one product',
      );
    }

    const partnerCode =
      createGrabSimulatorOrderDto.partnerCode?.trim().toUpperCase() ||
      'GRABFOOD';
    const channelLabel = this.formatPartnerLabel(partnerCode);
    const customerName =
      createGrabSimulatorOrderDto.customerName?.trim() || 'Khach Grab demo';
    const customerPhone =
      createGrabSimulatorOrderDto.phone?.trim() || '0901234567';
    const displayId =
      createGrabSimulatorOrderDto.orderId?.trim() ||
      this.generateDisplayIdFromPartner(partnerCode);

    const [products, inventory] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          id: {
            in: normalizedItems.map((item) => item.productId),
          },
        },
      }),
      this.stockService.getInventorySummary(),
    ]);

    const productsById = new Map(products.map((product) => [product.id, product]));
    const selectedProducts: SimulatorSelectedProduct[] = normalizedItems.map(
      (item) => {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new BadRequestException(
            `Product ${item.productId} does not exist`,
          );
        }

        return {
          product,
          quantity: item.quantity,
        };
      },
    );

    this.validateSimulatorStockAvailability(selectedProducts, inventory);

    const amount = selectedProducts.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );

    const order = await this.createOrder({
      userId,
      customerName,
      items: normalizedItems,
      amount,
      paymentMethod: 'cash',
    });

    const orderItems = Array.isArray(order.items)
      ? (order.items as Array<{
          productId: string;
          productName: string;
          productPrice: number;
          quantity: number;
          total: number;
        }>)
      : [];

    return {
      message: 'Grab simulator order created successfully',
      order,
      mockPayload: {
        order_id: displayId,
        partner_code: partnerCode,
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        items: orderItems.map((item) => ({
          sku: item.productId,
          name: item.productName,
          quantity: item.quantity,
          price: item.productPrice,
        })),
        total_amount: order.amount ?? amount,
      },
      queueOrder: {
        id: order.id,
        displayId,
        customerName,
        table: channelLabel,
        partnerCode,
        channelLabel,
        isDeliveryMock: true,
        amount: order.amount ?? amount,
        createdAt: order.createdAt,
        items: orderItems,
      },
    };
  }

  // async createOrder(createOrderDto: CreateOrderDto) {
  //   const { userId, items, amount, paymentMethod } = createOrderDto;

  //   const detailedItems = await Promise.all(
  //     items.map(async (item) => {
  //       const product = await this.prisma.product.findUnique({
  //         where: { id: item.productId },
  //       });

  //       if (!product) {
  //         throw new Error(`Product with ID ${item.productId} not found`);
  //       }

  //       return {
  //         productId: product.id,
  //         productName: product.name,
  //         productPrice: product.price,
  //         quantity: item.quantity,
  //         total: product.price * item.quantity,
  //       };
  //     }),
  //   );

  //   const order = await this.prisma.order.create({
  //     data: {
  //       userId,
  //       amount,
  //       paymentMethod,
  //       status: 'success',
  //       items: detailedItems,
  //     },
  //   });

  //   return order;
  // }
  async createOrder(createOrderDto: CreateOrderDto) {
    const { userId, items, amount, paymentMethod, customerName } = createOrderDto;

    const requiredIngredientsMap: Record<string, { category: string, productDetail: string, unit: string, quantity: number }> = {};

    const detailedItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // ============================================
        // 3. TÍNH TOÁN ĐỊNH LƯỢNG NGUYÊN LIỆU (BOM)
        // ============================================
        if ((product as any).recipe && Array.isArray((product as any).recipe)) {
          for (const ingredient of (product as any).recipe as any[]) {
            if (!ingredient.category || !ingredient.productDetail) continue;
            
            const catKey = this.normalizeValue(ingredient.category);
            const prodKey = this.normalizeValue(ingredient.productDetail);
            const untKey = this.normalizeValue(ingredient.unit);
            const key = `${catKey}-${prodKey}-${untKey}`;
            const requiredAmount = Number(ingredient.amount) * item.quantity;
            
            if (!requiredIngredientsMap[key]) {
              requiredIngredientsMap[key] = {
                category: ingredient.category,
                productDetail: ingredient.productDetail,
                unit: ingredient.unit,
                quantity: 0
              };
            }
            requiredIngredientsMap[key].quantity += requiredAmount;
          }
        }

        // Đoạn return dữ liệu bên dưới vẫn giữ nguyên như cũ của bạn
        return {
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          quantity: item.quantity,
          total: product.price * item.quantity,
        };
      }),
    );

    // ============================================
    // 4. TIÊU THỤ NGUYÊN LIỆU ĐÃ TÍNH TOÁN
    // ============================================
    const exportEntries = Object.values(requiredIngredientsMap);
    if (exportEntries.length > 0) {
      await this.stockService.consumeStock(userId, exportEntries);
    }

    const order = await this.prisma.order.create({
      data: {
        ...(createOrderDto.id ? { id: createOrderDto.id } : {}),
        userId,
        amount,
        customerName: createOrderDto.customerName,
        paymentMethod,
        status: 'success',
        items: detailedItems,
      },
    });

    return order;
  }
  //
  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      ...order,
      items: order.items as Array<{
        productId: string;
        productName: string;
        productPrice: number;
        quantity: number;
        total: number;
      }>,
    };
  }
  async getAllOrders() {
    const orders = await this.prisma.order.findMany({
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });
    const detailedOrders = orders.map((order) => {
      const items = order.items as Array<{
        productId: string;
        productName: string;
        productPrice: number;
        quantity: number;
        total: number;
      }>;

      const detailedItems = items.map((item) => ({
        ...item,
        total: item.productPrice * item.quantity,
      }));

      return {
        ...order,
        userName: order.user.name,
        items: detailedItems,
      };
    });

    return detailedOrders;
  }

  async deleteOrder(id: string) {
    return this.prisma.order.delete({
      where: { id },
    });
  }

  async checkPayment(orderInfo: string, amount: number) {
    try {
      const axios = require('axios');
      const response = await axios.get('https://my.sepay.vn/userapi/transactions/list', {
        headers: {
          'Authorization': 'Bearer FEAAGOAUI2ELST5FCDX3TKRVTYJGU7QPGYJ3MCDVHG8LM2W9HELR6NCV0PZVJHOC',
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      console.log('--- SEPAY CHECK FOR', orderInfo, '---');
      console.log('SePay success:', data.status, 'messages:', data.messages);
      
      let transactions = [];
      if (data && Array.isArray(data.transactions)) {
        transactions = data.transactions;
      } else if (data && data.data && Array.isArray(data.data.transactions)) {
          transactions = data.data.transactions;
      }

      if (transactions.length > 0) {
        const match = transactions.find(tx => {
          const content = String(tx.transaction_content || '').toUpperCase();
          const target = String(orderInfo).toUpperCase();
          return content.includes(target) && Number(tx.amount_in) >= amount;
        });

        if (match) {
          console.log('=> MATCH FOUND:', match.id);
          return { success: true, transaction: match };
        }
      }
      console.log('=> NO MATCH FOUND IN', transactions.length, 'transactions');
      return { success: false };
    } catch (error) {
      console.error('Error checking SePay payment:', error);
      return { success: false, error: 'Cannot check payment' };
    }
  }
}
