export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category?: string;
  recipe?: any[];
  image: string | File | null;
  brand: string;
  quantity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  onIncreaseQuantity: (productId: string) => void;
  onDecreaseQuantity: (productId: string) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}
