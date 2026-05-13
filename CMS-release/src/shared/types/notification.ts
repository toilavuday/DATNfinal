export type DashboardNotificationKind =
  | "order"
  | "low-stock"
  | "out-of-stock"
  | "expired-stock"
  | "daily-summary";

export interface DashboardNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  kind: DashboardNotificationKind;
  read: boolean;
  meta?: {
    inventoryKey?: string;
    orderId?: string;
    quantity?: number;
    expiredQuantity?: number;
    unit?: string;
  };
}
