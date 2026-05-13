"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  History,
  Minus,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button, Image, Modal, Popconfirm } from "antd";
import axios from "axios";
import Link from "next/link";
import { authState } from "@/shared/store/Atoms/auth";
import dayjs from "dayjs";
import { CartItem, Product } from "@/shared/types/product";
import { productState, selectedBrandState } from "@/shared/store/Atoms/product";
import { enqueueSnackbar } from "notistack";
import { useGetProduct } from "@/shared/hooks/product";
import {
  emitKitchenQueueEvent,
  KITCHEN_QUEUE_CHANNEL_NAME,
  KITCHEN_QUEUE_EVENT_STORAGE_KEY,
  KITCHEN_QUEUE_STORAGE_KEY,
  parseKitchenOrders,
  persistKitchenOrders,
  removeKitchenOrder,
  type KitchenQueueEvent,
  type KitchenQueueOrder,
  upsertKitchenOrder,
} from "@/shared/utils/kitchen-queue";

const defaultImage =
  "https://png.pngtree.com/png-vector/20190710/ourmid/pngtree-user-vector-avatar-png-image_1541962.jpg";
const invoiceLogoUrl =
  process.env.NEXT_PUBLIC_INVOICE_LOGO_URL || "/images/logo.png";

const tableOptions = ["VIP 1", "VIP 2", "Sân vườn", "Mang đi"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const renderTabLabel = (
  label: string,
  count?: number,
  badgeColor = "#0ea5e9",
  shortLabel?: string,
) => (
  <div className="inline-flex items-center gap-2 whitespace-nowrap">
    <span className="sm:hidden">{shortLabel || label}</span>
    <span className="hidden sm:inline">{label}</span>
    {count ? (
      <span
        className="inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
        style={{ backgroundColor: badgeColor }}
      >
        {count}
      </span>
    ) : null}
  </div>
);

const buildPendingOrder = (
  authUserId: string | undefined,
  cart: CartItem[],
  amount: number,
  method: "cash" | "qr",
  table: string,
  id: string,
  customerName?: string,
) => ({
  id,
  userId: authUserId,
  customerName,
  items: cart.map((item) => ({
    productId: item.id,
    quantity: item.quantity,
  })),
  amount,
  paymentMethod: method,
  table,
});

const generateObjectId = () => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomHex = [...Array(16)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
  return timestamp + randomHex;
};

type VoucherType = "PERCENT" | "FIXED";

type Voucher = {
  code: string;
  type: VoucherType;
  value: number;
  minOrder: number;
  quantity: number;
  expiresOn: string;
};

const VOUCHER_STOCK_STORAGE_KEY = "voucherStockByCode";

const FALLBACK_VOUCHERS: Voucher[] = [
  {
    code: "GIAM10_50K",
    type: "PERCENT",
    value: 10,
    minOrder: 50000,
    quantity: 100,
    expiresOn: "2026-12-31",
  },
  {
    code: "GIAM20K",
    type: "FIXED",
    value: 20000,
    minOrder: 100000,
    quantity: 50,
    expiresOn: "2026-12-31",
  },
  {
    code: "GRAB50",
    type: "PERCENT",
    value: 50,
    minOrder: 0,
    quantity: 500,
    expiresOn: "2026-12-31",
  },
  {
    code: "FREESHIP",
    type: "FIXED",
    value: 15000,
    minOrder: 50000,
    quantity: 100,
    expiresOn: "2026-03-31",
  },
];

const normalizeVoucherType = (rawType: string): VoucherType | null => {
  if (rawType === "PERCENT" || rawType === "FIXED") {
    return rawType;
  }
  return null;
};

const parseVoucherCsvData = (csvText: string): Voucher[] => {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(",").map((cell) => cell.trim());
  const indexes = {
    code: header.indexOf("MaGiamGia"),
    type: header.indexOf("LoaiKhuyenMai"),
    value: header.indexOf("GiaTriGiam"),
    minOrder: header.indexOf("DieuKienTongTienToiThieu"),
    quantity: header.indexOf("SoLuong"),
    expiresOn: header.indexOf("HanSuDung"),
  };

  if (
    Object.values(indexes).some((indexValue) => indexValue < 0)
  ) {
    return [];
  }

  const vouchers: Voucher[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((cell) => cell.trim());
    const code = cols[indexes.code]?.toUpperCase();
    const type = normalizeVoucherType(cols[indexes.type] || "");
    const value = Number(cols[indexes.value] || 0);
    const minOrder = Number(cols[indexes.minOrder] || 0);
    const quantity = Number(cols[indexes.quantity] || 0);
    const expiresOn = cols[indexes.expiresOn] || "";

    if (!code || !type || !expiresOn) {
      continue;
    }

    vouchers.push({
      code,
      type,
      value: Number.isFinite(value) ? value : 0,
      minOrder: Number.isFinite(minOrder) ? minOrder : 0,
      quantity:
        Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0,
      expiresOn,
    });
  }

  return vouchers;
};

const OrderPage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingOrderId, setPendingOrderId] = useState(generateObjectId);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenQueueOrder[]>(
    () => {
      if (typeof window !== "undefined") {
        return parseKitchenOrders(
          window.localStorage.getItem(KITCHEN_QUEUE_STORAGE_KEY),
        );
      }
      return [];
    },
  );

  const [customerName, setCustomerName] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>(FALLBACK_VOUCHERS);
  const MOCK_VOUCHERS = vouchers;
  const [voucherStockByCode, setVoucherStockByCode] = useState<
    Record<string, number>
  >({});
  const [holdOrders, setHoldOrders] = useState<
    { id: string; customerName: string; items: CartItem[] }[]
  >(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("holdOrdersQueue");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("holdOrdersQueue", JSON.stringify(holdOrders));
    }
  }, [holdOrders]);

  useEffect(() => {
    let mounted = true;

    const loadVouchersFromCsv = async () => {
      try {
        const response = await fetch("/api/vouchers", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }

        const csvText = await response.text();
        const parsedVouchers = parseVoucherCsvData(csvText);

        if (mounted && parsedVouchers.length > 0) {
          setVouchers(parsedVouchers);
        }
      } catch (error) {
        console.error("Cannot load vouchers from CSV:", error);
      }
    };

    void loadVouchersFromCsv();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const defaultStocks = vouchers.reduce<Record<string, number>>(
      (acc, voucher) => {
        acc[voucher.code] = voucher.quantity;
        return acc;
      },
      {},
    );

    if (typeof window === "undefined") {
      setVoucherStockByCode(defaultStocks);
      return;
    }

    try {
      const raw = localStorage.getItem(VOUCHER_STOCK_STORAGE_KEY);
      if (!raw) {
        setVoucherStockByCode(defaultStocks);
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, number>;
      const mergedStocks = vouchers.reduce<Record<string, number>>(
        (acc, voucher) => {
          const saved = Number(parsed[voucher.code]);
          acc[voucher.code] =
            Number.isFinite(saved) && saved >= 0
              ? Math.floor(saved)
              : voucher.quantity;
          return acc;
        },
        {},
      );

      setVoucherStockByCode(mergedStocks);
    } catch {
      setVoucherStockByCode(defaultStocks);
    }
  }, [vouchers]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        VOUCHER_STOCK_STORAGE_KEY,
        JSON.stringify(voucherStockByCode),
      );
    }
  }, [voucherStockByCode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      persistKitchenOrders(kitchenOrders);
    }
  }, [kitchenOrders]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedBrand, setSelectedBrand] = useRecoilState(selectedBrandState);
  const [products, setProducts] = useRecoilState(productState);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const auth = useRecoilValue(authState);
  const [inventoryReport, setInventoryReport] = useState<any[]>([]);

  const [qrModal, setQrModal] = useState<{
    visible: boolean;
    amount: number;
    orderInfo: string;
    orderData: any;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("cart");
  const [highlightedKitchenOrderId, setHighlightedKitchenOrderId] =
    useState("");

  const [canOrder, setCanOrder] = useState<boolean | null>(null);

  useEffect(() => {
    if (!auth?.user) return;
    if (auth.user.role === "ADMIN") {
      setCanOrder(true);
      return;
    }

    const checkShift = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/schedule`);
        const schedules = response.data;
        const now = dayjs();
        const currentHour = now.hour();

        let currentShiftName = "";
        if (currentHour >= 8 && currentHour < 16) {
          currentShiftName = "Ca 1";
        } else if (currentHour >= 16 && currentHour < 24) {
          currentShiftName = "Ca 2";
        } else {
          currentShiftName = "Ca 3";
        }

        const todaySchedules = schedules.filter((s: any) => 
          s.userId === auth?.user?.id && 
          dayjs(s.date).isSame(now, "day") &&
          s.shifts.includes(currentShiftName)
        );

        if (todaySchedules.length > 0) {
          setCanOrder(true);
        } else {
          setCanOrder(false);
        }
      } catch (e) {
        console.error("Error checking shift", e);
        setCanOrder(false);
      }
    };

    void checkShift();
  }, [auth]);

  const isRedirectingPayment = false;
  const { getProduct } = useGetProduct();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const processedKitchenEventIdsRef = React.useRef<string[]>([]);
  const highlightTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  const fetchProductsAndInventory = useCallback(async () => {
    try {
      const fetchedProducts = await getProduct();
      setProducts(fetchedProducts);
      const inventoryRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/stock/inventory`,
      );
      setInventoryReport(inventoryRes.data || []);
    } catch (e) {
      console.error(e);
    }
  }, [getProduct, setProducts]);

  useEffect(() => {
    void fetchProductsAndInventory();
  }, [fetchProductsAndInventory]);

  const playNotificationTone = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    const context = audioContextRef.current;
    if (context.state === "suspended") {
      void context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(740, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }, []);

  const handleKitchenQueueSignal = useCallback(
    (event: KitchenQueueEvent | null | undefined) => {
      if (!event?.id) {
        return;
      }

      if (processedKitchenEventIdsRef.current.includes(event.id)) {
        return;
      }

      processedKitchenEventIdsRef.current.push(event.id);
      if (processedKitchenEventIdsRef.current.length > 40) {
        processedKitchenEventIdsRef.current.shift();
      }

      if (event.type === "order-added" && event.order) {
        setKitchenOrders((prev) => upsertKitchenOrder(prev, event.order!));
        setActiveTab("kitchen");
        setHighlightedKitchenOrderId(event.order.id);

        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }

        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedKitchenOrderId("");
        }, 3200);

        playNotificationTone();
      }

      if (event.type === "order-removed" && event.orderId) {
        setKitchenOrders((prev) => removeKitchenOrder(prev, event.orderId!));
      }
    },
    [playNotificationTone],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === KITCHEN_QUEUE_STORAGE_KEY) {
        setKitchenOrders(parseKitchenOrders(event.newValue));
        return;
      }

      if (event.key === KITCHEN_QUEUE_EVENT_STORAGE_KEY && event.newValue) {
        try {
          handleKitchenQueueSignal(
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
        handleKitchenQueueSignal(messageEvent.data);
      };
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close();
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [handleKitchenQueueSignal]);

  const amount = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart],
  );

  const totalQuantity = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart],
  );

  const isVoucherExpired = useCallback((voucher: Voucher) => {
    const [year, month, day] = voucher.expiresOn.split("-").map(Number);
    if (!year || !month || !day) {
      return true;
    }

    const expiredAt = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    return Date.now() > expiredAt;
  }, []);

  const getVoucherRemaining = useCallback(
    (voucher: Voucher) => {
      const saved = voucherStockByCode[voucher.code];
      if (typeof saved !== "number" || Number.isNaN(saved)) {
        return voucher.quantity;
      }
      return Math.max(0, Math.floor(saved));
    },
    [voucherStockByCode],
  );

  const finalAmount = useMemo(() => {
    if (!appliedVoucher) return amount;
    let total = amount;
    if (appliedVoucher.type === "PERCENT") {
      total -= total * (appliedVoucher.value / 100);
    } else if (appliedVoucher.type === "FIXED") {
      total -= appliedVoucher.value;
    }
    return total > 0 ? total : 0;
  }, [amount, appliedVoucher]);

  const handleApplyVoucher = () => {
    if (!voucherCode) return;
    const v = MOCK_VOUCHERS.find((v) => v.code === voucherCode);
    if (!v) {
      enqueueSnackbar("Mã giảm giá không tồn tại hoặc đã hết hạn", { variant: "error" });
      setAppliedVoucher(null);
      return;
    }
    if (amount < v.minOrder) {
      enqueueSnackbar(`Đơn hàng chưa đạt yêu cầu (tối thiểu ${formatCurrency(v.minOrder)})`, { variant: "warning" });
      setAppliedVoucher(null);
      return;
    }
    setAppliedVoucher(v);
    enqueueSnackbar("Áp dụng mã ưu đãi thành công!", { variant: "success" });
  };

  const handleApplyVoucherWithRules = () => {
    const normalizedVoucherCode = voucherCode.trim().toUpperCase();
    if (!normalizedVoucherCode) return;

    const voucher = vouchers.find(
      (item) => item.code === normalizedVoucherCode,
    );

    if (!voucher) {
      enqueueSnackbar("Mã giảm giá không tồn tại.", { variant: "error" });
      setAppliedVoucher(null);
      return;
    }

    if (isVoucherExpired(voucher)) {
      enqueueSnackbar("Mã này đã hết hạn sử dụng.", { variant: "error" });
      setAppliedVoucher(null);
      return;
    }

    if (getVoucherRemaining(voucher) <= 0) {
      enqueueSnackbar("Mã giảm giá này đã hết hạn.", { variant: "error" });
      setAppliedVoucher(null);
      return;
    }

    if (amount < voucher.minOrder) {
      enqueueSnackbar(
        `Mã giảm giá này bạn phải mua đơn hàng trên ${formatCurrency(voucher.minOrder)}.`,
        { variant: "warning" },
      );
      setAppliedVoucher(null);
      return;
    }

    setAppliedVoucher(voucher);
    setVoucherCode(normalizedVoucherCode);
    enqueueSnackbar("Áp dụng mã ưu đãi thành công!", { variant: "success" });
  };

  const printInvoice = useCallback(
    (orderData: any) => {
      const vietnamTime =
        new Date(orderData.createdAt).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        }) || "Không xác định";

      let tableDisplay = orderData.table || "Mang đi";
      const partnerIdentity = `${orderData.partnerCode || ""} ${orderData.channelLabel || ""}`.toUpperCase();
      if (partnerIdentity.includes("GRAB") || tableDisplay.toUpperCase().includes("GRAB")) {
        tableDisplay = `Đơn Grab - ${orderData.displayId || orderData.id}`;
      } else if (orderData.partnerCode || orderData.channelLabel || orderData.isDeliveryMock) {
        tableDisplay = `Đơn Đối Tác - ${orderData.displayId || orderData.id}`;
      }

      const sumItems = (orderData.items || []).reduce((acc: number, item: any) => {
         const total = item.total != null ? Number(item.total) : (Number(item.productPrice || 0) * Number(item.quantity || 0));
         return acc + total;
      }, 0);
      const discountAmount = sumItems > orderData.amount ? sumItems - orderData.amount : 0;
      const discountHTML = discountAmount > 0 
        ? `<div class="total-amount" style="margin-top: 5px; font-weight: normal; font-size: 12px; text-align: left;">Voucher giảm giá: -${discountAmount.toLocaleString()} VND</div>` 
        : "";

      const invoiceHTML = `
      <html>
        <head>
          <title>HÓA ĐƠN BÁN HÀNG</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              margin: 0;
              padding: 0;
              background-color: #fff;
            }
            .invoice-container {
              width: 220px;
              padding: 10px;
              margin: 0 auto;
              font-size: 12px;
              border: 1px solid #000;
              border-radius: 5px;
              box-shadow: none;
            }
            .invoice-header {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .invoice-details {
              margin-top: 5px;
              display: flex;
              flex-direction: column;
            }
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
            }
            .invoice-table th, .invoice-table td {
              padding: 3px 0;
              border: none;
              text-align: left;
            }
            .invoice-table th {
              font-weight: bold;
              border-bottom: 1px dashed #000;
            }
            .invoice-table td {
              font-size: 12px;
            }
            .total-amount {
              text-align: left;
              margin-top: 10px;
              font-size: 14px;
              font-weight: bold;
            }
            .info-note {
              margin: 5px 0;
              font-size: 11px;
              line-height: 1.4;
              width: 100%;
            }
            .note {
              font-size: 10px;
              text-align: center;
              margin-top: 15px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
            .item-details {
              display: flex;
              align-items: center;
              flex-direction: row;
            }
            .item-details p {
              margin: 0;
              font-size: 10px;
              padding: 0 5px;
            }
            .loading-message {
              text-align: center;
              font-size: 16px;
              color: #333;
              margin-top: 20px;
            }
            .invoice-logo {
              max-width: 120px;
              max-height: 80px;
              object-fit: contain;
              margin-bottom: 5px;
            }
            .text-right {
              text-align: right !important;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
                background-color: #fff;
              }
              .invoice-container {
                box-shadow: none;
                width: 260px;
                margin: 0;
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="loading-message">Đang in hóa đơn...</div>

          <div class="invoice-container">
            <div class="invoice-header">
              <span class="company-name">Coffee Management Store</span>
              <img src="${invoiceLogoUrl}" alt="CMS Coffee Logo" class="invoice-logo" />
              <span class="company-name">Hóa đơn bán hàng</span>
            </div>
            
            <div class="info-note" style="width: 100%;">
              Mã HĐ: ${orderData.id}<br/>
              Khách hàng: ${orderData.customerName || "Khách vãng lai"}<br/>
              Bàn/Kênh: ${tableDisplay}<br/>
              Thời gian: ${vietnamTime}<br/>
              NVBH: ${auth?.user?.name || "Hệ thống"}
            </div>
            
            <div class="invoice-details">
              <table class="invoice-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th class="text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderData.items
                    .map(
                      (item: any) => {
                        const unitPrice = item.productPrice != null ? Number(item.productPrice) : (item.total != null && item.quantity ? Number(item.total) / Number(item.quantity) : 0);
                        const total = item.total != null ? Number(item.total) : unitPrice * Number(item.quantity || 0);
                        return `
                        <tr>
                          <td>${item.productName || item.name}
                            <div class="item-details" style="margin-top: 2px;">
                              <p style="padding-left:0;">SL: ${item.quantity}</p>
                              <p>x</p>
                              <p>${unitPrice.toLocaleString()}</p>
                            </div>
                          </td>
                          <td class="text-right" style="vertical-align: top;">${total.toLocaleString()}</td>
                        </tr>
                        `;
                      }
                    )
                    .join("")}
                </tbody>
              </table>
              <hr style="border: 0; border-top: 1px dashed #000; width: 100%; margin: 10px 0;"/>
              
              <div class="total-amount" style="font-size: 12px; font-weight: normal; margin-top: 0;">
                Tổng tiền hàng: ${sumItems.toLocaleString()} VND
              </div>
              ${discountHTML}
              <div class="total-amount">
                Thành tiền: ${orderData.amount.toLocaleString()} VND
              </div>
              <div class="info-note" style="width: 100%;">
                Phương thức: ${
                  orderData.paymentMethod === "cash" ? "Tiền mặt" : "QR"
                }
              </div>
              
              <div class="note">
                Cảm ơn quý khách và hẹn gặp lại!
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                document.querySelector('.loading-message').style.display = 'none';
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

      const printWindow = window.open("", "", "width=350,height=600");

      if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        enqueueSnackbar("In hóa đơn thành công", {
          variant: "success",
          autoHideDuration: 1500,
        });
      } else {
        enqueueSnackbar("Xảy ra lỗi trong quá trình in hóa đơn", {
          variant: "error",
          autoHideDuration: 1500,
        });
      }
    },
    [auth?.user?.name],
  );

  const isDeliveryKitchenOrder = useCallback((order: KitchenQueueOrder) => {
    const partnerIdentity =
      `${order.partnerCode || ""} ${order.channelLabel || ""}`.toUpperCase();

    return (
      Boolean(order.isDeliveryMock) ||
      partnerIdentity.includes("GRAB") ||
      partnerIdentity.includes("SHOPEE")
    );
  }, []);

  const getKitchenOrderAmount = useCallback((order: KitchenQueueOrder) => {
    if (order.amount != null) {
      return Number(order.amount);
    }

    return (order.items || []).reduce((sum, item) => {
      const itemTotal =
        item.total != null
          ? Number(item.total)
          : Number(item.productPrice || 0) * Number(item.quantity || 0);

      return sum + itemTotal;
    }, 0);
  }, []);

  const handlePrintKitchenOrder = useCallback(
    (order: KitchenQueueOrder) => {
      const normalizedItems = (order.items || []).map((item) => {
        const unitPrice =
          item.productPrice != null
            ? Number(item.productPrice)
            : item.total != null && item.quantity
              ? Number(item.total) / Number(item.quantity)
              : 0;

        return {
          ...item,
          productPrice: unitPrice,
          total:
            item.total != null
              ? Number(item.total)
              : unitPrice * Number(item.quantity || 0),
        };
      });

      printInvoice({
        ...order,
        createdAt: order.createdAt || new Date().toISOString(),
        items: normalizedItems,
        amount: getKitchenOrderAmount(order),
        paymentMethod: "cash",
        table:
          order.table || order.channelLabel || order.partnerCode || "Mang đi",
      });
    },
    [getKitchenOrderAmount, printInvoice],
  );

  const createOrder = useCallback(
    async (orderData: {
      id?: string;
      userId: string | undefined;
      customerName?: string;
      items: { productId: string; quantity: number }[];
      amount: number;
      paymentMethod: "cash" | "qr";
      table: string;
    }) => {
      try {
        setIsCreatingOrder(true);
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/order/add`,
          orderData,
        );

        if (appliedVoucher) {
          // Update local state for immediate UI update
          setVoucherStockByCode((prev) => {
            const currentRemaining =
              typeof prev[appliedVoucher.code] === "number"
                ? prev[appliedVoucher.code]
                : appliedVoucher.quantity;

            return {
              ...prev,
              [appliedVoucher.code]: Math.max(0, currentRemaining - 1),
            };
          });

          // Update Excel file via API
          try {
            await axios.post("/api/vouchers", { code: appliedVoucher.code });
          } catch (err) {
            console.error("Failed to update voucher quantity in CSV:", err);
          }
        }

        setCart([]);
        setSelectedTable("");
        setCustomerName("");
        setAppliedVoucher(null);
        setVoucherCode("");
        setPendingOrderId(generateObjectId());

        const newOrderWithCode: KitchenQueueOrder = {
          ...response.data,
          id: response.data?.id || orderData.id || generateObjectId(),
          customerName: orderData.customerName,
          table: orderData.table,
          items: Array.isArray(response.data?.items) ? response.data.items : [],
        };
        setKitchenOrders((prev) => upsertKitchenOrder(prev, newOrderWithCode));
        emitKitchenQueueEvent({
          type: "order-added",
          source: "pos",
          order: newOrderWithCode,
        });

        enqueueSnackbar("Tạo đơn hàng thành công", {
          variant: "success",
          autoHideDuration: 1500,
        });

        printInvoice({ ...response.data, table: orderData.table });
        await fetchProductsAndInventory();
        return response.data;
      } catch (error) {
        enqueueSnackbar("Xảy ra lỗi khi tạo đơn, vui lòng tạo lại", {
          variant: "error",
          autoHideDuration: 1500,
        });
        console.error("Lỗi tạo đơn hàng:", error);
        return null;
      } finally {
        setIsCreatingOrder(false);
      }
    },
    [printInvoice, fetchProductsAndInventory, appliedVoucher],
  );

  const calculateMaxQuantity = useCallback(
    (product: Product) => {
      if (
        !product.recipe ||
        !Array.isArray(product.recipe) ||
        product.recipe.length === 0
      ) {
        return 999;
      }

      let maxQty = 999999;
      for (const ing of product.recipe) {
        if (!ing.category || !ing.productDetail) continue;
        const amountNeeded = Number(ing.amount);
        if (amountNeeded <= 0) continue;

        const invItem = inventoryReport.find(
          (i: any) =>
            i.category?.trim().toLowerCase() ===
              ing.category.trim().toLowerCase() &&
            i.productDetail?.trim().toLowerCase() ===
              ing.productDetail.trim().toLowerCase(),
        );
        const invQty = invItem ? Number(invItem.quantity) : 0;

        const possible = Math.floor(invQty / amountNeeded);
        if (possible < maxQty) maxQty = possible;
      }

      return maxQty === 999999 ? 999 : maxQty;
    },
    [inventoryReport],
  );

  const canAddToCart = useCallback(
    (product: Product, qtyToAdd: number) => {
      if (
        !product.recipe ||
        !Array.isArray(product.recipe) ||
        product.recipe.length === 0
      )
        return true;

      const requirementsMap: Record<string, number> = {};

      for (const item of cart) {
        const p = products.find((prod) => prod.id === item.id);
        if (p && p.recipe && Array.isArray(p.recipe)) {
          for (const ing of p.recipe) {
            if (!ing.category || !ing.productDetail) continue;
            const key = `${ing.category.trim().toLowerCase()}-${ing.productDetail.trim().toLowerCase()}`;
            requirementsMap[key] =
              (requirementsMap[key] || 0) + Number(ing.amount) * item.quantity;
          }
        }
      }

      for (const ing of product.recipe) {
        if (!ing.category || !ing.productDetail) continue;
        const key = `${ing.category.trim().toLowerCase()}-${ing.productDetail.trim().toLowerCase()}`;
        requirementsMap[key] =
          (requirementsMap[key] || 0) + Number(ing.amount) * qtyToAdd;
      }

      for (const key in requirementsMap) {
        const [cat, detail] = key.split("-");
        const invItem = inventoryReport.find(
          (i: any) =>
            i.category?.trim().toLowerCase() === cat &&
            i.productDetail?.trim().toLowerCase() === detail,
        );
        const invQty = invItem ? Number(invItem.quantity) : 0;

        if (requirementsMap[key] > invQty) {
          return false;
        }
      }

      return true;
    },
    [cart, products, inventoryReport],
  );

  const handleAddToCart = (product: Product) => {
    const maxQtyForThis = calculateMaxQuantity(product);
    if (maxQtyForThis <= 0) {
      enqueueSnackbar("Sản phẩm đã hết hàng", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    if (!canAddToCart(product, 1)) {
      enqueueSnackbar("Nguyên liệu của bạn không đủ để thực hiện", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    setCart((prevCart) => {
      const existingProductIndex = prevCart.findIndex(
        (item) => item.id === product.id,
      );

      if (existingProductIndex === -1) {
        return [...prevCart, { ...product, quantity: 1 }];
      }

      return prevCart.map((item, index) =>
        index === existingProductIndex
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  };

  const handleIncreaseQuantity = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product && !canAddToCart(product, 1)) {
      enqueueSnackbar("Nguyên liệu của bạn không đủ để thực hiện", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const handleDecreaseQuantity = (productId: string) => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item,
      ),
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const handlePayment = async (method: "cash" | "qr") => {
    if (!customerName.trim()) {
      enqueueSnackbar("Vui lòng nhập tên khách hàng trước khi thanh toán!", {
        variant: "warning",
        autoHideDuration: 2000,
      });
      return;
    }

    if (cart.length === 0) {
      enqueueSnackbar("Giỏ hàng hiện đang trống.", {
        variant: "info",
        autoHideDuration: 1500,
      });
      return;
    }

    if (!selectedTable) {
      enqueueSnackbar("Vui lòng chọn bàn trước khi thanh toán!", {
        variant: "info",
        autoHideDuration: 1500,
      });
      return;
    }

    const orderData = buildPendingOrder(
      auth?.user?.id,
      cart,
      finalAmount,
      method,
      selectedTable,
      pendingOrderId,
      customerName,
    );

    if (method === "cash") {
      await createOrder(orderData);
      return;
    }

    const orderInfo = `CMS${Math.floor(Math.random() * 1000000)}`;
    setQrModal({
      visible: true,
      amount: finalAmount,
      orderInfo,
      orderData,
    });
  };

  const handleHoldOrder = () => {
    if (!customerName.trim()) {
      enqueueSnackbar(
        "Vui lòng nhập tên khách hàng trước khi đưa vào hàng chờ!",
        { variant: "warning", autoHideDuration: 2000 },
      );
      return;
    }
    if (cart.length === 0) {
      enqueueSnackbar("Giỏ hàng trống, không thể thêm vào hàng chờ", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }
    const newHold = {
      id: pendingOrderId,
      customerName: customerName.trim(),
      items: cart,
    };
    setHoldOrders((prev) => [...prev, newHold]);
    setCart([]);
    setCustomerName("");
    setPendingOrderId(generateObjectId());
    enqueueSnackbar("Đã thêm vào danh sách chờ", {
      variant: "success",
      autoHideDuration: 1500,
    });
  };

  const handleRestoreHold = (hold: any) => {
    if (cart.length > 0) {
      enqueueSnackbar(
        "Vui lòng hoàn thành đơn hiện tại trước khi tiếp tục đơn khác",
        { variant: "warning", autoHideDuration: 2500 },
      );
      return;
    }
    setCart(hold.items);
    if (!hold.customerName.startsWith("Khách - ")) {
      setCustomerName(hold.customerName);
    } else {
      setCustomerName("");
    }
    setPendingOrderId(hold.id);
    setHoldOrders((prev) => prev.filter((h) => h.id !== hold.id));
    setActiveTab("cart");
  };

  const handleDeleteHold = (holdId: string) => {
    setHoldOrders((prev) => prev.filter((h) => h.id !== holdId));
  };

  const handleCompleteKitchenOrder = useCallback((orderId: string) => {
    setKitchenOrders((prev) => removeKitchenOrder(prev, orderId));
    emitKitchenQueueEvent({
      type: "order-removed",
      source: "pos",
      orderId,
    });
  }, []);

  useEffect(() => {
    if (!qrModal?.visible) return;

    let isPolling = true;
    const interval = setInterval(async () => {
      if (!isPolling) return;
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/order/check-payment/${qrModal.orderInfo}/${qrModal.amount}`,
        );
        if (res.data?.success) {
          isPolling = false;
          clearInterval(interval);
          createOrder(qrModal.orderData);
          setQrModal(null);
          enqueueSnackbar("Khách đã chuyển khoản thành công!", {
            variant: "success",
            autoHideDuration: 3000,
          });
        }
      } catch (error) {
        console.error("Lỗi kiểm tra QR:", error);
      }
    }, 3000);

    return () => {
      isPolling = false;
      clearInterval(interval);
    };
  }, [qrModal, createOrder]);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const resultCode = searchParams.get("resultCode");

        if (resultCode !== "0") return;

        const pendingOrder = localStorage.getItem("pendingOrder");
        if (!pendingOrder) return;

        enqueueSnackbar("Thanh toán thành công!", { variant: "success" });
        const orderData = JSON.parse(pendingOrder);

        const createdOrder = await createOrder(orderData);
        if (createdOrder) {
          localStorage.removeItem("pendingOrder");
        }

        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (error) {
        console.error("Lỗi kiểm tra thanh toán:", error);
      }
    };

    void checkPaymentStatus();
  }, [createOrder]);

  const dynamicCategories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => p.category || "Cà phê")),
    );
    return cats.length > 0 ? cats : ["Cà phê", "Nước ép", "Đồ ăn vặt"];
  }, [products]);

  useEffect(() => {
    if (!selectedBrand && dynamicCategories.length > 0) {
      setSelectedBrand(dynamicCategories[0]);
    }
  }, [selectedBrand, setSelectedBrand, dynamicCategories]);

  const productsByCategory = useMemo(() => {
    const filtered = products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    );

    const grouped: Record<string, Product[]> = {};
    dynamicCategories.forEach((b) => (grouped[b] = []));

    filtered.forEach((p) => {
      const cat = p.category || "Cà phê";
      if (grouped[cat]) grouped[cat].push(p);
      else grouped[cat] = [p];
    });

    for (const cat in grouped) {
      grouped[cat].sort((a, b) => {
        const isOutA = calculateMaxQuantity(a) <= 0;
        const isOutB = calculateMaxQuantity(b) <= 0;
        if (isOutA && !isOutB) return 1;
        if (!isOutA && isOutB) return -1;

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return grouped;
  }, [products, searchTerm, dynamicCategories, calculateMaxQuantity]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;

    let activeBrand = selectedBrand;
    for (const brand of dynamicCategories) {
      const el = document.getElementById(`category-${brand}`);
      if (el) {
        if (el.offsetTop <= container.scrollTop + 60) {
          activeBrand = brand;
        }
      }
    }

    if (activeBrand !== selectedBrand) {
      setSelectedBrand(activeBrand);
    }
  }, [dynamicCategories, selectedBrand, setSelectedBrand]);

  if (canOrder === false) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <div className="max-w-md w-full rounded-[32px] border border-white/70 bg-white/90 p-8 text-center shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-slate-800">Ngoài ca làm việc</h2>
          <p className="mb-8 text-slate-600">Bạn chỉ có thể sử dụng chức năng bán hàng khi đang trong ca làm việc của mình. Vui lòng kiểm tra lại lịch làm việc.</p>
          <Link href="/workschedules" className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800">
            Xem lịch làm việc
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="h-[calc(100dvh-120px)] overflow-y-auto bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 xl:overflow-hidden sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 xl:h-full">
        <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.16),_transparent_22%)]" />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                <Sparkles className="h-4 w-4" />
                Bán hàng tại quầy
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/orders/history">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  <History className="h-4 w-4" />
                  Lịch sử tạo đơn
                </button>
              </Link>
              <button
                type="button"
                onClick={() => setCart([])}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <Trash2 className="h-4 w-4" />
                Xóa giỏ hàng
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.55fr)_420px]">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6 xl:min-h-0 xl:flex xl:flex-col">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Danh sách sản phẩm
                </h2>
              </div>
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 overflow-x-auto custom-scrollbar pb-2">
              {dynamicCategories.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => {
                    setSelectedBrand(brand);
                    const el = document.getElementById(`category-${brand}`);
                    if (el && scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTo({
                        top: el.offsetTop,
                        behavior: "smooth",
                      });
                    }
                  }}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedBrand === brand
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>

            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="relative mt-4 space-y-8 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-2 custom-scrollbar"
            >
              {dynamicCategories.map((brand) => {
                const cats = productsByCategory[brand] || [];
                if (cats.length === 0) return null;
                return (
                  <div
                    key={brand}
                    id={`category-${brand}`}
                    className="scroll-mt-4"
                  >
                    <h3 className="sticky top-[-1px] z-10 bg-white/95 pb-3 pt-2 backdrop-blur text-lg font-bold text-slate-800">
                      {brand}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {cats.map((product) => {
                        const maxPossible = calculateMaxQuantity(product);
                        const isOutOfStock = maxPossible <= 0;

                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            disabled={isOutOfStock}
                            className={`group overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-sm transition ${
                              isOutOfStock
                                ? "cursor-not-allowed opacity-60 grayscale-[0.8]"
                                : "hover:-translate-y-1 hover:shadow-xl"
                            }`}
                          >
                            <div className="relative h-28 overflow-hidden bg-slate-100">
                              <Image
                                src={
                                  typeof product.image === "string" &&
                                  product.image
                                    ? product.image
                                    : defaultImage
                                }
                                alt={product.name}
                                preview={false}
                                style={{ width: "100%", height: "100%" }}
                                className={`object-cover transition duration-300 ${isOutOfStock ? "" : "group-hover:scale-105"}`}
                              />
                              <div className="absolute left-2 top-2 z-20 inline-flex rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                {product.category || "Cà phê"}
                              </div>
                              {isOutOfStock && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
                                  <span className="rounded-full bg-rose-500 px-3 py-1 text-[11px] font-bold text-white shadow-md">
                                    Đã hết nguyên liệu
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 p-3">
                              <div>
                                <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                                  {product.name}
                                </h3>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[13px] font-semibold text-sky-700">
                                  {formatCurrency(product.price)}
                                </p>
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                                  <Plus className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {Object.values(productsByCategory).every(
                (arr) => arr.length === 0,
              ) && (
                <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
                </div>
              )}
            </div>
          </div>

          <aside className="min-w-0 space-y-6 xl:min-h-0">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-4 sm:p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur xl:flex xl:h-full xl:min-h-0 xl:flex-col custom-scrollbar overflow-y-auto">
                <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-3 border-b border-slate-100 bg-white/95 px-4 pt-2 pb-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-3">
                  <div className="grid grid-cols-3 gap-2 rounded-[24px] bg-slate-100/90 p-1.5">
                    {[
                      {
                        key: "cart",
                        label: renderTabLabel(
                          "Tạo hóa đơn",
                          0,
                          "#0ea5e9",
                          "Tạo đơn",
                        ),
                      },
                      {
                        key: "hold",
                        label: renderTabLabel(
                          "Chờ bổ sung",
                          holdOrders.length,
                          "#f97316",
                          "Chờ",
                        ),
                      },
                      {
                        key: "kitchen",
                        label: renderTabLabel(
                          "Hóa đơn đang làm",
                          kitchenOrders.length,
                          "#10b981",
                          "Đang làm",
                        ),
                      },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex min-h-[48px] items-center justify-center rounded-2xl px-2 py-2 text-center text-[13px] font-semibold transition sm:px-3 border-b-[3px] ${
                          activeTab === tab.key
                            ? `bg-white shadow-sm ${
                                tab.key === "cart"
                                  ? "border-sky-500 text-sky-600"
                                  : tab.key === "hold"
                                    ? "border-orange-500 text-orange-600"
                                    : "border-emerald-500 text-emerald-600"
                              }`
                            : "border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === "cart" && (
                  <div className="flex flex-col h-full xl:min-h-0 xl:flex-1">
                    <div className="mb-4 flex items-center justify-between rounded-2xl bg-indigo-50 px-4 py-3 border border-indigo-100">
                      <span className="text-sm font-medium text-slate-800">
                        Mã đơn hàng:
                      </span>
                      <span className="font-bold text-indigo-700 font-mono text-[13px] tracking-wide">
                        #{pendingOrderId}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-600 mb-2">
                        Tên khách hàng
                      </p>
                      <input
                        type="text"
                        placeholder="Nhập tên khách hàng (Bắt buộc)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        Chọn bàn phục vụ
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {tableOptions.map((table) => (
                          <button
                            key={table}
                            type="button"
                            onClick={() => setSelectedTable(table)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              selectedTable === table
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {table}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 space-y-3 xl:pr-2">
                      {cart.length === 0 ? (
                        <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                            <ShoppingBag className="h-8 w-8" />
                          </div>
                          <h3 className="mt-4 text-base font-semibold text-slate-900">
                            Giỏ hàng đang trống
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Thêm sản phẩm từ danh sách bên trái để bắt đầu tạo
                            đơn hàng.
                          </p>
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-[28px] border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex gap-3">
                              <Image
                                src={
                                  typeof item.image === "string" && item.image
                                    ? item.image
                                    : defaultImage
                                }
                                alt={item.name}
                                preview={false}
                                style={{ width: "72px", height: "72px" }}
                                className="rounded-2xl object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                                      {item.name}
                                    </h3>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {item.category || "Cà phê"}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveFromCart(item.id)
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm transition hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-3">
                                  <div className="inline-flex items-center gap-2 rounded-full bg-white p-1 shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDecreaseQuantity(item.id)
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="min-w-[28px] text-center text-sm font-semibold text-slate-900">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleIncreaseQuantity(item.id)
                                      }
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="text-right">
                                    <p className="text-xs text-slate-500">
                                      {formatCurrency(item.price)} x{" "}
                                      {item.quantity}
                                    </p>
                                    <p className="text-sm font-semibold text-sky-700">
                                      {formatCurrency(
                                        item.price * item.quantity,
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {cart.length > 0 && (
                      <>
                        <div className="mt-6 flex flex-col gap-3">
                          <div className="flex gap-2 relative">
                            <input
                              type="text"
                              placeholder="Mã ưu đãi / Grab Code..."
                              value={voucherCode}
                              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                              className="flex-1 rounded-[14px] border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none uppercase font-bold transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 placeholder:normal-case placeholder:font-normal"
                            />
                            <button onClick={handleApplyVoucherWithRules} className="h-full px-5 rounded-[14px] bg-slate-900 text-white font-semibold flex items-center justify-center transition hover:bg-slate-800">
                                Áp dụng
                            </button>
                          </div>
                          {appliedVoucher && (
                            <div className="flex justify-between items-center rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-100">
                              <span className="text-sm font-medium text-emerald-800">Mã: <span className="font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-lg">{appliedVoucher.code}</span></span>
                              <button onClick={() => setAppliedVoucher(null)} className="text-sm font-bold text-rose-500 hover:text-rose-600 transition">Bỏ chọn</button>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 rounded-[28px] bg-slate-900 p-5 text-white">
                          <div className="flex items-center justify-between text-sm text-slate-300">
                            <span>Tổng sản phẩm</span>
                            <span>{totalQuantity} món</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                            <span>Bàn phục vụ</span>
                            <span>{selectedTable || "Chưa chọn"}</span>
                          </div>
                          <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
                            <div>
                              <p className="text-sm text-slate-300">
                                Tổng thanh toán
                              </p>
                              <p className="mt-1 text-3xl font-semibold text-emerald-400">
                                {formatCurrency(finalAmount)}
                                {appliedVoucher && (
                                  <span className="text-[17px] line-through text-slate-500 ml-3">{formatCurrency(amount)}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Button
                              onClick={() => void handlePayment("cash")}
                              disabled={isCreatingOrder || isRedirectingPayment}
                              className="h-11 rounded-2xl border-none bg-slate-900 text-[13px] font-semibold text-white hover:!bg-slate-800"
                            >
                              Thanh toán tiền mặt
                            </Button>
                            <Button
                              onClick={() => void handlePayment("qr")}
                              disabled={isCreatingOrder || isRedirectingPayment}
                              className="h-11 rounded-2xl border-none bg-emerald-500 text-[13px] font-semibold text-white hover:!bg-emerald-400"
                            >
                              {isRedirectingPayment
                                ? "Đang chuyển..."
                                : "Thanh toán QR"}
                            </Button>
                          </div>
                          <Button
                            onClick={handleHoldOrder}
                            disabled={isCreatingOrder || cart.length === 0}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:!bg-slate-50 hover:!text-slate-900 shadow-sm"
                          >
                            Thêm vào danh sách chờ bổ sung
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "hold" && (
                  <div className="flex flex-col gap-3">
                    {holdOrders.length === 0 ? (
                      <div className="mt-4 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                        <h3 className="text-base font-semibold text-slate-900">
                          Không có hóa đơn nào đang chờ
                        </h3>
                      </div>
                    ) : (
                      holdOrders.map((hold) => (
                        <div
                          key={hold.id}
                          className="p-4 border border-rose-200 rounded-[24px] bg-rose-50/50 shadow-sm flex flex-col gap-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-800 text-[13px]">
                                Khách:{" "}
                                <span className="text-sky-700">
                                  {hold.customerName}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Mã: #{hold.id}
                              </p>
                            </div>
                          </div>
                          <div className="text-[13px] text-slate-600 bg-white rounded-xl p-3 border border-rose-100 flex flex-col gap-1.5">
                            {hold.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between font-medium"
                              >
                                <span className="flex-1 text-slate-700 line-clamp-1 pr-2">
                                  <span className="text-rose-500 font-bold w-5 inline-block">
                                    {item.quantity} x
                                  </span>{" "}
                                  {item.name}
                                </span>
                              </div>
                            ))}
                            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between font-bold text-sky-700">
                              <span>Tổng tiền:</span>
                              <span>
                                {formatCurrency(
                                  hold.items.reduce(
                                    (s, i) => s + i.price * i.quantity,
                                    0,
                                  ),
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteHold(hold.id)}
                              className="flex-1 py-2 rounded-xl border border-rose-200 bg-white text-rose-600 text-xs font-bold hover:bg-rose-50 transition"
                            >
                              Hủy bỏ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRestoreHold(hold)}
                              className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm"
                            >
                              Tiếp tục mua
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === "kitchen" && (
                  <div className="flex flex-col gap-3">
                    {kitchenOrders.length === 0 ? (
                      <div className="mt-4 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                        <h3 className="text-base font-semibold text-slate-900">
                          Không có hóa đơn đang làm
                        </h3>
                      </div>
                    ) : (
                      kitchenOrders.map((order) => (
                        <div
                          key={order.id}
                          className={`flex flex-col gap-2 rounded-[24px] border p-4 shadow-sm transition-all ${
                            order.isDeliveryMock
                              ? "border-emerald-200 bg-emerald-50/80"
                              : "border-sky-200 bg-sky-50/80"
                          } ${
                            highlightedKitchenOrderId === order.id
                              ? "ring-2 ring-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.14)] animate-[pulse_1.2s_ease-out_3]"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              {(order.channelLabel || order.partnerCode) && (
                                <span className="mb-2 inline-flex rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                  {order.channelLabel || order.partnerCode}
                                </span>
                              )}
                              {!order.isDeliveryMock &&
                                !order.channelLabel &&
                                !order.partnerCode && (
                                  <span className="mb-2 inline-flex rounded-full bg-sky-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                    Tại quầy
                                  </span>
                                )}
                              <p className="font-bold text-slate-800 text-[13px]">
                                Mã:{" "}
                                <span className="font-mono text-indigo-700">
                                  #{order.displayId || order.id}
                                </span>
                              </p>
                              <p className="text-[13px] text-slate-600 font-bold mt-0.5">
                                Khách:{" "}
                                <span className="text-sky-600">
                                  {order.customerName || "Khách vãng lai"}
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Kênh: {order.table || "Mang đi"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {isDeliveryKitchenOrder(order) && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintKitchenOrder(order)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  In hóa đơn
                                </button>
                              )}
                              <Popconfirm
                                title="Xác nhận giao đồ"
                                description="Bạn đã giao đơn này cho khách chưa?"
                                okText="Đã giao"
                                cancelText="Chưa giao"
                                onConfirm={() =>
                                  handleCompleteKitchenOrder(order.id)
                                }
                              >
                                <button
                                  type="button"
                                  className="bg-emerald-500 text-white rounded-full px-4 py-1.5 text-[13px] font-semibold hover:bg-emerald-600 transition shadow-sm"
                                >
                                  Xong
                                </button>
                              </Popconfirm>
                            </div>
                          </div>
                          <div className="mt-2 text-[13px] text-slate-600 bg-white rounded-xl p-3 border border-slate-100 flex flex-col gap-1.5">
                            {order.items?.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between font-medium"
                              >
                                <span className="flex-1 text-slate-700">
                                  <span className="text-sky-600 font-bold w-5 inline-block">
                                    {item.quantity} x
                                  </span>{" "}
                                  {item.productName}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
          </aside>
        </div>
      </div>

      <Modal
        open={qrModal?.visible}
        onCancel={() => setQrModal(null)}
        onOk={() => {
          if (qrModal) {
            createOrder(qrModal.orderData);
            setQrModal(null);
          }
        }}
        title={
          <div className="font-semibold text-center text-lg mt-2">
            Thanh toán chuyển khoản QR
          </div>
        }
        okText="Chốt đơn (Khách đã chuyển)"
        cancelText="Hủy giao dịch"
        width={420}
        centered
        destroyOnClose
      >
        <div className="flex flex-col items-center justify-center pt-2 pb-4">
          <p className="text-3xl font-bold text-slate-800 mb-4">
            {formatCurrency(qrModal?.amount || 0)}
          </p>

          <div className="bg-white p-3 border-2 border-dashed border-sky-400 rounded-3xl mb-5 flex items-center justify-center shadow-sm">
            <Image
              src={`https://img.vietqr.io/image/MB-2004200899-compact2.png?amount=${qrModal?.amount || 0}&addInfo=${qrModal?.orderInfo || "CMS"}`}
              alt="MB Bank QR Code"
              preview={false}
              style={{ width: "224px", height: "224px" }}
              className="object-contain"
            />
          </div>

          <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex justify-between mb-2 pb-2 border-b border-slate-200">
              <span className="text-slate-500 text-sm">Chủ tài khoản:</span>
              <span className="font-semibold text-slate-700 text-sm">
                2004200899
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Nội dung ghi chú:</span>
              <span className="font-mono font-bold text-sky-600 text-lg">
                {qrModal?.orderInfo}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
};

export default OrderPage;
