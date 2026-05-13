import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentDetailsDto {
  @ApiProperty({ description: 'Transaction ID for the payment' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiProperty({ description: 'Amount paid by the customer', example: 500.0 })
  @IsNumber()
  amountPaid: number;
}

export class PaymentDto {
  @ApiProperty({ description: 'Order ID for the payment' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Payment method used', example: 'QR' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: 'QR' | 'CASH' | 'POSTPAID';

  @ApiProperty({ description: 'Details of the payment' })
  paymentDetails: PaymentDetailsDto;
}
