"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BellRing, ClipboardList, PackageX, ShieldAlert } from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { useNotificationCenter } from "@/shared/hooks/notification-center";
import type {
  DashboardNotification,
  DashboardNotificationKind,
} from "@/shared/types/notification";
import {
  formatNotificationTimestamp,
  getNotificationKindLabel,
} from "@/shared/utils/notification-center";

type NotificationCenterPanelProps = {
  variant?: "compact" | "full";
  className?: string;
};

const notificationKindStyles: Record<
  DashboardNotificationKind,
  {
    icon: React.ComponentType<{ className?: string }>;
    border: string;
    unreadBackground: string;
    iconWrapper: string;
    titleColor: string;
    labelColor: string;
    newBadge: string;
  }
> = {
  order: {
    icon: ClipboardList,
    border: "border-emerald-200",
    unreadBackground: "bg-emerald-50/80",
    iconWrapper: "bg-emerald-100 text-emerald-600",
    titleColor: "text-emerald-700",
    labelColor: "text-emerald-600",
    newBadge: "bg-emerald-500/10 text-emerald-700",
  },
  "low-stock": {
    icon: ShieldAlert,
    border: "border-amber-200",
    unreadBackground: "bg-amber-50/80",
    iconWrapper: "bg-amber-100 text-amber-600",
    titleColor: "text-amber-700",
    labelColor: "text-amber-600",
    newBadge: "bg-amber-500/10 text-amber-700",
  },
  "out-of-stock": {
    icon: PackageX,
    border: "border-rose-200",
    unreadBackground: "bg-rose-50/80",
    iconWrapper: "bg-rose-100 text-rose-600",
    titleColor: "text-rose-700",
    labelColor: "text-rose-600",
    newBadge: "bg-rose-500/10 text-rose-700",
  },
  "expired-stock": {
    icon: PackageX,
    border: "border-red-200",
    unreadBackground: "bg-red-50/80",
    iconWrapper: "bg-red-100 text-red-600",
    titleColor: "text-red-700",
    labelColor: "text-red-600",
    newBadge: "bg-red-500/10 text-red-700",
  },
  "daily-summary": {
    icon: BellRing,
    border: "border-sky-200",
    unreadBackground: "bg-sky-50/80",
    iconWrapper: "bg-sky-100 text-sky-600",
    titleColor: "text-sky-700",
    labelColor: "text-sky-600",
    newBadge: "bg-sky-500/10 text-sky-700",
  },
};

const NotificationCard = ({
  notification,
  onRead,
}: {
  notification: DashboardNotification;
  onRead: (id: string) => void;
}) => {
  const styles = notificationKindStyles[notification.kind];
  const Icon = styles.icon;

  return (
    <button
      type="button"
      onClick={() => onRead(notification.id)}
      className={cn(
        "w-full rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md",
        styles.border,
        notification.read ? "bg-white" : styles.unreadBackground,
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            styles.iconWrapper,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={cn(
                    "text-sm font-semibold leading-6",
                    styles.titleColor,
                  )}
                >
                  {notification.title}
                </h3>
              </div>
              <p
                className={cn(
                  "mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                  styles.labelColor,
                )}
              >
                {getNotificationKindLabel(notification.kind)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {!notification.read && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]",
                    styles.newBadge,
                  )}
                >
                  NEW
                </span>
              )}
              <span className="whitespace-nowrap text-[11px] text-slate-400">
                {formatNotificationTimestamp(notification.timestamp)}
              </span>
            </div>
          </div>

          <p
            className={cn(
              "mt-2 text-sm leading-6",
              notification.read ? "text-slate-500" : "text-slate-700",
            )}
          >
            {notification.description}
          </p>
        </div>
      </div>
    </button>
  );
};

const NotificationCenterPanel = ({
  variant = "full",
  className,
}: NotificationCenterPanelProps) => {
  const { notifications, loading, unreadCount, markAsRead, setIsNotificationCenterOpen } =
    useNotificationCenter();
  const isCompact = variant === "compact";
  const router = useRouter();

  const handleNotificationClick = (notification: DashboardNotification) => {
    markAsRead(notification.id);
    if (isCompact && setIsNotificationCenterOpen) {
      setIsNotificationCenterOpen(false);
    }

    if (notification.kind === "daily-summary") {
      const date = dayjs(notification.timestamp).format("YYYY-MM-DD");
      router.push(`/orders/history?date=${date}`);
    } else if (
      notification.kind === "low-stock" ||
      notification.kind === "out-of-stock" ||
      notification.kind === "expired-stock"
    ) {
      router.push("/inventory");
    } else if (notification.kind === "order") {
      router.push("/orders?tab=kitchen");
    }
  };

  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/92 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur",
        isCompact
          ? "flex min-h-0 w-full flex-col"
          : "flex h-full min-h-0 flex-col",
        className,
      )}
    >
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">
              Thông báo hệ thống
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi đơn mới và tình trạng nguyên liệu theo thời gian thực.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
            {unreadCount} mới
          </div>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 w-full",
          isCompact
            ? "notification-scrollable overflow-y-auto p-4 pr-2 max-h-[calc(100vh_-_200px)]"
            : "flex-1 overflow-y-auto p-4 sm:p-5 max-h-[80vh]",
        )}
      >
        {loading && notifications.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            Đang tải thông báo...
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onRead={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm">
              <BellRing className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-800">
              Chưa có thông báo mới
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Khi có đơn mới hoặc nguyên liệu xuống mức cảnh báo, thông báo sẽ
              hiện ở đây.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenterPanel;
