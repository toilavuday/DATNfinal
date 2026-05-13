export interface KitchenQueueItem {
  productId?: string;
  productName: string;
  productPrice?: number;
  quantity: number;
  total?: number;
}

export interface KitchenQueueOrder {
  id: string;
  displayId?: string;
  customerName?: string;
  table?: string;
  partnerCode?: string;
  channelLabel?: string;
  isDeliveryMock?: boolean;
  amount?: number | null;
  createdAt?: string | Date;
  items?: KitchenQueueItem[];
}

export interface KitchenQueueEvent {
  id: string;
  at: number;
  type: "order-added" | "order-removed";
  source?: "pos" | "simulator";
  order?: KitchenQueueOrder;
  orderId?: string;
}

export const KITCHEN_QUEUE_STORAGE_KEY = "kitchenOrdersQueue";
export const KITCHEN_QUEUE_EVENT_STORAGE_KEY = "kitchenOrdersQueueEvent";
export const KITCHEN_QUEUE_CHANNEL_NAME = "cms-kitchen-orders";

export const parseKitchenOrders = (value: string | null): KitchenQueueOrder[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const upsertKitchenOrder = (
  orders: KitchenQueueOrder[],
  nextOrder: KitchenQueueOrder,
) => {
  const existingIndex = orders.findIndex((order) => order.id === nextOrder.id);

  if (existingIndex === -1) {
    return [nextOrder, ...orders];
  }

  const nextOrders = [...orders];
  nextOrders[existingIndex] = {
    ...nextOrders[existingIndex],
    ...nextOrder,
  };

  return nextOrders;
};

export const removeKitchenOrder = (
  orders: KitchenQueueOrder[],
  orderId: string,
) => orders.filter((order) => order.id !== orderId);

export const persistKitchenOrders = (orders: KitchenQueueOrder[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    KITCHEN_QUEUE_STORAGE_KEY,
    JSON.stringify(orders),
  );
};

export const emitKitchenQueueEvent = (
  event: Omit<KitchenQueueEvent, "id" | "at">,
) => {
  if (typeof window === "undefined") {
    return;
  }

  const payload: KitchenQueueEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: Date.now(),
  };

  window.localStorage.setItem(
    KITCHEN_QUEUE_EVENT_STORAGE_KEY,
    JSON.stringify(payload),
  );

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(KITCHEN_QUEUE_CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  }
};
