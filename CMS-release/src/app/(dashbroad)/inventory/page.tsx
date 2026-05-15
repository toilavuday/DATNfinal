"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Collapse,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Segmented,
  Spin,
  Table,
  message,
  Tabs,
  Tag,
  Modal
} from "antd";
import {
  Boxes,
  PackagePlus,
  Plus,
  Sparkles,
  Trash2,
  Warehouse,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  Bot,
  Clock3,
  PackageCheck,
  Search
} from "lucide-react";
import axios from "axios";
import ProtectedRoute from "@/shared/providers/auth.provider";
import { useRecoilValue } from "recoil";
import { authState } from "@/shared/store/Atoms/auth";
import { Product } from "@/shared/types/product";

interface StockEntry {
  id?: string;
  category: string;
  productDetail: string;
  quantity: string;
  unit: string;
  supplierName: string;
  price?: string;
  type?: string;
  expiryDate?: string;
}

interface StockEntryBatch {
  id: string;
  createdAt: string;
  entries: StockEntry[];
  user?: { name: string };
}

interface InventorySummary {
  category: string;
  productDetail: string;
  unit: string;
  quantity: number;
  averagePrice?: number;
  expiredQuantity?: number;
  expiryDetails?: Array<{
    expiryDate: string | null;
    quantity: number;
    unit: string;
    averagePrice?: number;
    totalValue?: number;
  }>;
  expiredDetails?: Array<{
    expiryDate: string | null;
    quantity: number;
    unit: string;
    averagePrice?: number;
    totalValue?: number;
  }>;
}

interface AiRestockSuggestion {
  category: string;
  productDetail: string;
  unit: string;
  stock: number;
  totalSoldLast7Days: number;
  avgSalePerDay: number;
  reserveDays: number;
  minStock: number;
  forecastDemand: number;
  suggestedImport: number;
  daysRemaining: number | null;
  status: "unknown" | "normal" | "low" | "critical";
}

const aiStatusMeta: Record<
  AiRestockSuggestion["status"],
  { label: string; color: string; textClass: string; bgClass: string }
> = {
  critical: {
    label: "Khẩn cấp",
    color: "red",
    textClass: "text-rose-700",
    bgClass: "bg-rose-50 border-rose-100",
  },
  low: {
    label: "Sắp hết",
    color: "orange",
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 border-amber-100",
  },
  normal: {
    label: "Bình thường",
    color: "green",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50 border-emerald-100",
  },
  unknown: {
    label: "Chưa có dữ liệu",
    color: "default",
    textClass: "text-slate-600",
    bgClass: "bg-slate-50 border-slate-100",
  },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const productCategories: Record<string, string[]> = {
  "Cà phê": ["Cà phê hạt", "Cà phê bột"],
  "Hoa quả": ["Táo", "Lê", "Ổi", "Cóc", "Cam", "Chanh"],
  "Sữa": ["Sữa tươi", "Sữa ông thọ"],
  "Đường": ["Đường trắng", "Đường vàng"],
  "Đồ ăn vặt": ["Hoa hướng dương", "Xúc xích"]
};

const categoryOptions = Object.keys(productCategories).map(k => ({ value: k, label: k }));

const emptyEntry = (): StockEntry => ({
  category: "",
  productDetail: "",
  quantity: "",
  unit: "",
  supplierName: "",
  price: "",
  expiryDate: "",
});

const unitOptions = [
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Lít (l)" },
  { value: "ml", label: "Mililít (ml)" },
  { value: "cái", label: "Cái (pcs)" },
  { value: "bag", label: "Bịch" },
];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatExpiryDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(value))
    : "Không có hạn dùng";

const getTodayInputValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

const isPastDateInputValue = (value?: string) =>
  Boolean(value && value < getTodayInputValue());

