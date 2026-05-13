import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import {
  CreateGrabSimulatorOrderDto,
  CreateOrderDto,
} from '../../shared/dto/order.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('simulator/grab')
  @ApiOperation({ summary: 'Create a sample Grab order for simulator/demo flows' })
  async createGrabSimulatorOrder(
    @Body() createGrabSimulatorOrderDto: CreateGrabSimulatorOrderDto,
  ) {
    return this.orderService.createGrabSimulatorOrder(
      createGrabSimulatorOrderDto,
    );
  }

  @Post('add')
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific order' })
  async getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }
  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  async getAllOrders() {
    return this.orderService.getAllOrders();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  async deleteOrder(@Param('id') id: string) {
    return this.orderService.deleteOrder(id);
  }

  @Get('check-payment/:orderInfo/:amount')
  @ApiOperation({ summary: 'Check payment status via SePay' })
  async checkPaymentStatus(
    @Param('orderInfo') orderInfo: string,
    @Param('amount') amount: string,
  ) {
    return this.orderService.checkPayment(orderInfo, Number(amount));
  }
}
