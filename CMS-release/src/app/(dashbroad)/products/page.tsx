"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Image, Table } from "antd";
import {
  Coffee,
  Eye,
  FileText,
  ImageUp,
  Package,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import {
  useAddProduct,
  useDeleteProduct,
  useGetProduct,
  useUpdateProduct,
} from "@/shared/hooks/product";
import { Product } from "@/shared/types/product";
import { enqueueSnackbar } from "notistack";
import ProtectedRoute from "@/shared/providers/auth.provider";
import { Column } from "@/shared/types/table";
import axios from "axios";

const defaultImage =
  "https://png.pngtree.com/png-vector/20190710/ourmid/pngtree-user-vector-avatar-png-image_1541962.jpg";

const defaultFormData = {
  id: "",
  name: "",
  price: 0,
  brand: "CMS",
  category: "Cà phê",
  recipe: [] as any[],
  description: "",
  image: null as string | File | null,
};

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
const parseToInt = (value: string | number | undefined): number => {
  const num = Number(value);
  return Number.isInteger(num) ? num : 0;
};
const formatDateTime = (value?: Date | string) => {
  if (!value) return "Chưa có dữ liệu";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Chưa có dữ liệu";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryReport, setInventoryReport] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  const { getProduct } = useGetProduct();
  const { deleteProduct } = useDeleteProduct();
  const { addProduct } = useAddProduct();
  const { updateProduct } = useUpdateProduct();

  const fetchProducts = useCallback(async () => {
    const fetchedProducts = await getProduct();
    setProducts(fetchedProducts);
    setSelectedProduct((prevSelected) => {
      if (!fetchedProducts.length) return null;
      if (!prevSelected) return fetchedProducts[0];
      return (
        fetchedProducts.find((product) => product.id === prevSelected.id) ||
        fetchedProducts[0]
      );
    });
  }, [getProduct]);

  const fetchInventoryData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/stock/inventory`
      );
      setInventoryReport(response.data);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu kho:", error);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
    void fetchInventoryData();
  }, [fetchProducts, fetchInventoryData]);

  const calculateMaxQuantity = useCallback((product: Product) => {
    if (!product.recipe || !Array.isArray(product.recipe) || product.recipe.length === 0) {
      return 999;
    }

    let maxQty = 999999;
    for (const ing of product.recipe) {
      if (!ing.category || !ing.productDetail) continue;
      const amountNeeded = Number(ing.amount);
      if (amountNeeded <= 0) continue;

      const invItem = inventoryReport.find(
        (i: any) =>
          i.category?.trim().toLowerCase() === ing.category?.trim().toLowerCase() &&
          i.productDetail?.trim().toLowerCase() === ing.productDetail?.trim().toLowerCase()
      );
      const invQty = invItem ? Number(invItem.quantity) : 0;

      const possible = Math.floor(invQty / amountNeeded);
      if (possible < maxQty) maxQty = possible;
    }

    return maxQty === 999999 ? 999 : maxQty;
  }, [inventoryReport]);

  const drinksCount = products.filter(
    (product) => (product.category || "Cà phê") === "Cà phê" || (product.category || "Cà phê") === "Nước ép",
  ).length;
  const foodCount = products.filter(
    (product) => (product.category || "Cà phê") === "Đồ ăn vặt",
  ).length;
  const averagePrice = products.length
    ? Math.round(
      products.reduce((sum, product) => sum + Number(product.price || 0), 0) /
      products.length,
    )
    : 0;

  const categoryOptions = ["Cà phê", "Nước ép", "Đồ ăn vặt"];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());
    const category = product.category || "Cà phê";
    const matchesCategory =
      categoryFilter === "Tất cả" ? true : category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const openCreateModal = () => {
    setCurrentProduct(null);
    setFormData(defaultFormData);
    setPreviewImage(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setSelectedProduct(product);
    let parsedRecipe = [] as any[];
    if (product.recipe && typeof product.recipe === "string") {
      try { parsedRecipe = JSON.parse(product.recipe); } catch {}
    } else if (Array.isArray(product.recipe)) {
      parsedRecipe = product.recipe;
    }
    setFormData({
      id: product.id,
      name: product.name,
      price: product.price,
      brand: product.brand || "CMS",
      category: product.category || "Cà phê",
      recipe: parsedRecipe,
      description: product.description,
      image: product.image,
    });
    setPreviewImage(typeof product.image === "string" ? product.image : null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentProduct(null);
    setPreviewImage(null);
    setFormData(defaultFormData);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "price" || name === "quantity") {
      const numValue = Number(value);
      if (Number.isNaN(numValue) || numValue < 0) return;

      setFormData((prev) => ({ ...prev, [name]: numValue }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, image: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentProduct && !formData.image) {
      enqueueSnackbar("Sản phẩm đang thiếu hình ảnh", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    if (!formData.recipe || formData.recipe.length === 0) {
      enqueueSnackbar("Vui lòng thiết lập ít nhất 1 nguyên liệu cho sản phẩm", {
        variant: "warning",
        autoHideDuration: 2000,
      });
      return;
    }

    const hasInvalidRecipe = formData.recipe.some(
      (r) => !r.category || !r.productDetail || !r.amount || Number(r.amount) <= 0
    );
    if (hasInvalidRecipe) {
      enqueueSnackbar("Vui lòng điền đầy đủ danh mục, nguyên liệu và định lượng (>0)", {
        variant: "warning",
        autoHideDuration: 2000,
      });
      return;
    }


    try {
      setIsSubmitting(true);
      console.log(formData);
      if (currentProduct) {
        const updatedProduct: Product = {
          ...currentProduct,
          ...formData,
          brand: formData.brand,
          category: formData.category,
          recipe: formData.recipe,
          image: formData.image || currentProduct.image,
        };
        await updateProduct(updatedProduct);
        enqueueSnackbar("Cập nhật sản phẩm thành công", {
          variant: "success",
          autoHideDuration: 1500,
        });
      } else {
        await addProduct({
          ...formData,
          brand: formData.brand,
          category: formData.category,
          recipe: formData.recipe,
        });
        enqueueSnackbar("Thêm sản phẩm thành công", {
          variant: "success",
          autoHideDuration: 1500,
        });
      }

      await fetchProducts();
      closeModal();
    } catch {
      enqueueSnackbar("Xảy ra lỗi khi lưu sản phẩm", {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}" không?`,
    );

    if (!confirmed) return;

    try {
      await deleteProduct(product.id);

      const nextProducts = products.filter((item) => item.id !== product.id);
      setProducts(nextProducts);
      setSelectedProduct((prevSelected) => {
        if (prevSelected?.id !== product.id) return prevSelected;
        return nextProducts[0] || null;
      });

      enqueueSnackbar("Xóa sản phẩm thành công", {
        variant: "success",
        autoHideDuration: 1500,
      });
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      enqueueSnackbar("Xảy ra lỗi khi xóa sản phẩm", {
        variant: "error",
        autoHideDuration: 1500,
      });
    }
  };

  const columns: Column[] = [
    {
      title: "Sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (_, record: Product) => (
        <div className="flex items-center gap-3">
          <Image
            src={
              typeof record.image === "string" && record.image
                ? record.image
                : defaultImage
            }
            alt={record.name}
            preview={false}
            style={{ width: "56px", height: "56px" }}
            className="rounded-2xl object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {record.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {record.category || "Cà phê"}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      align: "center",
      render: (_, record: Product) => (
        <span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          {record.category || "Cà phê"}
        </span>
      ),
    },
    {
      title: "Giá bán",
      dataIndex: "price",
      key: "price",
      align: "center",
      render: (_: string, record: Product) => (
        <span className="text-sm font-semibold text-slate-900">
          {formatCurrency(record.price)}
        </span>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      responsive: ["lg"],
      render: (description: string) => (
        <p className="line-clamp-2 max-w-md text-sm leading-6 text-slate-500">
          {description || "Chưa có mô tả"}
        </p>
      ),
    },
    {
      title: "Thao tác",
      dataIndex: "action",
      key: "action",
      align: "center",
      render: (_, record: Product) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProduct(record);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-sky-100 hover:text-sky-700"
            aria-label={`Xem sản phẩm ${record.name}`}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(record);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 transition hover:bg-amber-100"
            aria-label={`Chỉnh sửa sản phẩm ${record.name}`}
          >
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 transition hover:bg-rose-100"
            aria-label={`Xóa sản phẩm ${record.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const activeProduct =
    filteredProducts.find((product) => product.id === selectedProduct?.id) ||
    filteredProducts[0] ||
    selectedProduct ||
    products[0] ||
    null;
  const modalPreviewImage =
    previewImage ||
    (typeof formData.image === "string" ? formData.image : null) ||
    defaultImage;

  const summaryCards = [
    {
      label: "Tổng sản phẩm",
      value: products.length,
      icon: <Package className="h-5 w-5 text-sky-700" />,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Đồ uống",
      value: drinksCount,
      icon: <Coffee className="h-5 w-5 text-emerald-700" />,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Đồ ăn",
      value: foodCount,
      icon: <UtensilsCrossed className="h-5 w-5 text-amber-700" />,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Giá trung bình",
      value: formatCurrency(averagePrice),
      icon: <Wallet className="h-5 w-5 text-violet-700" />,
      tone: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <section className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.18),_transparent_20%)]" />
            <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                  <Sparkles className="h-4 w-4" />
                  Quản trị danh mục
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Quản lý sản phẩm
                </h1>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
                Thêm sản phẩm mới
              </button>
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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Danh sách sản phẩm
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tìm kiếm và quản lý sản phẩm theo danh mục chỉ với vài thao
                    tác.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-[240px]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm theo tên sản phẩm"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  >
                    <option value="Tất cả">Tất cả danh mục</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-2">
                <Table
                  dataSource={filteredProducts}
                  columns={columns}
                  rowKey="id"
                  pagination={{
                    pageSize: 8,
                    position: ["bottomCenter"],
                    showSizeChanger: false,
                  }}
                  locale={{
                    emptyText: "Không tìm thấy sản phẩm phù hợp",
                  }}
                  className="modern-product-table"
                  onRow={(record) => ({
                    onClick: () => setSelectedProduct(record),
                  })}
                  rowClassName={(record) =>
                    `cursor-pointer ${activeProduct?.id === record.id ? "bg-sky-50/70" : ""
                    }`
                  }
                />
              </div>
            </div>

            <aside className="space-y-6">
              <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="relative h-52 overflow-hidden bg-slate-900">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.1),_rgba(15,23,42,0.75))]" />
                  <Image
                    src={
                      activeProduct &&
                        typeof activeProduct.image === "string" &&
                        activeProduct.image
                        ? activeProduct.image
                        : defaultImage
                    }
                    alt={activeProduct?.name || "Sản phẩm"}
                    preview={false}
                    style={{ width: "100%", height: "100%" }}
                    className="object-cover opacity-80"
                  />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {activeProduct
                        ? (activeProduct.category || "Cà phê")
                        : "Chi tiết sản phẩm"}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {activeProduct ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-semibold text-slate-900">
                            {activeProduct.name}
                          </h3>
                          <p className="mt-2 text-lg font-semibold text-sky-700">
                            {formatCurrency(activeProduct.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditModal(activeProduct)}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-sky-100 hover:text-sky-700"
                        >
                          <PencilLine className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-5 text-sm leading-7 text-slate-500">
                        {activeProduct.description ||
                          "Chưa có mô tả cho sản phẩm này."}
                      </p>

                      <div className="mt-6 space-y-3">
                        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="rounded-2xl bg-sky-100 p-2 text-sky-700">
                            <Tag className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Danh mục
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {activeProduct.category || "Cà phê"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="rounded-2xl bg-violet-100 p-2 text-violet-700">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Giá niêm yết
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(activeProduct.price)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="rounded-2xl bg-rose-100 p-2 text-rose-700">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Tồn kho
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {activeProduct && calculateMaxQuantity(activeProduct) !== 999
                                ? calculateMaxQuantity(activeProduct)
                                : (activeProduct?.quantity ?? 0)} sản phẩm
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                              Cập nhật gần nhất
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatDateTime(activeProduct.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Thành phần định lượng */}
                        {activeProduct.recipe && Array.isArray(activeProduct.recipe) && activeProduct.recipe.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/30 p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-sky-700">
                              Định lượng nguyên liệu
                            </p>
                            <div className="space-y-2">
                              {activeProduct.recipe.map((ing: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">{ing.productDetail}</span>
                                  <span className="font-semibold text-slate-900">
                                    {ing.amount} {ing.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex gap-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(activeProduct)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <PencilLine className="h-4 w-4" />
                          Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(activeProduct)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Xóa
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                        <Package className="h-8 w-8" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-slate-900">
                        Chưa có sản phẩm để hiển thị
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Hãy thêm sản phẩm đầu tiên để bắt đầu quản lý danh mục.
                      </p>
                      <Button
                        color="primary"
                        variant="solid"
                        onClick={openCreateModal}
                        className="mt-5"
                      >
                        Thêm sản phẩm
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.6)]">
              <form
                onSubmit={handleSubmit}
                className="grid max-h-[92vh] overflow-y-auto lg:grid-cols-[1fr_1.15fr]"
              >
                <div className="relative overflow-hidden bg-slate-900 p-6 text-white sm:p-8">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.32),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.2),_transparent_24%)]" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                      <Sparkles className="h-4 w-4" />
                      {currentProduct ? "Chi tiết sản phẩm" : "Sản phẩm mới"}
                    </div>

                    <h2 className="mt-5 text-3xl font-semibold">
                      {currentProduct
                        ? "Cập nhật sản phẩm"
                        : "Tạo sản phẩm mới"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Thay đổi sẽ được phản ánh trực tiếp trên khu vực quản lý
                      và khối chi tiết sản phẩm.
                    </p>

                    <div className="mt-8 overflow-hidden rounded-[28px] bg-white/10 p-4 backdrop-blur">
                      <div className="overflow-hidden rounded-[24px] bg-white/10">
                        <Image
                          src={modalPreviewImage}
                          alt={formData.name || "Xem trước sản phẩm"}
                          preview={false}
                          style={{ width: "100%", height: "260px" }}
                          className="object-cover"
                        />
                      </div>

                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                            Tên hiển thị
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-white">
                            {formData.name || "Tên sản phẩm"}
                          </p>
                        </div>
                        <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm text-sky-100">
                          {formData.brand || "Chưa chọn danh mục"}
                        </div>
                        <p className="text-lg font-semibold text-emerald-300">
                          {formatCurrency(formData.price)}
                        </p>
                        <p className="text-sm leading-7 text-slate-300">
                          {formData.description ||
                            "Mô tả ngắn sẽ hiển thị tại đây để bạn kiểm tra trước khi lưu."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">
                        Thông tin chi tiết
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Điền đầy đủ dữ liệu để sản phẩm hiển thị đẹp và nhất
                        quán trong hệ thống.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                    >
                      Hủy
                    </button>
                  </div>

                  <div className="mt-8 space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">
                        Hình ảnh sản phẩm
                      </label>
                      <label className="flex cursor-pointer items-center justify-center gap-3 rounded-[24px] border border-dashed border-sky-300 bg-sky-50 px-4 py-5 text-sm font-medium text-sky-700 transition hover:bg-sky-100">
                        <ImageUp className="h-5 w-5" />
                        Tải ảnh lên hoặc thay đổi ảnh
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">
                        Tên sản phẩm
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className={inputClassName}
                        placeholder="Ví dụ: Cà phê sữa đá"
                      />
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">
                          Giá bán
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          min="0"
                          step="any"
                          required
                          className={inputClassName}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">
                          Danh mục ({formData.category})
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={(e) => {
                            setFormData((prev) => ({ ...prev, category: e.target.value }));
                          }}
                          required
                          className={inputClassName}
                        >
                          <option value="Cà phê">Cà phê</option>
                          <option value="Nước ép">Nước ép</option>
                          <option value="Đồ ăn vặt">Đồ ăn vặt</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[24px] border border-sky-100 bg-sky-50/50 p-5">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-sky-600" />
                        <h4 className="font-semibold text-slate-900">Công thức Điện tử (BOM)</h4>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">
                        Hệ thống sẽ tự động xuất kho theo định lượng đã thiết lập khi sản phẩm được bán ra.
                      </p>
                      
                      <div className="space-y-3">
                        {formData.recipe.map((item, index) => (
                          <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-sky-100 shadow-sm">
                            <select 
                              className={inputClassName + " flex-1 min-w-[120px]"}
                              value={item.category || ""}
                              onChange={(e) => {
                                const newRecipe = [...formData.recipe];
                                const cat = e.target.value;
                                newRecipe[index].category = cat;
                                newRecipe[index].productDetail = ""; // reset when category changes
                                newRecipe[index].unit = ""; 
                                
                                setFormData(prev => ({ ...prev, recipe: newRecipe }));
                              }}
                              required
                            >
                              <option value="" disabled>Chọn danh mục...</option>
                              {Array.from(new Set(inventoryReport.map((inv) => inv.category).filter(Boolean))).map((cat: any, idx) => (
                                <option key={idx} value={cat}>{cat}</option>
                              ))}
                            </select>

                            <select 
                              className={inputClassName + " flex-[2] min-w-[180px]"}
                              value={item.productDetail || ""}
                              onChange={(e) => {
                                const newRecipe = [...formData.recipe];
                                const detail = e.target.value;
                                newRecipe[index].productDetail = detail;
                                
                                const inv = inventoryReport.find(
                                  (i) => i.category === item.category && i.productDetail === detail
                                );
                                if (inv) {
                                  newRecipe[index].unit = inv.unit;
                                }
                                
                                setFormData(prev => ({ ...prev, recipe: newRecipe }));
                              }}
                              required
                              disabled={!item.category}
                            >
                              <option value="" disabled>Chọn nguyên liệu...</option>
                              {inventoryReport.filter(inv => inv.category === item.category).map((inv, idx) => (
                                <option key={idx} value={inv.productDetail}>
                                  {inv.productDetail} (Kho: {inv.quantity})
                                </option>
                              ))}
                            </select>
                            
                            <div className="relative flex items-center">
                              <input 
                                type="number" 
                                min="0" 
                                step="any" 
                                placeholder="Định lượng" 
                                className={inputClassName + " sm:w-36 pr-12"}
                                value={item.amount || ""}
                                onChange={e => {
                                  const newRecipe = [...formData.recipe];
                                  newRecipe[index].amount = Number(e.target.value);
                                  setFormData(prev => ({ ...prev, recipe: newRecipe }));
                                }}
                                required
                              />
                              <span className="absolute right-3 text-xs font-medium text-slate-400">
                                {item.unit || ""}
                              </span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                const newRecipe = formData.recipe.filter((_, i) => i !== index);
                                setFormData(prev => ({ ...prev, recipe: newRecipe }));
                              }}
                              className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                              title="Xóa nguyên liệu này"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        
                        {formData.recipe.length === 0 && (
                          <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/50 py-6 text-center text-sm text-sky-600/70">
                            Chưa có nguyên liệu nào. Nhấn &quot;Thêm nguyên liệu&quot; để cấu hình.
                          </div>
                        )}
                        
                        <div className="mt-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, recipe: [...prev.recipe, { category: "", productDetail: "", unit: "", amount: 0 }] }));
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white border border-sky-200 px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
                          >
                            <Plus className="h-4 w-4" />
                            Thêm nguyên liệu
                          </button>
                        </div>
                      </div>



                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">
                        Mô tả sản phẩm
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className={`${inputClassName} resize-none`}
                        placeholder="Mô tả hương vị, thành phần hoặc điểm nổi bật của sản phẩm"
                      />
                    </div>

                    <div className="grid gap-4 rounded-[28px] bg-slate-50 p-5 md:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
                          <Tag className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Danh mục hiển thị
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formData.brand ||
                              "Chưa chọn danh mục cho sản phẩm."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white p-3 text-emerald-700 shadow-sm">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Giá xem trước
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatCurrency(formData.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus className="h-4 w-4" />
                      {isSubmitting
                        ? "Đang lưu..."
                        : currentProduct
                          ? "Lưu cập nhật"
                          : "Tạo sản phẩm"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </ProtectedRoute>
  );
};

export default ProductManagement;
