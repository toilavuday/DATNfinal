import type {
  DashboardNotification,
  DashboardNotificationKind,
} from "@/shared/types/notification";
import type { KitchenQueueOrder } from "@/shared/utils/kitchen-queue";

export interface InventorySummary {
  category: string;
  productDetail: string;
  unit: string;
  quantity: number;
  expiredQuantity?: number;
  lastStockOutAt?: string;
}

export const NOTIFICATION_STORAGE_KEY = "dashboardNotifications";
export const DAILY_REVENUE_NOTIFY_KEY = "dailyRevenueNotificationDate";

const stripVietnamese = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const formatNotificationTimestamp = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

export const getNotificationKindLabel = (kind: DashboardNotificationKind) => {
  switch (kind) {
    case "order":
      return "Đơn hàng mới";
    case "low-stock":
      return "Sắp hết nguyên liệu";
    case "out-of-stock":
      return "Hết nguyên liệu";
    case "expired-stock":
      return "Nguyên liệu hết hạn";
    case "daily-summary":
    default:
      return "Thông báo hệ thống";
  }
};

export const getNotificationSnackbarVariant = (
  kind: DashboardNotificationKind,
) => {
  switch (kind) {
    case "order":
      return "success" as const;
    case "low-stock":
      return "warning" as const;
    case "out-of-stock":
    case "expired-stock":
      return "error" as const;
    case "daily-summary":
    default:
      return "info" as const;
  }
};

export const parseDashboardNotifications = (
  value: string | null,
): DashboardNotification[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const timestamp =
        typeof item.timestamp === "string"
          ? item.timestamp
          : new Date().toISOString();

      let kind: DashboardNotificationKind = "daily-summary";
      if (
        item.kind === "order" ||
        item.kind === "low-stock" ||
        item.kind === "out-of-stock" ||
        item.kind === "expired-stock" ||
        item.kind === "daily-summary"
      ) {
        kind = item.kind;
      } else if (item.type === "error") {
        kind = "out-of-stock";
      } else if (item.type === "warning") {
        kind = "low-stock";
      }

      return [
        {
          id:
            typeof item.id === "string"
              ? item.id
              : `${kind}-${timestamp}-${Math.random().toString(16).slice(2)}`,
          title: typeof item.title === "string" ? item.title : "Thông báo",
          description:
            typeof item.description === "string" ? item.description : "",
          timestamp,
          kind,
          read: Boolean(item.read),
          meta: typeof item.meta === "object" ? item.meta : undefined,
        } satisfies DashboardNotification,
      ];
    });
  } catch {
    return [];
  }
};

export const persistDashboardNotifications = (
  notifications: DashboardNotification[],
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    NOTIFICATION_STORAGE_KEY,
    JSON.stringify(notifications),
  );
};

export const getInventoryNotificationKey = (item: InventorySummary) =>
  `${stripVietnamese(item.category || "nguyen-lieu")}-${stripVietnamese(
    item.productDetail || "khong-xac-dinh",
  )}`;

const getLowStockThreshold = (unit: string) => {
  const normalizedUnit = stripVietnamese(unit);

  if (normalizedUnit.includes("kg")) {
    return 10;
  }

  if (
    normalizedUnit === "l" ||
    normalizedUnit.includes(" lit") ||
    normalizedUnit.includes("lit")
  ) {
    return 10;
  }

  if (normalizedUnit.includes("cai")) {
    return 50;
  }

  return null;
};

export const getInventoryNotificationKind = (
  item: InventorySummary,
): Extract<DashboardNotificationKind, "low-stock" | "out-of-stock"> | null => {
  const quantity = Number(item.quantity || 0);

  if (quantity <= 0) {
    return "out-of-stock";
  }

  const threshold = getLowStockThreshold(item.unit || "");
  if (threshold != null && quantity < threshold) {
    return "low-stock";
  }

  return null;
};

export const buildInventoryNotification = (
  item: InventorySummary,
  kind: Extract<DashboardNotificationKind, "low-stock" | "out-of-stock">,
): DashboardNotification => {
  const inventoryKey = getInventoryNotificationKey(item);
  const quantity = Number(item.quantity || 0);
  const unit = item.unit || "";
  const threshold = getLowStockThreshold(unit);

  if (kind === "out-of-stock") {
    return {
      id: `inventory-out-of-stock-${inventoryKey}`,
      title: `Nguyên liệu hết: ${item.productDetail}`,
      description: `Trong kho còn ${quantity} ${unit}. Cần bổ sung ngay để tránh gián đoạn bán hàng.`,
      timestamp: item.lastStockOutAt || new Date().toISOString(),
      kind,
      read: false,
      meta: {
        inventoryKey,
        quantity,
        unit,
      },
    };
  }

  return {
    id: `inventory-low-stock-${inventoryKey}`,
    title: `Nguyên liệu sắp hết: ${item.productDetail}`,
    description: `Trong kho còn ${quantity} ${unit}. Mức cảnh báo là dưới ${threshold} ${unit}.`,
    timestamp: new Date().toISOString(),
    kind,
    read: false,
    meta: {
      inventoryKey,
      quantity,
      unit,
    },
  };
};

export const buildExpiredStockNotification = (
  item: InventorySummary,
): DashboardNotification => {
  const inventoryKey = getInventoryNotificationKey(item);
  const expiredQuantity = Number(item.expiredQuantity || 0);
  const unit = item.unit || "";

  return {
    id: `inventory-expired-stock-${inventoryKey}`,
    title: `Nguyên liệu hết hạn: ${item.productDetail}`,
    description: `Có ${expiredQuantity} ${unit} đã hết hạn và đã được trừ khỏi tồn kho khả dụng.`,
    timestamp: new Date().toISOString(),
    kind: "expired-stock",
    read: false,
    meta: {
      inventoryKey,
      expiredQuantity,
      quantity: expiredQuantity,
      unit,
    },
  };
};

export const buildOrderNotification = (
  order: KitchenQueueOrder,
): DashboardNotification => {
  const totalItems = (order.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const channel =
    order.table || order.channelLabel || order.partnerCode || "Tại quầy";
  const customerName = order.customerName || "Khách vãng lai";
  const displayId = order.displayId || order.id;

  return {
    id: `order-${order.id}`,
    title: `Đơn hàng mới #${displayId}`,
    description: `${customerName} • ${channel} • ${totalItems} món cần xử lý`,
    timestamp: order.createdAt
      ? new Date(order.createdAt).toISOString()
      : new Date().toISOString(),
    kind: "order",
    read: false,
    meta: {
      orderId: order.id,
    },
  };
};
