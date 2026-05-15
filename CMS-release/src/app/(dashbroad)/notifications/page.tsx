"use client";

import React, { useMemo, useState } from "react";
import { DatePicker, Segmented, Spin } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import {
  BellDot,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Inbox,
  PackageX,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import ProtectedRoute from "@/shared/providers/auth.provider";
import { useNotificationCenter } from "@/shared/hooks/notification-center";
import type {
  DashboardNotification,
  DashboardNotificationKind,
} from "@/shared/types/notification";
import {
  formatNotificationTimestamp,
  getNotificationKindLabel,
} from "@/shared/utils/notification-center";

type NotificationFilter = "all" | "unread" | "read" | "important";

const IMPORTANT_NOTIFICATION_KINDS: DashboardNotificationKind[] = [
  "low-stock",
  "out-of-stock",
  "expired-stock",
];

const isImportantNotification = (notification: DashboardNotification) =>
  IMPORTANT_NOTIFICATION_KINDS.includes(notification.kind);

const notificationKindStyles: Record<
  DashboardNotificationKind,
  {
    icon: React.ComponentType<{ className?: string }>;
    border: string;
    background: string;
    iconWrapper: string;
    titleColor: string;
    labelColor: string;
  }
> = {
  order: {
    icon: ClipboardList,
    border: "border-emerald-200",
    background: "bg-emerald-50/70",
    iconWrapper: "bg-emerald-100 text-emerald-600",
    titleColor: "text-emerald-700",
    labelColor: "text-emerald-600",
  },
  "low-stock": {
    icon: ShieldAlert,
    border: "border-amber-200",
    background: "bg-amber-50/80",
    iconWrapper: "bg-amber-100 text-amber-600",
    titleColor: "text-amber-700",
    labelColor: "text-amber-600",
  },
  "out-of-stock": {
    icon: PackageX,
    border: "border-rose-200",
    background: "bg-rose-50/80",
    iconWrapper: "bg-rose-100 text-rose-600",
    titleColor: "text-rose-700",
    labelColor: "text-rose-600",
  },
  "expired-stock": {
    icon: PackageX,
    border: "border-red-200",
    background: "bg-red-50/80",
    iconWrapper: "bg-red-100 text-red-600",
    titleColor: "text-red-700",
    labelColor: "text-red-600",
  },
  "daily-summary": {
    icon: BellRing,
    border: "border-sky-200",
    background: "bg-sky-50/80",
    iconWrapper: "bg-sky-100 text-sky-600",
    titleColor: "text-sky-700",
    labelColor: "text-sky-600",
  },
};

const NotificationManagementPage = () => {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead } =
    useNotificationCenter();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [notifications],
  );

  const readCount = notifications.length - unreadCount;
  const importantCount = useMemo(
    () => notifications.filter(isImportantNotification).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return sortedNotifications.filter((notification) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !notification.read) ||
        (filter === "read" && notification.read) ||
        (filter === "important" && isImportantNotification(notification));

      const matchesDate = selectedDate
        ? dayjs(notification.timestamp).isSame(selectedDate, "day")
        : true;

      const label = getNotificationKindLabel(notification.kind);
      const matchesSearch = searchValue
        ? `${notification.title} ${notification.description} ${label}`
            .toLowerCase()
            .includes(searchValue)
        : true;

      return matchesFilter && matchesDate && matchesSearch;
    });
  }, [filter, searchTerm, selectedDate, sortedNotifications]);

  const summaryCards = [
    {
      label: "Tổng thông báo",
      value: notifications.length,
      icon: <BellRing className="h-5 w-5 text-indigo-700" />,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Chưa đọc",
      value: unreadCount,
      icon: <BellDot className="h-5 w-5 text-sky-700" />,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Đã đọc",
      value: readCount,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-700" />,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Quan trọng",
      value: importantCount,
      icon: <ShieldAlert className="h-5 w-5 text-rose-700" />,
      tone: "bg-rose-50 text-rose-700",
    },
  ];

  const filterOptions = [
    { label: `Tất cả (${notifications.length})`, value: "all" },
    { label: `Chưa đọc (${unreadCount})`, value: "unread" },
    { label: `Đã đọc (${readCount})`, value: "read" },
    { label: `Quan trọng (${importantCount})`, value: "important" },
  ];

  const getNotificationTarget = (notification: DashboardNotification) => {
    if (notification.kind === "daily-summary") {
      const date = dayjs(notification.timestamp).format("YYYY-MM-DD");
      return `/orders/history?date=${date}`;
    }

    if (
      notification.kind === "low-stock" ||
      notification.kind === "out-of-stock" ||
      notification.kind === "expired-stock"
    ) {
      return "/inventory";
    }

    if (notification.kind === "order") {
      return "/orders?tab=kitchen";
    }

    return null;
  };

  const handleOpenNotification = (notification: DashboardNotification) => {
    markAsRead(notification.id);
    const target = getNotificationTarget(notification);

    if (target) {
      router.push(target);
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <section className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex w-full flex-col gap-4">
          <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(244,63,94,0.16),_transparent_22%)]" />
            <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                  <Sparkles className="h-4 w-4" />
                  Quản lý cửa hàng
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Quản lý thông báo
                </h1>
              </div>

              <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                {filteredNotifications.length} kết quả
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/85 px-4 py-3.5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)] backdrop-blur"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}
                >
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Danh sách thông báo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Lọc nhanh theo trạng thái, mức độ quan trọng và ngày phát sinh.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px] xl:min-w-[560px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm theo tiêu đề hoặc nội dung"
                    className="h-[50px] w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  format="DD/MM/YYYY"
                  placeholder="Tìm theo ngày"
                  suffixIcon={<CalendarDays className="h-4 w-4 text-slate-400" />}
                  className="h-[50px] rounded-2xl border-slate-200 px-3"
                />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto pb-1">
              <Segmented
                value={filter}
                onChange={(value) => setFilter(value as NotificationFilter)}
                options={filterOptions}
                className="rounded-2xl bg-slate-100 p-1"
              />
            </div>

            {loading && notifications.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <Spin size="large" />
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {filteredNotifications.map((notification) => {
                  const styles = notificationKindStyles[notification.kind];
                  const Icon = styles.icon;
                  const isImportant = isImportantNotification(notification);

                  return (
                    <article
                      key={notification.id}
                      className={`rounded-[26px] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                        notification.read ? "border-slate-200 bg-white" : `${styles.border} ${styles.background}`
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div
                            className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrapper}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`text-base font-semibold ${styles.titleColor}`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                  Mới
                                </span>
                              )}
                              {isImportant && (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">
                                  Quan trọng
                                </span>
                              )}
                            </div>

                            <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.16em] ${styles.labelColor}`}>
                              {getNotificationKindLabel(notification.kind)}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {notification.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500">
                            {formatNotificationTimestamp(notification.timestamp)}
                          </span>

                          {!notification.read && (
                            <button
                              type="button"
                              onClick={() => markAsRead(notification.id)}
                              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
                            >
                              Đánh dấu đã đọc
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenNotification(notification)}
                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Mở
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                  <Inbox className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  Không có thông báo phù hợp
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Thử đổi trạng thái, từ khóa hoặc ngày để xem thêm kết quả.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default NotificationManagementPage;
