"use client";

import { useCallback, useMemo } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  notificationPopoverOpenState,
  notificationsLoadingState,
  notificationsState,
} from "@/shared/store/Atoms/ui";
import { persistDashboardNotifications } from "@/shared/utils/notification-center";

export const useNotificationCenter = () => {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] =
    useRecoilState(notificationPopoverOpenState);
  const [notifications, setNotifications] = useRecoilState(notificationsState);
  const loading = useRecoilValue(notificationsLoadingState);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  const toggleNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen((prev) => !prev);
  }, [setIsNotificationCenterOpen]);

  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const updated = prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification,
        );
        persistDashboardNotifications(updated);
        return updated;
      });
    },
    [setNotifications],
  );

  return {
    isNotificationCenterOpen,
    setIsNotificationCenterOpen,
    toggleNotificationCenter,
    notifications,
    loading,
    unreadCount,
    markAsRead,
  };
};
