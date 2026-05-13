import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import * as process from 'process';

@Injectable()
export class PaymentService {
  private readonly partnerCode = process.env.MOMO_PARTNER_CODE;
  private readonly accessKey = process.env.MOMO_ACCESS_KEY;
  private readonly secretKey = process.env.MOMO_SECRET_KEY;
  private readonly redirectUrl = process.env.MOMO_REDIRECT_URL;
  private readonly ipnUrl = process.env.MOMO_IPN_URL;
  private readonly requestType = process.env.MOMO_REQUEST_TYPE;
  private readonly apiEndpoint = process.env.MOMO_API_ENDPOINT;

  async createPayment(amount: number, orderInfo: string) {
    const orderId = `ORDER_${new Date().getTime()}`;
    const requestId = orderId;
    const extraData = '';

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.partnerCode}&redirectUrl=${this.redirectUrl}&requestId=${requestId}&requestType=${this.requestType}`;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      accessKey: this.accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      extraData,
      requestType: this.requestType,
      signature,
      lang: 'vi',
    };

    try {
      const response = await axios.post(this.apiEndpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Payment request failed: ${error.message}`);
    }
  }

  async handleWebhook(data: any) {
    console.log('Webhook data received:', data);

    if (data.resultCode === 0) {
      console.log('Payment successful:', data);
      return { status: 'success', message: 'Payment completed successfully.' };
    } else {
      console.log('Payment failed:', data);
      return { status: 'error', message: 'Payment failed.' };
    }
  }
}