export default function StockManagement() {
  const [batches, setBatches] = useState<StockEntryBatch[]>([]);
  const [inventoryReport, setInventoryReport] = useState<InventorySummary[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiRestockSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reserveDays, setReserveDays] = useState<7 | 14>(7);
  const [minStock, setMinStock] = useState(0);
  const [activeStockMenu, setActiveStockMenu] = useState<"IMPORT" | "EXPORT" | "PRODUCIBLE">("IMPORT");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [actionType, setActionType] = useState<"IMPORT" | "EXPORT">("IMPORT");
  const [entries, setEntries] = useState<StockEntry[]>([emptyEntry()]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [categorySearch, setCategorySearch] = useState("");
  const [expandedInventoryKeys, setExpandedInventoryKeys] = useState<Array<string | number>>([]);
  const auth = useRecoilValue(authState);
  const todayInputValue = getTodayInputValue();

  const exportCategoryOptions = useMemo(() => {
    const available = Array.from(new Set(inventoryReport.filter(i => i.quantity > 0).map(i => i.category)));
    return available.map(c => ({ value: c, label: c }));
  }, [inventoryReport]);

  const filteredAndSortedInventory = useMemo(() => {
    let result = inventoryReport;
    if (filterCategory) {
      result = result.filter(item => item.category === filterCategory);
    }
    const normalizedSearch = categorySearch.trim().toLowerCase();
    if (normalizedSearch) {
      result = result.filter((item) =>
        item.category?.toLowerCase().includes(normalizedSearch),
      );
    }
    return [...result].sort((a, b) => {
      const categoryDiff = (a.category || "").localeCompare(b.category || "", "vi");
      if (categoryDiff !== 0) return categoryDiff;
      return (a.productDetail || "").localeCompare(b.productDetail || "", "vi");
    });
  }, [inventoryReport, filterCategory, categorySearch]);

  const urgentAiSuggestions = useMemo(
    () =>
      aiSuggestions
        .filter((item) => item.status === "critical" || item.status === "low")
        .slice(0, 4),
    [aiSuggestions],
  );

  const aiImportCount = useMemo(
    () => aiSuggestions.filter((item) => item.suggestedImport > 0).length,
    [aiSuggestions],
  );

  const aiCriticalCount = useMemo(
    () => aiSuggestions.filter((item) => item.status === "critical").length,
    [aiSuggestions],
  );

  const producibleData = useMemo(() => {
    const data = products
      .filter((p) => p.recipe && Array.isArray(p.recipe) && p.recipe.length > 0)
      .map((product) => {
        let maxQty = 999999;
        let isConfigured = false;
        for (const ing of product.recipe!) {
          if (!ing.category || !ing.productDetail) continue;
          isConfigured = true;
          const amountNeeded = Number(ing.amount);
          if (amountNeeded <= 0) continue;

          const invItem = inventoryReport.find(
            (i: any) =>
              i.category?.trim().toLowerCase() === ing.category.trim().toLowerCase() &&
              i.productDetail?.trim().toLowerCase() === ing.productDetail.trim().toLowerCase()
          );
          const invQty = invItem ? Number(invItem.quantity) : 0;

          const possible = Math.floor(invQty / amountNeeded);
          if (possible < maxQty) maxQty = possible;
        }

        const quantity = maxQty === 999999 || !isConfigured ? 0 : maxQty;
        let status = "";
        if (quantity === 0) status = "Hết hàng";
        else if (quantity < 10) status = "Sắp hết hàng";
        else status = "Đủ nguyên liệu";

        return { name: product.name, quantity, status };
      });

    return data.filter((d) => d.quantity > 0).sort((a, b) => b.quantity - a.quantity);
  }, [products, inventoryReport]);

  const filteredBatchesBySearch = useMemo(() => {
    return batches.filter((batch) => {
      const matchEmp = !searchEmployee || (batch.user?.name || "(Không xác định)") === searchEmployee;
      let matchDate = true;
      if (startDate || endDate) {
        const d = new Date(batch.createdAt);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const localDateString = `${year}-${month}-${day}`;
          if (startDate && localDateString < startDate) matchDate = false;
          if (endDate && localDateString > endDate) matchDate = false;
        }
      }
      return matchEmp && matchDate;
    });
  }, [batches, searchEmployee, startDate, endDate]);

  const employeeSummaryData = useMemo(() => {
    if (!searchEmployee) return [];

    const summaryMap: Record<string, { productDetail: string; unit: string; importQty: number; exportQty: number }> = {};
    
    filteredBatchesBySearch.forEach(batch => {
      const isExport = batch.entries.some(e => e.type === "EXPORT");
      batch.entries.forEach(e => {
        const key = `${e.category}-${e.productDetail}-${e.unit}`;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            productDetail: e.productDetail,
            unit: e.unit,
            importQty: 0,
            exportQty: 0,
          };
        }
        if (isExport) summaryMap[key].exportQty += Number(e.quantity);
        else summaryMap[key].importQty += Number(e.quantity);
      });
    });

    return Object.values(summaryMap).sort((a, b) => a.productDetail.localeCompare(b.productDetail));
  }, [filteredBatchesBySearch, searchEmployee]);

  const fetchStockData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesRes, inventoryRes, productsRes, usersRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/stock/batches`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/stock/inventory`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/product`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/user`)
      ]);
      setBatches(batchesRes.data);
      setInventoryReport(inventoryRes.data);
      setProducts(productsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi lấy dữ liệu kho.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAiSuggestions = useCallback(async () => {
    setAiLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/stock/ai-suggestions`,
        {
          params: {
            reserveDays,
            minStock,
          },
        },
      );
      setAiSuggestions(response.data);
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi lấy gợi ý nhập hàng.");
    } finally {
      setAiLoading(false);
    }
  }, [minStock, reserveDays]);

  useEffect(() => {
    void fetchStockData();
  }, [fetchStockData]);

  useEffect(() => {
    void fetchAiSuggestions();
  }, [fetchAiSuggestions]);

  const handleSubmit = async () => {
    // Validate
    const formattedEntries = entries.filter(
      (entry) => entry.category && entry.productDetail && entry.quantity && entry.unit
    );

    if (formattedEntries.length === 0) {
      message.error("Vui lòng nhập đầy đủ thông tin phân loại, sản phẩm, số lượng, đơn vị!");
      return;
    }

    if (formattedEntries.some((entry) => Number(entry.quantity) < 0 || (entry.price && Number(entry.price) < 0))) {
      message.error("Số lượng và đơn giá không được là số âm.");
      return;
    }

    if (actionType === "IMPORT" && formattedEntries.some((entry) => !entry.expiryDate)) {
      message.error("Vui lòng nhập ngày hết hạn cho từng nguyên liệu.");
      return;
    }

    const expiredEntry = actionType === "IMPORT"
      ? formattedEntries.find((entry) => isPastDateInputValue(entry.expiryDate))
      : undefined;

    if (expiredEntry) {
      message.error(`Không thể nhập kho ${expiredEntry.productDetail} vì ngày hết hạn đã qua.`);
      return;
    }

    try {
      setSubmitting(true);
      const url = actionType === "IMPORT" 
        ? `${process.env.NEXT_PUBLIC_API_URL}/stock/add-multiple`
        : `${process.env.NEXT_PUBLIC_API_URL}/stock/export`;

      await axios.post(url, {
        userId: auth?.user?.id,
        entries: formattedEntries,
      });
      message.success(actionType === "IMPORT" ? "Nhập kho thành công!" : "Xuất kho thành công!");
      setEntries([emptyEntry()]);
      setIsModalOpen(false);
      await Promise.all([fetchStockData(), fetchAiSuggestions()]);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || `Lỗi khi ${actionType === "IMPORT" ? "nhập" : "xuất"} kho.`;
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/stock/batches/${id}`,
      );
      message.success("Xóa thành công!");
      await Promise.all([fetchStockData(), fetchAiSuggestions()]);
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi xóa.");
    }
  };

  const handleEntryChange = (
    index: number,
    field: keyof StockEntry,
    value: string | number,
  ) => {
    setEntries((prev) =>
      prev.map((entry, entryIndex) => {
        if (entryIndex === index) {
          const newEntry = { ...entry, [field]: String(value) };
          // Nếu đổi category thì reset lại productDetail và cài đặt đơn vị mặc định
          if (field === "category") {
            newEntry.productDetail = "";
            const categoryValue = String(value);
            if (["Đường", "Cà phê", "Hoa quả"].includes(categoryValue)) {
              newEntry.unit = "kg";
            } else if (categoryValue === "Sữa") {
              newEntry.unit = "l";
            } else if (categoryValue === "Đồ ăn vặt") {
              newEntry.unit = "cái";
            }
          }
          return newEntry;
        }
        return entry;
      })
    );
  };

  const addNewEntry = () => {
    setEntries((prev) => [...prev, emptyEntry()]);
  };

  const removeEntry = (index: number) => {
    if (entries.length === 1) {
      message.warning("Phải có ít nhất một dòng liệt kê.");
      return;
    }

    setEntries((prev) => prev.filter((_, entryIndex) => entryIndex !== index));
  };

  // Tính cards statistics
  const totalImportBatches = useMemo(() => batches.filter(b => b.entries.some(e => e.type === "IMPORT")).length, [batches]);
  const totalExportBatches = useMemo(() => batches.filter(b => b.entries.some(e => e.type === "EXPORT")).length, [batches]);
  const inventoryTypesCount = inventoryReport.length;

  const summaryCards = [
    {
      label: "Lần nhập kho",
      value: totalImportBatches,
      icon: <ArrowDownRight className="h-5 w-5 text-sky-700" />,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Lần xuất kho",
      value: totalExportBatches,
      icon: <ArrowUpRight className="h-5 w-5 text-rose-700" />,
      tone: "bg-rose-50 text-rose-700",
    },
    {
      label: "Mặt hàng đang tồn",
      value: inventoryTypesCount,
      icon: <Boxes className="h-5 w-5 text-emerald-700" />,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Tổng mã kho (Nhập)",
      value: batches.reduce((sum, b) => sum + b.entries.filter(e => e.type !== "EXPORT").length, 0),
      icon: <Warehouse className="h-5 w-5 text-amber-700" />,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  const renderBatchList = (filteredBatches: StockEntryBatch[]) => (
    <div className="max-h-[380px] overflow-y-auto pr-3 custom-scrollbar">
      <Collapse
        accordion
        ghost
        items={filteredBatches.map((batch) => {
          const isExportBatch = batch.entries.some(e => e.type === "EXPORT");
          const isConsumeBatch = batch.entries.some(e => e.type === "CONSUME");
          const isImportBatch =  !isExportBatch && !isConsumeBatch;
          return {
            key: batch.id,
            label: (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold flex items-center gap-2">
                    {isConsumeBatch ? <TrendingUp className="h-4 w-4 text-amber-500"/> : isExportBatch ? <ArrowUpRight className="h-4 w-4 text-rose-500"/> : <ArrowDownRight className="h-4 w-4 text-emerald-500"/>}
                    Phiếu {isConsumeBatch ? "Tiêu thụ PBH" : isExportBatch ? "Xuất" : "Nhập"} <span className="font-mono text-slate-500 px-2 py-0.5 bg-slate-100/80 rounded-md text-[11px] border border-slate-200">#{isConsumeBatch ? "PT" : isExportBatch ? "PX" : "PN"}{batch.id.slice(-6).toUpperCase()}</span>
                    <span className="text-slate-400 font-normal ml-1">({formatDateTime(batch.createdAt)})</span>
                  </span>
                  <Tag color={isConsumeBatch ? "gold" : isExportBatch ? "red" : "blue"}>{batch.entries.length} SP</Tag>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Người thao tác: <span className="font-medium text-slate-700">{batch.user?.name || "(Không xác định)"}</span>
                </div>
              </div>
            ),
            children: (
              <div className="space-y-2">
                <Table
                  columns={[
                    { title: "STT", key: "stt", align: "center", render: (_text: any, _record: any, index: number) => <span className="font-medium text-slate-600">{index + 1}</span> },
                    { title: "Mặt hàng", dataIndex: "productDetail", key: "productDetail" },
                    { title: "SL", dataIndex: "quantity", key: "quantity", align: "center" as const },
                    { title: "Đơn vị", dataIndex: "unit", key: "unit", align: "center" as const },
                    { title: "Đơn giá", dataIndex: "price", key: "price", align: "right" as const, render: (val: number) => val ? formatCurrency(val) : "-" },
                    ...(isImportBatch ? [{ title: "NCC", dataIndex: "supplierName", key: "supplierName" }] : [])
                  ]}
                  dataSource={batch.entries}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
                <Popconfirm
                  title="Xóa phiếu này? Dữ liệu tồn kho sẽ bị ảnh hưởng!"
                  onConfirm={() => handleDeleteBatch(batch.id)}
                >
                  <button className="text-xs text-rose-500 hover:underline mt-2 flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Xóa phiếu
                  </button>
                </Popconfirm>
              </div>
            )
          };
        })}
      />
    </div>
  );

  const renderInventoryExpiryDetails = (record: InventorySummary) => {
    const activeLots = (record.expiryDetails || []).map((lot) => ({
      ...lot,
      status: "Còn hạn",
    }));
    const expiredLots = (record.expiredDetails || []).map((lot) => ({
      ...lot,
      status: "Hết hạn",
    }));
    const lots = [...activeLots, ...expiredLots];

    if (lots.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Chưa có chi tiết hạn dùng cho nguyên liệu này.
        </div>
      );
    }

    return (
      <Table
        columns={[
          {
            title: "Ngày hết hạn",
            dataIndex: "expiryDate",
            key: "expiryDate",
            render: (value: string | null) => formatExpiryDate(value),
          },
          {
            title: "Số lượng",
            dataIndex: "quantity",
            key: "quantity",
            align: "right" as const,
            render: (value: number, lot: any) => (
              <span className="font-semibold text-slate-800">
                {formatNumber(value)} {lot.unit || record.unit}
              </span>
            ),
          },
          {
            title: "Giá TB",
            dataIndex: "averagePrice",
            key: "averagePrice",
            align: "right" as const,
            render: (value: number) => value ? formatCurrency(value) : "-",
          },
          {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            align: "center" as const,
            render: (value: string) => (
              <Tag color={value === "Hết hạn" ? "red" : "green"}>{value}</Tag>
            ),
          },
        ]}
        dataSource={lots}
        rowKey={(lot: any, index) => `${lot.expiryDate || "none"}-${lot.status}-${index}`}
        pagination={false}
        size="small"
      />
    );
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STAFF"]}>
      <section className="h-[calc(100dvh-120px)] overflow-y-auto bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          {/* Header */}
          <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5 flex-shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.18),_transparent_22%)]" />
            <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                  <Sparkles className="h-4 w-4" />
                  Quản trị hàng hóa
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Nhập / Xuất Kho
                </h1>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 flex-shrink-0">
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

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-5">
            <div className="flex flex-col sm:flex-row gap-4 justify-between w-full">
              <button
                className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                onClick={() => {
                  setActiveStockMenu("IMPORT");
                  setActionType("IMPORT");
                  setEntries([emptyEntry()]);
                  setIsModalOpen(true);
                }}
              >
                Tạo phiếu nhập kho
              </button>
              <button
                className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-rose-700"
                onClick={() => {
                  setActiveStockMenu("EXPORT");
                  setActionType("EXPORT");
                  setEntries([emptyEntry()]);
                  setIsModalOpen(true);
                }}
              >
                Tạo phiếu xuất kho
              </button>
              <button
                className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
                onClick={() => {
                  setActiveStockMenu("PRODUCIBLE");
                  setIsModalOpen(true);
                }}
              >
                Số sản phẩm có thể làm ra
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    AI gợi ý nhập hàng
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Dựa trên số bán trung bình 7 ngày gần nhất
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  value={reserveDays}
                  onChange={(value) =>
                    setReserveDays(Number(value) === 14 ? 14 : 7)
                  }
                  options={[
                    { label: "Dự trữ 7 ngày", value: 7 },
                    { label: "Dự trữ 14 ngày", value: 14 },
                  ]}
                />
                <InputNumber
                  min={0}
                  precision={0}
                  value={minStock}
                  onChange={(value) =>
                    setMinStock(Math.max(0, Number(value) || 0))
                  }
                  addonBefore="Tồn tối thiểu"
                  className="w-48"
                />
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  {aiCriticalCount} khẩn cấp
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
                  <PackageCheck className="h-4 w-4" />
                  {aiImportCount} cần nhập
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Cảnh báo hết hàng
                  </h3>
                  <Clock3 className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-4 space-y-3">
                  {aiLoading ? (
                    <div className="flex justify-center py-8">
                      <Spin />
                    </div>
                  ) : urgentAiSuggestions.length > 0 ? (
                    urgentAiSuggestions.map((item) => {
                      const meta = aiStatusMeta[item.status];
                      return (
                        <div
                          key={`${item.category}-${item.productDetail}-${item.unit}`}
                          className={`rounded-2xl border px-4 py-3 ${meta.bgClass}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.productDetail}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Tồn {formatNumber(item.stock)} {item.unit} · bán {formatNumber(item.avgSalePerDay)}/{item.unit}/ngày
                              </p>
                            </div>
                            <Tag color={meta.color}>{meta.label}</Tag>
                          </div>
                          <p className={`mt-2 text-sm font-medium ${meta.textClass}`}>
                            {item.daysRemaining !== null
                              ? `Sẽ hết sau khoảng ${formatNumber(item.daysRemaining)} ngày`
                              : "Chưa đủ dữ liệu để dự đoán"}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      Chưa có mặt hàng sắp hết.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Gợi ý nhập hàng
                  </h3>
                  <Tag color="blue">Công thức rule-based</Tag>
                </div>
                <Table<AiRestockSuggestion>
                  columns={[
                    {
                      title: "Mặt hàng",
                      dataIndex: "productDetail",
                      key: "productDetail",
                      render: (text: string, record) => (
                        <div>
                          <p className="font-semibold text-slate-900">{text}</p>
                          <p className="text-xs text-slate-500">{record.category}</p>
                        </div>
                      ),
                    },
                    {
                      title: "Tồn kho",
                      dataIndex: "stock",
                      key: "stock",
                      align: "right" as const,
                      render: (value: number, record) => (
                        <span className="font-medium">
                          {formatNumber(value)} {record.unit}
                        </span>
                      ),
                    },
                    {
                      title: "Bán/ngày",
                      dataIndex: "avgSalePerDay",
                      key: "avgSalePerDay",
                      align: "right" as const,
                      render: (value: number) => formatNumber(value),
                    },
                    {
                      title: "Còn bán",
                      dataIndex: "daysRemaining",
                      key: "daysRemaining",
                      align: "right" as const,
                      render: (value: number | null) =>
                        value !== null ? `${formatNumber(value)} ngày` : "Không xác định",
                    },
                    {
                      title: "Gợi ý nhập",
                      dataIndex: "suggestedImport",
                      key: "suggestedImport",
                      align: "right" as const,
                      render: (value: number, record) =>
                        value > 0 ? (
                          <span className="font-semibold text-indigo-700">
                            {formatNumber(value)} {record.unit}
                          </span>
                        ) : (
                          <Tag color="green">Không cần</Tag>
                        ),
                    },
                    {
                      title: "Trạng thái",
                      dataIndex: "status",
                      key: "status",
                      align: "center" as const,
                      render: (value: AiRestockSuggestion["status"]) => (
                        <Tag color={aiStatusMeta[value].color}>
                          {aiStatusMeta[value].label}
                        </Tag>
                      ),
                    },
                  ]}
                  dataSource={aiSuggestions}
                  rowKey={(record) =>
                    `${record.category}-${record.productDetail}-${record.unit}`
                  }
                  loading={aiLoading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                  scroll={{ x: 720 }}
                />
              </div>
            </div>
          </div>

          <Modal
            title={null}
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            footer={null}
            width={850}
            centered
            destroyOnClose
            styles={{ body: { padding: 0 } }}
            modalRender={(node) => (
              <div className="rounded-[16px] bg-white p-6 shadow-2xl" style={{ borderTop: "8px solid #1e293b", borderBottom: "8px solid #1e293b" }}>
                {node}
              </div>
            )}
          >
            <div className="flex flex-col gap-6 xl:min-h-0 xl:flex-1">
              
              {/* Form Nhập/Xuất */}
              <div className={`xl:flex xl:flex-col ${activeStockMenu === "PRODUCIBLE" ? "hidden" : ""}`}>
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {actionType === "IMPORT" ? "Tạo phiếu nhập kho" : "Tạo phiếu xuất kho"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {actionType === "IMPORT"
                      ? "Ghi nhận nguyên liệu nhập kho kèm ngày hết hạn."
                      : "Xuất kho theo nguyên tắc ưu tiên hạn dùng gần nhất."}
                  </p>
                </div>
              </div>
              <div className="hidden">
                <Tabs 
                  activeKey={actionType}
                  onChange={(key) => {
                    setActionType(key as any);
                    setEntries([emptyEntry()]);
                  }}
                  className="font-semibold"
                  items={[
                    { key: "IMPORT", label: "Phiếu Nhập Kho" },
                    { key: "EXPORT", label: "Phiếu Xuất Kho" }
                  ]}
                />
              </div>

              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight: '450px', minHeight: '320px' }}>
                {entries.map((entry, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        placeholder="Chọn Loại sản phẩm"
                        value={entry.category || undefined}
                        onChange={(value) => handleEntryChange(index, "category", value)}
                        options={actionType === "IMPORT" ? categoryOptions : exportCategoryOptions}
                        className="h-11"
                      />
                      <Select
                        placeholder="Chọn Chi tiết sản phẩm"
                        value={entry.productDetail || undefined}
                        onChange={(value) => {
                          handleEntryChange(index, "productDetail", value);
                          if (actionType === "EXPORT") {
                            const match = inventoryReport.find(i => i.category === String(entry.category) && i.productDetail === String(value) && i.quantity > 0);
                            if (match) {
                              handleEntryChange(index, "unit", match.unit);
                              handleEntryChange(index, "price", String(match.averagePrice || 0));
                            }
                          }
                        }}
                        options={
                          actionType === "IMPORT"
                            ? (productCategories[entry.category] || []).map((d) => ({
                                value: d,
                                label: d,
                              }))
                            : inventoryReport
                                .filter((i) => i.category === entry.category && i.quantity > 0)
                                .map((i) => ({ value: i.productDetail, label: `${i.productDetail} (Tồn: ${i.quantity} ${i.unit})` }))
                        }
                        disabled={!entry.category}
                        className="h-11"
                      />
                    </div>
                    
                    <div className={`grid grid-cols-1 gap-3 ${actionType === "IMPORT" ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Số lượng"
                        value={entry.quantity}
                        onChange={(e) => handleEntryChange(index, "quantity", e.target.value)}
                        className="h-11 rounded-2xl"
                      />
                      <Select
                        placeholder="Đơn vị"
                        value={entry.unit || undefined}
                        onChange={(value) => handleEntryChange(index, "unit", value)}
                        options={unitOptions}
                        className="h-11"
                        disabled={actionType === "EXPORT"}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Đơn giá (VNĐ)"
                        value={entry.price}
                        onChange={(e) => handleEntryChange(index, "price", e.target.value)}
                        className="h-11 rounded-2xl"
                      />
                      {actionType === "IMPORT" && (
                        <Input
                          placeholder="Nhà cung cấp"
                          value={entry.supplierName}
                          onChange={(e) => handleEntryChange(index, "supplierName", e.target.value)}
                          className="h-11 rounded-2xl"
                        />
                      )}
                      {actionType === "IMPORT" && (
                        <Input
                          type="date"
                          placeholder="Ngày hết hạn"
                          value={entry.expiryDate}
                          min={todayInputValue}
                          onChange={(e) => handleEntryChange(index, "expiryDate", e.target.value)}
                          className="h-11 rounded-2xl"
                        />
                      )}
                    </div>
                    
                    <Button
                      danger
                      type="text"
                      className="absolute right-2 top-2 text-rose-500 hover:text-rose-700"
                      onClick={() => removeEntry(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row flex-shrink-0 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={addNewEntry}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  Thêm dòng sản phẩm
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting || loading}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    actionType === "IMPORT" ? "bg-slate-900 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  <PackagePlus className="h-4 w-4" />
                  {submitting ? "Đang xử lý..." : (actionType === "IMPORT" ? "Lưu Phiếu Nhập Kho" : "Chốt Phiếu Xuất Kho")}
                </button>
              </div>
              </div>
            </div>

            {/* Biểu đồ số sản phẩm có thể làm ra */}
            <div className={`flex-shrink-0 rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6 mb-4 ${activeStockMenu !== "PRODUCIBLE" ? "hidden" : ""}`}>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Số sản phẩm có thể làm ra
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Phân tích dựa trên lượng nguyên liệu đang tồn kho
                  </p>
                </div>
                <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  {producibleData.length} sản phẩm
                </div>
              </div>

              <div className="mt-6 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-white p-6 shadow-sm" style={{ maxHeight: '450px', minHeight: '320px', fontFamily: "'Courier New', Courier, monospace" }}>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold uppercase tracking-widest text-slate-800">BẢNG DỰ BÁO SẢN XUẤT</h3>
                  <p className="text-sm text-slate-500">----------------------------------------------------</p>
                  <p className="text-xs text-slate-500 mt-1">Dựa trên tồn kho hiện tại</p>
                </div>
                <table className="w-full text-sm text-slate-800">
                  <thead>
                    <tr className="border-b-2 border-dashed border-slate-300">
                      <th className="py-2 text-left font-bold w-16">STT</th>
                      <th className="py-2 text-left font-bold">TÊN SẢN PHẨM</th>
                      <th className="py-2 text-right font-bold w-32">SỐ LƯỢNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {producibleData.length > 0 ? (
                      producibleData.map((item, index) => (
                        <tr key={index} className="border-b border-dashed border-slate-200 hover:bg-slate-50">
                          <td className="py-3 text-left">{index + 1}</td>
                          <td className="py-3 text-left font-medium">{item.name}</td>
                          <td className="py-3 text-right font-bold text-indigo-700">{formatNumber(item.quantity)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-500 italic">Không có sản phẩm nào có thể tạo được (Thiếu nguyên liệu)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="mt-8 text-center text-xs text-slate-500">
                  <p>----------------------------------------------------</p>
                  <p className="mt-2">Đây là dữ liệu ước tính dựa trên tồn kho hiện tại.</p>
                </div>
              </div>
            </div>
          </Modal>

            {/* Báo cáo tồn & Lịch sử */}
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6 xl:flex xl:flex-col xl:min-h-0">
              <Tabs 
                  defaultActiveKey="REPORT"
                  items={[
                    { 
                      key: "REPORT", 
                      label: "Báo cáo tồn kho hiện tại",
                      children: (
                        <div className="xl:flex-1 flex flex-col mt-2 gap-3">
                           <div className="flex flex-wrap items-center gap-3">
                             <Select
                               placeholder="Lọc theo Loại sản phẩm"
                               value={filterCategory}
                               onChange={(val) => setFilterCategory(val)}
                               options={[{ label: "Tất cả", value: "" }, ...categoryOptions]}
                               className="w-56"
                               showSearch
                              />
                             <Input
                               allowClear
                               prefix={<Search className="h-4 w-4 text-slate-400" />}
                               placeholder="Tìm theo danh mục"
                               value={categorySearch}
                               onChange={(event) => setCategorySearch(event.target.value)}
                               className="h-9 w-64 rounded-xl"
                             />
                            </div>
                           <Table
                              columns={[
                                { title: "Loại SP", dataIndex: "category", key: "category" },
                                { title: "Chi tiết", dataIndex: "productDetail", key: "productDetail" },
                                { title: "SL Tồn", dataIndex: "quantity", key: "quantity", align: "center" as const, render: (val) => val <= 0 ? <Tag color="red">Hết hàng</Tag> : <span className="font-bold text-sky-700">{formatNumber(val)}</span> },
                                { title: "Hết hạn", dataIndex: "expiredQuantity", key: "expiredQuantity", align: "center" as const, render: (val: number) => Number(val || 0) > 0 ? <Tag color="red">{formatNumber(val)}</Tag> : "-" },
                                { title: "Đơn vị", dataIndex: "unit", key: "unit", align: "center" as const },
                                { title: "Giá Trung Bình", dataIndex: "averagePrice", key: "averagePrice", align: "right" as const, render: (val: number) => val ? formatCurrency(val) : "-" },
                                { title: "Tổng Tiền", key: "totalPrice", align: "right" as const, render: (_, record) => record.quantity > 0 && record.averagePrice ? <span className="font-semibold text-emerald-600">{formatCurrency(record.quantity * record.averagePrice)}</span> : "-" },
                              ]}
                              dataSource={filteredAndSortedInventory}
                              rowKey={(record) => `${record.category}-${record.productDetail}-${record.unit}`}
                              expandable={{
                                expandedRowKeys: expandedInventoryKeys,
                                onExpandedRowsChange: (keys) => setExpandedInventoryKeys(keys as Array<string | number>),
                                expandedRowRender: renderInventoryExpiryDetails,
                              }}
                              onRow={(record) => ({
                                onClick: () => {
                                  const key = `${record.category}-${record.productDetail}-${record.unit}`;
                                  setExpandedInventoryKeys((prev) =>
                                    prev.includes(key)
                                      ? prev.filter((item) => item !== key)
                                      : [key],
                                  );
                                },
                                className: "cursor-pointer",
                              })}
                              pagination={{ pageSize: 8 }}
                              size="small"
                              scroll={{ y: 320 }}
                           />
                        </div>
                      )
                    },
                    { 
                      key: "HISTORY", 
                      label: "Lịch sử Giao dịch",
                      children: (
                        <div className="mt-2">
                          {loading ? (
                            <div className="flex justify-center p-8"><Spin /></div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap gap-2 items-center">
                                <Select 
                                  placeholder="Chọn nhân viên..." 
                                  value={searchEmployee || undefined}
                                  onChange={(val) => setSearchEmployee(val || "")}
                                  style={{ width: 180 }}
                                  allowClear
                                  showSearch
                                  options={[...Array.from(new Set(users.map(u => u.name)))].map(name => ({ label: name, value: name }))}
                                />
                                <div className="flex items-center gap-2">
                                  <Input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)} 
                                    style={{ width: 140 }}
                                    allowClear
                                  />
                                  <span className="text-slate-400 text-sm">đến</span>
                                  <Input 
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)} 
                                    style={{ width: 140 }}
                                    allowClear
                                  />
                                </div>
                              </div>
                              
                              {searchEmployee && (
                                <div className="p-3 bg-indigo-50/50 rounded-[16px] border border-indigo-100/60 mb-2">
                                  <p className="text-sm font-semibold text-slate-800 mb-2">Tổng kết nhập/xuất của: <span className="text-indigo-700">{searchEmployee}</span></p>
                                  <Table
                                    columns={[
                                      { title: "Mặt hàng", dataIndex: "productDetail", key: "productDetail" },
                                      { title: "Tổng Nhập", dataIndex: "importQty", key: "importQty", align: "center" as const, render: (val) => <span className="text-emerald-600 font-semibold">{val > 0 ? `+${val}` : 0}</span> },
                                      { title: "Tổng Xuất", dataIndex: "exportQty", key: "exportQty", align: "center" as const, render: (val) => <span className="text-rose-500 font-semibold">{val > 0 ? `-${val}` : 0}</span> },
                                      { title: "Đơn vị", dataIndex: "unit", key: "unit", align: "center" as const },
                                    ]}
                                    dataSource={employeeSummaryData}
                                    rowKey={(rec) => rec.productDetail + rec.unit}
                                    pagination={false}
                                    size="small"
                                    scroll={{ y: 220 }}
                                  />
                                </div>
                              )}
                              <Tabs 
                                size="small"
                                type="card"
                                items={[
                                  {
                                    key: "ALL",
                                    label: "Tất cả xuất/nhập",
                                    children: renderBatchList(filteredBatchesBySearch.filter(b => !b.entries.some(e => e.type === "CONSUME")))
                                  },
                                  {
                                    key: "IMPORT",
                                    label: "Nhập Kho",
                                    children: renderBatchList(filteredBatchesBySearch.filter(b => b.entries.some(e => e.type === "IMPORT")))
                                  },
                                  {
                                    key: "EXPORT",
                                    label: "Xuất Kho",
                                    children: renderBatchList(filteredBatchesBySearch.filter(b => b.entries.some(e => e.type === "EXPORT")))
                                  },
                                  {
                                    key: "CONSUME",
                                    label: "Nguyên liệu tiêu thụ",
                                    children: renderBatchList(filteredBatchesBySearch.filter(b => b.entries.some(e => e.type === "CONSUME")))
                                  },
                                ]}
                              />
                            </div>
                          )}
                        </div>
                      )
                    }
                  ]}
              />
            </div>

        </div>
      </section>
    </ProtectedRoute>
  );
}
