"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CreditCard,
  ReceiptText,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { DatePicker, Spin, Modal } from "antd";
import dayjs, { Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { useSearchParams } from "next/navigation";
import { useGetAllOrder } from "@/shared/hooks/order";
import { Order } from "@/shared/types/order";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const OrderHistory: React.FC = () => {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const defaultDate = useMemo(() => {
    if (dateParam === "today") return dayjs();
    if (dateParam && dayjs(dateParam, "YYYY-MM-DD", true).isValid()) {
      return dayjs(dateParam);
    }
    return null;
  }, [dateParam]);

  const { orders, getAllOrders } = useGetAllOrder();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(defaultDate);

  useEffect(() => {
    setSelectedDate(defaultDate);
  }, [defaultDate]);
  const [searchName, setSearchName] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "qr">(
    "all",
  );
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    await getAllOrders();
    setIsLoading(false);
  }, [getAllOrders]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const sortedOrders = useMemo(
    () =>
      [...(orders as Order[])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    return sortedOrders.filter((order) => {
      const matchesDate = selectedDate
        ? dayjs(order.createdAt).isSame(selectedDate, "day")
        : true;

      const searchValue = searchName.trim().toLowerCase();
      const matchesName = searchValue
        ? order?.user?.name?.toLowerCase().includes(searchValue)
        : true;

      const matchesPayment =
        paymentFilter === "all" ? true : order.paymentMethod === paymentFilter;

      return matchesDate && matchesName && matchesPayment;
    });
  }, [sortedOrders, selectedDate, searchName, paymentFilter]);

  const totalRevenue = filteredOrders.reduce(
    (sum, order) => sum + Number(order.amount || 0),
    0,
  );
  const successOrders = filteredOrders.filter(
    (order) => order.status === "success",
  ).length;
  const qrOrders = filteredOrders.filter(
    (order) => order.paymentMethod === "qr",
  ).length;
  const averageOrderValue = filteredOrders.length
    ? Math.round(totalRevenue / filteredOrders.length)
    : 0;

  const summaryCards = [
    {
      label: "Tổng đơn hàng",
      value: filteredOrders.length,
      icon: <ReceiptText className="h-5 w-5 text-sky-700" />,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Doanh thu lọc",
      value: formatCurrency(totalRevenue),
      icon: <Wallet className="h-5 w-5 text-emerald-700" />,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Đơn thanh toán QR",
      value: qrOrders,
      icon: <CreditCard className="h-5 w-5 text-violet-700" />,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Giá trị trung bình",
      value: formatCurrency(averageOrderValue),
      icon: <TrendingUp className="h-5 w-5 text-amber-700" />,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <section className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.16),_transparent_22%)]" />
          <div className="relative flex flex-col gap-2">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
              <Sparkles className="h-4 w-4" />
              Theo dõi giao dịch
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Lịch sử đơn hàng
            </h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.5)] backdrop-blur"
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}
              >
                {card.icon}
              </div>
              <p className="mt-5 text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Danh sách đơn hàng
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Bộ lọc linh hoạt để tra cứu nhanh theo ngày, nhân viên hoặc
                phương thức thanh toán.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="relative min-w-[230px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên nhân viên"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <DatePicker
                onChange={(date) => setSelectedDate(date)}
                format="YYYY-MM-DD"
                placeholder="Chọn ngày"
                className="h-[50px] rounded-2xl border-slate-200 px-3"
              />

              <select
                value={paymentFilter}
                onChange={(e) =>
                  setPaymentFilter(e.target.value as "all" | "cash" | "qr")
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              >
                <option value="all">Tất cả thanh toán</option>
                <option value="cash">Tiền mặt</option>
                <option value="qr">QR</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spin size="large" />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm cursor-pointer hover:border-sky-300 transition hover:shadow-md"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                          #{order.id}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            order.status === "success"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {order.status === "success"
                            ? "Thành công"
                            : "Thất bại"}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            order.paymentMethod === "cash"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {order.paymentMethod === "cash" ? "Tiền mặt" : "QR"}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                          <div className="rounded-2xl bg-sky-50 p-2 text-sky-700">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Nhân viên
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {order?.user?.name || "Không xác định"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                          <div className="rounded-2xl bg-violet-50 p-2 text-violet-700">
                            <CalendarRange className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Thời gian tạo
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {dayjs(order.createdAt).format(
                                "DD/MM/YYYY HH:mm",
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                          <div className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Tổng thanh toán
                            </p>
                            <p className="text-sm font-semibold text-emerald-600">
                              {formatCurrency(order.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[220px] rounded-[24px] bg-white p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Món đã gọi
                      </p>
                      <div className="mt-3 space-y-2">
                        {order.items.slice(0, 4).map((item) => (
                          <div
                            key={`${order.id}-${item.productId}`}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {item.productName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.quantity} x{" "}
                                {formatCurrency(item.productPrice)}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-sky-700">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <p className="text-xs text-slate-500">
                            +{order.items.length - 4} món khác
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                <ReceiptText className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                Không có đơn hàng phù hợp
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Thử đổi ngày, tên nhân viên hoặc phương thức thanh toán để xem
                thêm kết quả.
              </p>
            </div>
          )}

          {!isLoading && filteredOrders.length > 0 && (
            <div className="mt-6 rounded-[28px] bg-slate-900 p-5 text-white">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-300">Đơn thành công</p>
                  <p className="mt-1 text-2xl font-semibold">{successOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Bộ lọc hiện tại</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {selectedDate
                      ? dayjs(selectedDate).format("DD/MM/YYYY")
                      : "Toàn bộ ngày"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-300">Doanh thu hiển thị</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!selectedOrder}
        onCancel={() => setSelectedOrder(null)}
        footer={null}
        width={340}
        centered
        styles={{ body: { padding: '20px 10px' } }}
      >
        {selectedOrder && (
          <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "12px", color: "#000", padding: "10px" }}>
            <div style={{ textAlign: "center", fontSize: "16px", fontWeight: "bold", marginBottom: "10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ marginBottom: "5px" }}>Coffee Management Store</span>
              <span style={{ fontSize: "14px" }}>Hóa đơn bán hàng</span>
            </div>
            
            <div style={{ marginBottom: "10px", fontSize: "11px", lineHeight: "1.4", width: "100%" }}>
              Mã HĐ: {selectedOrder.id}<br/>
              Khách hàng: {selectedOrder.customerName || "Khách vãng lai"}<br/>
              Bàn/Kênh: {(() => {
                const tableDisplay = selectedOrder.table || "Mang đi";
                const partnerCode = selectedOrder.partnerCode || "";
                const channelLabel = selectedOrder.channelLabel || "";
                const identity = `${partnerCode} ${channelLabel}`.toUpperCase();
                
                if (identity.includes("GRAB") || tableDisplay.toUpperCase().includes("GRAB")) {
                  return `Đơn Grab - ${selectedOrder.displayId || selectedOrder.id}`;
                } else if (partnerCode || channelLabel || selectedOrder.isDeliveryMock) {
                  return `Đơn Đối Tác - ${selectedOrder.displayId || selectedOrder.id}`;
                }
                return tableDisplay;
              })()}<br/>
              Thời gian: {dayjs(selectedOrder.createdAt).format("DD/MM/YYYY HH:mm")}<br/>
              NVBH: {selectedOrder.user?.name || "Hệ thống"}
            </div>
            
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "5px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "3px 0", borderBottom: "1px dashed #000", fontWeight: "bold" }}>Sản phẩm</th>
                  <th style={{ textAlign: "right", padding: "3px 0", borderBottom: "1px dashed #000", fontWeight: "bold" }}>Tổng</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item: any, idx: number) => {
                  const unitPrice = item.productPrice != null ? Number(item.productPrice) : (item.total != null && item.quantity ? Number(item.total) / Number(item.quantity) : 0);
                  const total = item.total != null ? Number(item.total) : unitPrice * Number(item.quantity || 0);
                  return (
                    <tr key={idx}>
                      <td style={{ padding: "3px 0" }}>
                        {item.productName || item.name}
                        <div style={{ display: "flex", fontSize: "10px", marginTop: "2px" }}>
                          <span style={{ paddingRight: "5px" }}>SL: {item.quantity}</span>
                          <span style={{ paddingRight: "5px" }}>x</span>
                          <span>{unitPrice.toLocaleString()}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "3px 0", verticalAlign: "top" }}>
                        {total.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <hr style={{ border: 0, borderTop: "1px dashed #000", width: "100%", margin: "10px 0" }} />
            
            <div style={{ fontSize: "12px", marginBottom: "5px" }}>
              Tổng tiền hàng: {
                selectedOrder.items.reduce((acc: number, item: any) => {
                  const total = item.total != null ? Number(item.total) : (Number(item.productPrice || 0) * Number(item.quantity || 0));
                  return acc + total;
                }, 0).toLocaleString()
              } VND
            </div>
            {(() => {
              const sumItems = selectedOrder.items.reduce((acc: number, item: any) => {
                const total = item.total != null ? Number(item.total) : (Number(item.productPrice || 0) * Number(item.quantity || 0));
                return acc + total;
              }, 0);
              const discount = sumItems > Number(selectedOrder.amount) ? sumItems - Number(selectedOrder.amount) : 0;
              if (discount > 0) {
                return (
                  <div style={{ fontSize: "12px", marginBottom: "5px" }}>
                    Voucher giảm giá: -{discount.toLocaleString()} VND
                  </div>
                );
              }
              return null;
            })()}
            
            <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: "10px" }}>
              Thành tiền: {Number(selectedOrder.amount).toLocaleString()} VND
            </div>
            
            <div style={{ fontSize: "11px", marginTop: "10px" }}>
              Phương thức: {selectedOrder.paymentMethod === "cash" ? "Tiền mặt" : "QR"}
            </div>
            
            <div style={{ fontSize: "10px", textAlign: "center", marginTop: "15px", borderTop: "1px dashed #000", paddingTop: "10px" }}>
              Cảm ơn quý khách và hẹn gặp lại!
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default OrderHistory;
