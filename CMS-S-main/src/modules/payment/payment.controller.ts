import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  async createPayment(@Body() body: { amount: number; orderInfo: string }) {
    return this.paymentService.createPayment(body.amount, body.orderInfo);
  }

  @Post('webhook')
  async handleWebhook(@Body() data: any) {
    return this.paymentService.handleWebhook(data);
  }
}
