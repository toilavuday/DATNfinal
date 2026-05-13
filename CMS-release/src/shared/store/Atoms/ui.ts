import type { DashboardNotification } from "@/shared/types/notification";
import { atom } from "recoil";

export const notificationPopoverOpenState = atom<boolean>({
  key: "notificationPopoverOpenState",
  default: false,
});

export const notificationsState = atom<DashboardNotification[]>({
  key: "notificationsState",
  default: [],
});

export const notificationsLoadingState = atom<boolean>({
  key: "notificationsLoadingState",
  default: false,
});
