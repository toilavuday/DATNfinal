"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Button, Image } from "antd";
import {
  ArrowRight,
  Boxes,
  Minus,
  Phone,
  Plus,
  RadioTower,
  RefreshCcw,
  Rocket,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { enqueueSnackbar } from "notistack";
import { useRecoilValue } from "recoil";
import ProtectedRoute from "@/shared/providers/auth.provider";
import { authState } from "@/shared/store/Atoms/auth";
import { useGetProduct } from "@/shared/hooks/product";
import { CartItem, Product } from "@/shared/types/product";
import {
  emitKitchenQueueEvent,
  parseKitchenOrders,
  persistKitchenOrders,
  type KitchenQueueOrder,
  KITCHEN_QUEUE_STORAGE_KEY,
  upsertKitchenOrder,
} from "@/shared/utils/kitchen-queue";

type SimulatorResponse = {
  message?: string;
  mockPayload?: Record<string, unknown>;
  queueOrder?: KitchenQueueOrder;
};

type SimulatorFormState = {
  orderId: string;
  partnerCode: string;
  customerName: string;
  phone: string;
};

type InventoryItem = {
  category?: string;
  productDetail?: string;
  quantity?: number;
  unit?: string;
};

const defaultImage =
  "https://png.pngtree.com/png-vector/20190710/ourmid/pngtree-user-vector-avatar-png-image_1541962.jpg";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const generateSimulatorOrderId = (partnerCode = "GRABFOOD") => {
  const normalized = partnerCode.trim().toUpperCase().replace(/[^A-Z]/g, "");
  const prefix = normalized.slice(0, 6) || "DELIV";
  const serial = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${serial}`;
};

const SimulatorPage: React.FC = () => {
  const auth = useRecoilValue(authState);
  const { getProduct } = useGetProduct();

  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryReport, setInventoryReport] = useState<InventoryItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<SimulatorResponse | null>(
    null,
  );
  const [formState, setFormState] = useState<SimulatorFormState>(() => ({
    orderId: generateSimulatorOrderId("GRABFOOD"),
    partnerCode: "GRABFOOD",
    customerName: "Khách demo",
    phone: "0901234567",
  }));

  const fetchProductsAndInventory = useCallback(async () => {
    try {
      const [fetchedProducts, inventoryResponse] = await Promise.all([
        getProduct(),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/stock/inventory`),
      ]);

      setProducts(fetchedProducts || []);
      setInventoryReport(inventoryResponse.data || []);
    } catch (error) {
      console.error("Cannot load simulator data:", error);
      enqueueSnackbar("Không thể tải dữ liệu sản phẩm cho simulator", {
        variant: "error",
        autoHideDuration: 1800,
      });
    }
  }, [getProduct]);

  useEffect(() => {
    void fetchProductsAndInventory();
  }, [fetchProductsAndInventory]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => product.category || "Cà phê")),
    );

    return uniqueCategories.length > 0
      ? uniqueCategories
      : ["Cà phê", "Trà", "Đồ ăn"];
  }, [products]);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const calculateMaxQuantity = useCallback(
    (product: Product) => {
      if (
        !product.recipe ||
        !Array.isArray(product.recipe) ||
        product.recipe.length === 0
      ) {
        return 999;
      }

      let maxQuantity = 999999;

      for (const ingredient of product.recipe) {
        if (!ingredient.category || !ingredient.productDetail) {
          continue;
        }

        const amountNeeded = Number(ingredient.amount);
        if (amountNeeded <= 0) {
          continue;
        }

        const inventoryItem = inventoryReport.find(
          (item) =>
            item.category?.trim().toLowerCase() ===
              ingredient.category.trim().toLowerCase() &&
            item.productDetail?.trim().toLowerCase() ===
              ingredient.productDetail.trim().toLowerCase(),
        );
        const inventoryQuantity = inventoryItem
          ? Number(inventoryItem.quantity || 0)
          : 0;
        const possible = Math.floor(inventoryQuantity / amountNeeded);

        if (possible < maxQuantity) {
          maxQuantity = possible;
        }
      }

      return maxQuantity === 999999 ? 999 : maxQuantity;
    },
    [inventoryReport],
  );

  const canAddToCart = useCallback(
    (product: Product, quantityToAdd: number) => {
      if (
        !product.recipe ||
        !Array.isArray(product.recipe) ||
        product.recipe.length === 0
      ) {
        return true;
      }

      const requirementsMap: Record<string, number> = {};

      for (const cartItem of cart) {
        const matchedProduct = products.find(
          (productItem) => productItem.id === cartItem.id,
        );

        if (
          !matchedProduct?.recipe ||
          !Array.isArray(matchedProduct.recipe)
        ) {
          continue;
        }

        for (const ingredient of matchedProduct.recipe) {
          if (!ingredient.category || !ingredient.productDetail) {
            continue;
          }

          const key = `${ingredient.category.trim().toLowerCase()}-${ingredient.productDetail
            .trim()
            .toLowerCase()}`;
          requirementsMap[key] =
            (requirementsMap[key] || 0) +
            Number(ingredient.amount) * cartItem.quantity;
        }
      }

      for (const ingredient of product.recipe) {
        if (!ingredient.category || !ingredient.productDetail) {
          continue;
        }

        const key = `${ingredient.category.trim().toLowerCase()}-${ingredient.productDetail
          .trim()
          .toLowerCase()}`;
        requirementsMap[key] =
          (requirementsMap[key] || 0) +
          Number(ingredient.amount) * quantityToAdd;
      }

      for (const [key, requiredQuantity] of Object.entries(requirementsMap)) {
        const [category, productDetail] = key.split("-");
        const inventoryItem = inventoryReport.find(
          (item) =>
            item.category?.trim().toLowerCase() === category &&
            item.productDetail?.trim().toLowerCase() === productDetail,
        );
        const inventoryQuantity = inventoryItem
          ? Number(inventoryItem.quantity || 0)
          : 0;

        if (requiredQuantity > inventoryQuantity) {
          return false;
        }
      }

      return true;
    },
    [cart, inventoryReport, products],
  );

  const handleAddToCart = useCallback(
    (product: Product) => {
      const maxQuantity = calculateMaxQuantity(product);

      if (maxQuantity <= 0) {
        enqueueSnackbar("Sản phẩm này đã hết khả năng pha chế", {
          variant: "warning",
          autoHideDuration: 1500,
        });
        return;
      }

      if (!canAddToCart(product, 1)) {
        enqueueSnackbar("Nguyên liệu hiện tại không đủ để thêm món này", {
          variant: "warning",
          autoHideDuration: 1600,
        });
        return;
      }

      setCart((prevCart) => {
        const existingIndex = prevCart.findIndex(
          (cartItem) => cartItem.id === product.id,
        );

        if (existingIndex === -1) {
          return [...prevCart, { ...product, quantity: 1 }];
        }

        return prevCart.map((cartItem, index) =>
          index === existingIndex
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      });
    },
    [calculateMaxQuantity, canAddToCart],
  );

  const handleIncreaseQuantity = useCallback(
    (productId: string) => {
      const product = products.find((item) => item.id === productId);
      if (!product) {
        return;
      }

      if (!canAddToCart(product, 1)) {
        enqueueSnackbar("Nguyên liệu hiện tại không đủ để tăng số lượng", {
          variant: "warning",
          autoHideDuration: 1600,
        });
        return;
      }

      setCart((prevCart) =>
        prevCart.map((cartItem) =>
          cartItem.id === productId
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        ),
      );
    },
    [canAddToCart, products],
  );

  const handleDecreaseQuantity = useCallback((productId: string) => {
    setCart((prevCart) =>
      prevCart.flatMap((cartItem) => {
        if (cartItem.id !== productId) {
          return [cartItem];
        }

        if (cartItem.quantity <= 1) {
          return [];
        }

        return [{ ...cartItem, quantity: cartItem.quantity - 1 }];
      }),
    );
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((cartItem) => cartItem.id !== productId),
    );
  }, []);

  const amount = useMemo(
    () =>
      cart.reduce(
        (total, cartItem) => total + cartItem.price * cartItem.quantity,
        0,
      ),
    [cart],
  );

  const totalQuantity = useMemo(
    () => cart.reduce((total, cartItem) => total + cartItem.quantity, 0),
    [cart],
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products
      .filter((product) =>
        (product.category || "Cà phê") === selectedCategory,
      )
      .filter((product) =>
        product.name.toLowerCase().includes(normalizedSearch),
      )
      .sort((left, right) => {
        const leftAvailable = calculateMaxQuantity(left) > 0;
        const rightAvailable = calculateMaxQuantity(right) > 0;

        if (leftAvailable && !rightAvailable) {
          return -1;
        }

        if (!leftAvailable && rightAvailable) {
          return 1;
        }

        const leftTime = left.createdAt
          ? new Date(left.createdAt).getTime()
          : 0;
        const rightTime = right.createdAt
          ? new Date(right.createdAt).getTime()
          : 0;

        return rightTime - leftTime;
      });
  }, [calculateMaxQuantity, products, searchTerm, selectedCategory]);

  const payloadPreview = useMemo(() => {
    const payload = {
      order_id: formState.orderId.trim() || "(chua-nhap-order-id)",
      partner_code: formState.partnerCode.trim() || "GRABFOOD",
      customer: {
        name: formState.customerName.trim() || "(chua-nhap-ten-khach)",
        phone: formState.phone.trim() || "(chua-nhap-so-dien-thoai)",
      },
      items: cart.map((cartItem) => ({
        sku: cartItem.id,
        name: cartItem.name,
        quantity: cartItem.quantity,
        price: cartItem.price,
      })),
      total_amount: amount,
    };

    return JSON.stringify(payload, null, 2);
  }, [amount, cart, formState]);

  const handleInputChange = useCallback(
    (field: keyof SimulatorFormState, value: string) => {
      setFormState((prevState) => ({
        ...prevState,
        [field]: value,
      }));
    },
    [],
  );

  const regenerateOrderId = useCallback(() => {
    setFormState((prevState) => ({
      ...prevState,
      orderId: generateSimulatorOrderId(prevState.partnerCode),
    }));
  }, []);

  const handleSubmitSimulatorOrder = useCallback(async () => {
    const normalizedOrderId =
      formState.orderId.trim() ||
      generateSimulatorOrderId(formState.partnerCode);

    if (!formState.customerName.trim()) {
      enqueueSnackbar("Vui lòng nhập tên khách hàng", {
        variant: "warning",
        autoHideDuration: 1600,
      });
      return;
    }

    if (!formState.phone.trim()) {
      enqueueSnackbar("Vui lòng nhập số điện thoại khách hàng", {
        variant: "warning",
        autoHideDuration: 1600,
      });
      return;
    }

    if (cart.length === 0) {
      enqueueSnackbar("Chưa có sản phẩm nào trong đơn giả lập", {
        variant: "warning",
        autoHideDuration: 1600,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/order/simulator/grab`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: auth?.user?.id,
            orderId: normalizedOrderId,
            partnerCode: formState.partnerCode.trim() || "GRABFOOD",
            customerName: formState.customerName.trim(),
            phone: formState.phone.trim(),
            items: cart.map((cartItem) => ({
              productId: cartItem.id,
              quantity: cartItem.quantity,
            })),
          }),
        },
      );

      const data = (await response.json()) as SimulatorResponse;

      if (!response.ok) {
        throw new Error(data?.message || "Không thể tạo đơn giả lập");
      }

      if (!data.queueOrder) {
        throw new Error("Backend chưa trả về dữ liệu hàng chờ pha chế");
      }

      const currentOrders = parseKitchenOrders(
        window.localStorage.getItem(KITCHEN_QUEUE_STORAGE_KEY),
      );
      const nextOrders = upsertKitchenOrder(currentOrders, data.queueOrder);

      persistKitchenOrders(nextOrders);
      emitKitchenQueueEvent({
        type: "order-added",
        source: "simulator",
        order: data.queueOrder,
      });

      setLastResponse(data);
      setCart([]);
      setFormState((prevState) => ({
        ...prevState,
        orderId: generateSimulatorOrderId(prevState.partnerCode),
      }));

      enqueueSnackbar("Đã gửi đơn giả lập sang POS thành công", {
        variant: "success",
        autoHideDuration: 1800,
      });

      await fetchProductsAndInventory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Có lỗi khi tạo đơn giả lập";

      enqueueSnackbar(message, {
        variant: "error",
        autoHideDuration: 2200,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [auth?.user?.id, cart, fetchProductsAndInventory, formState]);

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <section className="min-h-[calc(100dvh-120px)] bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(135deg,_#eff6ff_0%,_#ecfeff_45%,_#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="overflow-hidden rounded-[32px] bg-slate-900 p-6 text-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.65)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-200">
                  <Rocket className="h-4 w-4" />
                  Công cụ demo bảo vệ đồ án
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                  Simulator đơn giao hàng nhập tay
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
                  Nhập order ID, tên khách, số điện thoại và tự chọn món giống
                  màn hình POS. Khi bấm gửi, đơn sẽ tạo thật trong hệ thống rồi
                  nhảy ngay sang danh sách pha chế.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/orders">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Mở POS
                  </button>
                </Link>
                <Button
                  loading={isSubmitting}
                  onClick={() => void handleSubmitSimulatorOrder()}
                  className="h-11 rounded-full border-none bg-emerald-400 px-6 text-sm font-semibold text-slate-950 hover:!bg-emerald-300"
                >
                  Gửi đơn sang POS
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_420px]">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Chọn sản phẩm mô phỏng
                  </h2>
                  <p className="text-sm text-slate-500">
                    Cách chọn giống trang tạo đơn hàng.
                  </p>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm sản phẩm"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedCategory === category
                        ? "bg-sky-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="mt-6 max-h-[680px] overflow-y-auto pr-1">
                {filteredProducts.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredProducts.map((product) => {
                      const maxQuantity = calculateMaxQuantity(product);
                      const isOutOfStock = maxQuantity <= 0;

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className={`overflow-hidden rounded-[24px] border text-left shadow-sm transition ${
                            isOutOfStock
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-70"
                              : "border-slate-200 bg-white hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg"
                          }`}
                        >
                          <div className="relative h-44 overflow-hidden bg-slate-100">
                            <Image
                              src={
                                typeof product.image === "string" && product.image
                                  ? product.image
                                  : defaultImage
                              }
                              alt={product.name}
                              preview={false}
                              className="h-full w-full object-cover"
                            />
                            <span
                              className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                isOutOfStock
                                  ? "bg-slate-800/80 text-white"
                                  : "bg-emerald-500 text-white"
                              }`}
                            >
                              {isOutOfStock ? "Hết khả dụng" : product.category || "Cà phê"}
                            </span>
                          </div>

                          <div className="space-y-3 p-4">
                            <div>
                              <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
                                {product.name}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {product.description || "Sẵn sàng cho đơn mô phỏng."}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-lg font-semibold text-sky-700">
                                  {formatCurrency(product.price)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Tối đa {maxQuantity >= 999 ? "không giới hạn" : `${maxQuantity} món`}
                                </p>
                              </div>

                              <span
                                className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                                  isOutOfStock
                                    ? "bg-slate-200 text-slate-500"
                                    : "bg-slate-900 text-white"
                                }`}
                              >
                                <Plus className="h-5 w-5" />
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                    Không tìm thấy sản phẩm phù hợp trong danh mục hiện tại.
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Thông tin đơn giả lập
                    </h2>
                    <p className="text-sm text-slate-500">
                      Nhập tay như một đơn giao hàng thực tế.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Order ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formState.orderId}
                        onChange={(event) =>
                          handleInputChange("orderId", event.target.value)
                        }
                        placeholder="GRAB-12345"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      />
                      <button
                        type="button"
                        onClick={regenerateOrderId}
                        className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                        title="Tạo mã mới"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Partner code
                    </label>
                    <input
                      type="text"
                      value={formState.partnerCode}
                      onChange={(event) =>
                        handleInputChange(
                          "partnerCode",
                          event.target.value.toUpperCase(),
                        )
                      }
                      placeholder="GRABFOOD"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Tên khách hàng
                    </label>
                    <input
                      type="text"
                      value={formState.customerName}
                      onChange={(event) =>
                        handleInputChange("customerName", event.target.value)
                      }
                      placeholder="Khách Grab demo"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={formState.phone}
                      onChange={(event) =>
                        handleInputChange("phone", event.target.value)
                      }
                      placeholder="0901234567"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Giỏ mô phỏng
                    </h2>
                    <p className="text-sm text-slate-500">
                      {totalQuantity} món đang chờ gửi sang POS.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                    {formatCurrency(amount)}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="mt-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                    <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">
                      Chưa có món nào trong đơn giả lập.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {cart.map((cartItem) => (
                      <div
                        key={cartItem.id}
                        className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <Image
                            src={
                              typeof cartItem.image === "string" && cartItem.image
                                ? cartItem.image
                                : defaultImage
                            }
                            alt={cartItem.name}
                            width={72}
                            height={72}
                            preview={false}
                            className="rounded-2xl object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                                  {cartItem.name}
                                </h3>
                                <p className="mt-1 text-xs text-slate-500">
                                  {cartItem.category || "Cà phê"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(cartItem.id)}
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
                                    handleDecreaseQuantity(cartItem.id)
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-[28px] text-center text-sm font-semibold text-slate-900">
                                  {cartItem.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleIncreaseQuantity(cartItem.id)
                                  }
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-slate-500">
                                  {formatCurrency(cartItem.price)} x{" "}
                                  {cartItem.quantity}
                                </p>
                                <p className="text-sm font-semibold text-sky-700">
                                  {formatCurrency(
                                    cartItem.price * cartItem.quantity,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 rounded-[28px] bg-slate-900 p-5 text-white">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Tổng số món</span>
                    <span>{totalQuantity}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                    <span>Đối tác</span>
                    <span>{formState.partnerCode || "GRABFOOD"}</span>
                  </div>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Tổng thanh toán</p>
                      <p className="mt-1 text-3xl font-semibold">
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  loading={isSubmitting}
                  disabled={cart.length === 0}
                  onClick={() => void handleSubmitSimulatorOrder()}
                  className="mt-5 h-12 w-full rounded-2xl border-none bg-emerald-500 text-sm font-semibold text-white hover:!bg-emerald-400"
                >
                  Tạo và gửi đơn giả lập
                </Button>
              </div>
            </aside>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <RadioTower className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Payload sẽ bắn xuống backend
                  </h2>
                  <p className="text-sm text-slate-500">
                    Preview trực tiếp từ các trường bạn đang nhập.
                  </p>
                </div>
              </div>

              <pre className="mt-6 overflow-x-auto rounded-[28px] bg-slate-950 p-5 text-sm leading-6 text-emerald-200 shadow-inner">
                {payloadPreview}
              </pre>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Boxes className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Đơn vừa tạo
                    </h2>
                    <p className="text-sm text-slate-500">
                      Hiển thị ngay ở cột pha chế của POS.
                    </p>
                  </div>
                </div>

                {lastResponse?.queueOrder ? (
                  <div className="mt-5 rounded-[28px] border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                        {lastResponse.queueOrder.channelLabel || "GrabFood"}
                      </span>
                      <span className="font-mono text-sm font-semibold text-emerald-700">
                        #
                        {lastResponse.queueOrder.displayId ||
                          lastResponse.queueOrder.id}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-900">
                          Khách:
                        </span>{" "}
                        {lastResponse.queueOrder.customerName || "Khách demo"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">
                          Kênh:
                        </span>{" "}
                        {lastResponse.queueOrder.table || "GrabFood"}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">
                          Tổng tiền:
                        </span>{" "}
                        {formatCurrency(
                          Number(lastResponse.queueOrder.amount || 0),
                        )}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Món đã chọn
                      </p>
                      <div className="mt-3 space-y-2">
                        {lastResponse.queueOrder.items?.map((item, index) => (
                          <div
                            key={`${item.productId || item.productName}-${index}`}
                            className="flex items-center justify-between gap-3 text-sm text-slate-700"
                          >
                            <span className="flex-1">
                              <span className="mr-2 font-semibold text-emerald-700">
                                {item.quantity}x
                              </span>
                              {item.productName}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(
                                Number(
                                  item.total ||
                                    (item.productPrice || 0) * item.quantity,
                                ),
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                    Chưa có đơn mô phỏng nào được tạo.
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default SimulatorPage;
