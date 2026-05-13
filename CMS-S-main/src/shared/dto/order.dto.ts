export class CreateOrderDto {
  id?: string;
  userId: string;
  table?: string;
  customerName?: string;
  items: { productId: string; quantity: number }[];
  amount: number;
  paymentMethod: string;
}

export class CreateGrabSimulatorOrderDto {
  userId?: string;
  orderId?: string;
  customerName?: string;
  partnerCode?: string;
  phone?: string;
  items?: { productId: string; quantity: number }[];
}
