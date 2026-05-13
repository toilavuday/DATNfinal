export interface Order {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  paymentMethod:string;
  userId: string;
  user: { name: string };
  items: {
    productId: string;
    productName: string;
    productPrice: number;
    quantity: number;
    total: number;
  }[];
}
