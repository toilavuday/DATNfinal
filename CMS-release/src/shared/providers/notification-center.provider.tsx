"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { usePathname } from "next/navigation";
import { useSnackbar } from "notistack";
import { useRecoilState, useRecoilValue } from "recoil";
import { authState } from "@/shared/store/Atoms/auth";
import {
  notificationPopoverOpenState,
  notificationsLoadingState,
  notificationsState,
} from "@/shared/store/Atoms/ui";
import type { DashboardNotificationKind } from "@/shared/types/notification";
import {
  DAILY_REVENUE_NOTIFY_KEY,
  NOTIFICATION_STORAGE_KEY,
  type InventorySummary,
  buildExpiredStockNotification,
  buildInventoryNotification,
  buildOrderNotification,
  getInventoryNotificationKey,
  getInventoryNotificationKind,
  getNotificationSnackbarVariant,
  parseDashboardNotifications,
  persistDashboardNotifications,
} from "@/shared/utils/notification-center";
import {
  KITCHEN_QUEUE_CHANNEL_NAME,
  KITCHEN_QUEUE_EVENT_STORAGE_KEY,
  type KitchenQueueEvent,
} from "@/shared/utils/kitchen-queue";

const guestPaths = ["/login", "/forgot-password", "/reset-password"];

const NotificationCenterProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const auth = useRecoilValue(authState);
  const { enqueueSnackbar } = useSnackbar();
  const [notifications, setNotifications] = useRecoilState(notificationsState);
  const [, setIsLoading] = useRecoilState(notificationsLoadingState);
  const [, setIsNotificationCenterOpen] = useRecoilState(
    notificationPopoverOpenState,
  );
  const notificationsRef = useRef(notifications);
  const hasHydratedRef = useRef(false);
  const hasFetchedInventoryRef = useRef(false);
  const inventoryStatusRef = useRef<
    Record<
      string,
      Extract<DashboardNotificationKind, "low-stock" | "out-of-stock">
    >
  >({});
  const processedKitchenEventIdsRef = useRef<string[]>([]);

  const isGuestPath = useMemo(() => guestPaths.includes(pathname), [pathname]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedRef.current) {
      return;
    }

    const storedNotifications = parseDashboardNotifications(
      window.localStorage.getItem(NOTIFICATION_STORAGE_KEY),
    );
    notificationsRef.current = storedNotifications;
    setNotifications(storedNotifications);
    hasHydratedRef.current = true;
  }, [setNotifications]);

  useEffect(() => {
    setIsNotificationCenterOpen(false);
  }, [pathname, setIsNotificationCenterOpen]);

  const commitNotifications = useCallback(
    (nextNotifications: typeof notifications) => {
      notificationsRef.current = nextNotifications;
      setNotifications(nextNotifications);
      persistDashboardNotifications(nextNotifications);
    },
    [setNotifications],
  );

  const pushNotification = useCallback(
    (
      nextNotification: (typeof notifications)[number],
      options?: { showToast?: boolean },
    ) => {
      const prevNotifications = notificationsRef.current;
      const existingIndex = prevNotifications.findIndex(
        (notification) => notification.id === nextNotification.id,
      );
      const existingNotification =
        existingIndex >= 0 ? prevNotifications[existingIndex] : null;

      if (
        existingNotification &&
        existingNotification.kind === nextNotification.kind &&
        existingNotification.title === nextNotification.title &&
        existingNotification.description === nextNotification.description
      ) {
        return;
      }

      const mergedNotification = {
        ...existingNotification,
        ...nextNotification,
        read: false,
      };
      const nextNotifications = [
        mergedNotification,
        ...prevNotifications.filter(
          (notification) => notification.id !== nextNotification.id,
        ),
      ];

      commitNotifications(nextNotifications);

      if (options?.showToast === false) {
        return;
      }

      enqueueSnackbar(mergedNotification.title, {
        variant: getNotificationSnackbarVariant(mergedNotification.kind),
        autoHideDuration: mergedNotification.kind === "order" ? 4500 : 5500,
      });
    },
    [commitNotifications, enqueueSnackbar],
  );

  const syncInventoryNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/stock/inventory`,
      );
      const inventoryItems: InventorySummary[] = response.data || [];
      const nextStatuses: typeof inventoryStatusRef.current = {};

      inventoryItems.forEach((item) => {
        if (Number(item.expiredQuantity || 0) > 0) {
          pushNotification(buildExpiredStockNotification(item), {
            showToast: hasFetchedInventoryRef.current,
          });
        }

        const kind = getInventoryNotificationKind(item);
        if (!kind) {
          return;
        }

        const inventoryKey = getInventoryNotificationKey(item);
        nextStatuses[inventoryKey] = kind;

        const previousKind = inventoryStatusRef.current[inventoryKey];
        const shouldCreateNotification =
          !hasFetchedInventoryRef.current ||
          previousKind !== kind ||
          !notificationsRef.current.some(
            (notification) =>
              notification.id === `inventory-${kind}-${inventoryKey}`,
          );

        if (!shouldCreateNotification) {
          return;
        }

        pushNotification(buildInventoryNotification(item, kind), {
          showToast: hasFetchedInventoryRef.current,
        });
      });

      inventoryStatusRef.current = nextStatuses;
      hasFetchedInventoryRef.current = true;
    } catch (error) {
      console.error("Error syncing inventory notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pushNotification, setIsLoading]);

  const syncDailyRevenueNotification = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const now = new Date();
    const todayKey = now.toLocaleDateString("vi-VN");
    const lastNotified = window.localStorage.getItem(DAILY_REVENUE_NOTIFY_KEY);

    if (
      now.getHours() !== 22 ||
      now.getMinutes() > 5 ||
      lastNotified === todayKey
    ) {
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/order`,
      );
      const orders: any[] = response.data || [];
      const todayRevenue = orders
        .filter((order) => {
          const createdAt = new Date(
            order.createdAt || order.created_at || order.date,
          );
          return createdAt.toLocaleDateString("vi-VN") === todayKey;
        })
        .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);

      pushNotification(
        {
          id: `daily-revenue-${todayKey}`,
          title: `Tổng doanh thu ngày ${todayKey}`,
          description: `Doanh thu hôm nay đạt ${todayRevenue.toLocaleString("vi-VN")} đ.`,
          timestamp: now.toISOString(),
          kind: "daily-summary",
          read: false,
        },
        { showToast: true },
      );
      window.localStorage.setItem(DAILY_REVENUE_NOTIFY_KEY, todayKey);
    } catch (error) {
      console.error("Error syncing daily revenue notification:", error);
    }
  }, [pushNotification]);

  const handleKitchenQueueEvent = useCallback(
    (event: KitchenQueueEvent | null | undefined) => {
      if (!event?.id || event.type !== "order-added" || !event.order) {
        return;
      }

      if (event.source !== "simulator") {
        return;
      }

      if (processedKitchenEventIdsRef.current.includes(event.id)) {
        return;
      }

      processedKitchenEventIdsRef.current.push(event.id);
      if (processedKitchenEventIdsRef.current.length > 40) {
        processedKitchenEventIdsRef.current.shift();
      }

      pushNotification(buildOrderNotification(event.order));
    },
    [pushNotification],
  );

  useEffect(() => {
    if (typeof window === "undefined" || isGuestPath) {
      return;
    }

    const token = auth?.accessToken || window.localStorage.getItem("authToken");
    if (!token) {
      return;
    }

    void syncInventoryNotifications();
    void syncDailyRevenueNotification();

    const interval = window.setInterval(() => {
      void syncInventoryNotifications();
      void syncDailyRevenueNotification();
    }, 5000);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === NOTIFICATION_STORAGE_KEY) {
        const syncedNotifications = parseDashboardNotifications(event.newValue);
        notificationsRef.current = syncedNotifications;
        setNotifications(syncedNotifications);
        return;
      }

      if (event.key === KITCHEN_QUEUE_EVENT_STORAGE_KEY && event.newValue) {
        try {
          handleKitchenQueueEvent(
            JSON.parse(event.newValue) as KitchenQueueEvent,
          );
        } catch (error) {
          console.error("Cannot parse kitchen queue event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(KITCHEN_QUEUE_CHANNEL_NAME);
      channel.onmessage = (messageEvent: MessageEvent<KitchenQueueEvent>) => {
        handleKitchenQueueEvent(messageEvent.data);
      };
    }

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [
    auth?.accessToken,
    handleKitchenQueueEvent,
    isGuestPath,
    setNotifications,
    syncDailyRevenueNotification,
    syncInventoryNotifications,
  ]);

  return <>{children}</>;
};

export default NotificationCenterProvider;
