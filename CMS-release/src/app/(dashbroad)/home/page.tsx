"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRecoilState } from "recoil";
import {
  BarChart3,
  CalendarRange,
  Coffee,
  Package,
  ReceiptText,
  Sparkles,
  TrendingUp,
  Users,
  Warehouse,
  Download,
} from "lucide-react";
import { Collapse, Table } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  AreaChart,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Area,
  Line,
  Cell,
} from "recharts";
import axios from "axios";
import ProtectedRoute from "@/shared/providers/auth.provider";
import { productState } from "@/shared/store/Atoms/product";
import { ordersState, DashboardOrder } from "@/shared/store/Atoms/order";
import { useGetProduct } from "@/shared/hooks/product";
import { useGetAllOrder } from "@/shared/hooks/order";
import { useGetUser } from "@/shared/hooks/user";
import { Employees } from "@/shared/types/user";
import { Product } from "@/shared/types/product";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);

interface BestSellProduct {
  productName: string;
  quantity: number;
}

interface StockEntry {
  id?: string;
  productDetail?: string;
  ingredient?: string;
  category?: string;
  quantity: string | number;
  unit: string;
  type?: string;
  price?: string | number;
}

interface StockEntryBatch {
  id: string;
  createdAt: string;
  entries: StockEntry[];
  userId?: string;
  user?: { id: string; name: string };
}

const TOP_PRODUCT_GRADIENTS = [
  ["#38bdf8", "#0ea5e9"],
  ["#a78bfa", "#8b5cf6"],
  ["#34d399", "#10b981"],
  ["#fbbf24", "#f59e0b"],
  ["#fb7185", "#ef4444"],
];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const Page = () => {
  const { getProduct } = useGetProduct();
  const { getAllOrders } = useGetAllOrder();
  const { fetchUsers } = useGetUser();
  const hasLoadedDashboard = useRef(false);

  const [employees, setEmployees] = useState<Employees[]>([]);
  const [products, setProducts] = useRecoilState(productState);
  const [orders, setOrders] = useRecoilState(ordersState);
  const [batches, setBatches] = useState<StockEntryBatch[]>([]);
  const [inventoryReport, setInventoryReport] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(new Date().getMonth() + 1);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (hasLoadedDashboard.current) return;

    hasLoadedDashboard.current = true;
    let isMounted = true;

    const fetchDashboardData = async () => {
      try {
        const [usersData, productsData, ordersData, stockBatches, inventoryData, schedulesData] =
          await Promise.all([
            fetchUsers(),
            getProduct(),
            getAllOrders(),
            axios
              .get(`${process.env.NEXT_PUBLIC_API_URL}/stock/batches`)
              .then((response) => response.data),
            axios
              .get(`${process.env.NEXT_PUBLIC_API_URL}/stock/inventory`)
              .then((response) => response.data),
            axios
              .get(`${process.env.NEXT_PUBLIC_API_URL}/schedule`)
              .then((response) => response.data),
          ]);

        if (!isMounted) return;

        setEmployees(usersData);
        setProducts(productsData);
        setOrders(ordersData);
        setBatches(stockBatches);
        setInventoryReport(inventoryData);
        setSchedules(schedulesData);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu dashboard:", error);
      }
    };

    void fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [fetchUsers, getAllOrders, getProduct, setOrders, setProducts]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const batchDate = new Date(batch.createdAt);
      const isTimeMatch =
        selectedMonth === "all"
          ? batchDate.getFullYear() === selectedYear
          : batchDate.getMonth() + 1 === selectedMonth &&
          batchDate.getFullYear() === selectedYear;
      const isUserMatch =
        selectedEmployee === "all" ||
        batch.userId === selectedEmployee ||
        batch.user?.id === selectedEmployee;
      return isTimeMatch && isUserMatch;
    });
  }, [batches, selectedMonth, selectedYear, selectedEmployee]);

  const ingredientSummaryData = useMemo(() => {
    const categoryMap: Record<string, {
      category: string;
      items: Array<{
        productDetail: string;
        unit: string;
        importQty: number;
        exportQty: number;
        consumeQty: number;
        importCost: number;
        exportCost: number;
        consumeCost: number;
        stockCost: number;
        avgPrice: number;
        isTotal?: boolean;
      }>;
      totals: {
        importQty: number;
        exportQty: number;
        consumeQty: number;
        importCost: number;
        exportCost: number;
        consumeCost: number;
        stockCost: number;
      };
    }> = {};

    filteredBatches.forEach(batch => {
      batch.entries.forEach(e => {
        const productDetail = e.productDetail || e.ingredient || "";
        const category = e.category || "Khác";

        if (!categoryMap[category]) {
          categoryMap[category] = {
            category,
            items: [],
            totals: {
              importQty: 0,
              exportQty: 0,
              consumeQty: 0,
              importCost: 0,
              exportCost: 0,
              consumeCost: 0,
              stockCost: 0,
            }
          };
        }

        const invItem = inventoryReport.find((i: any) => i.category === category && i.productDetail === productDetail && i.unit === e.unit);
        const avgPrice = Number(invItem?.averagePrice) || Number(e.price) || 0;
        const qty = Number(e.quantity) || 0;
        const price = Number(e.price) || avgPrice;

        // Find existing item or create new one
        let item = categoryMap[category].items.find(i => i.productDetail === productDetail && i.unit === e.unit);
        if (!item) {
          item = {
            productDetail,
            unit: e.unit,
            importQty: 0,
            exportQty: 0,
            consumeQty: 0,
            importCost: 0,
            exportCost: 0,
            consumeCost: 0,
            stockCost: 0,
            avgPrice,
          };
          categoryMap[category].items.push(item);
        }

        if (e.type === "IMPORT") {
          item.importQty += qty;
          item.importCost += price * qty;
          categoryMap[category].totals.importQty += qty;
          categoryMap[category].totals.importCost += price * qty;
        } else if (e.type === "EXPORT") {
          item.exportQty += qty;
          item.exportCost += price * qty;
          categoryMap[category].totals.exportQty += qty;
          categoryMap[category].totals.exportCost += price * qty;
        } else if (e.type === "CONSUME") {
          item.consumeQty += qty;
          item.consumeCost += avgPrice * qty;
          categoryMap[category].totals.consumeQty += qty;
          categoryMap[category].totals.consumeCost += avgPrice * qty;
        } else {
          item.importQty += qty;
          item.importCost += price * qty;
          categoryMap[category].totals.importQty += qty;
          categoryMap[category].totals.importCost += price * qty;
        }

        item.avgPrice = avgPrice;
        const remainingQty = invItem?.quantity ?? (item.importQty - item.exportQty - item.consumeQty);
        item.stockCost = remainingQty * item.avgPrice;
      });
    });

    Object.values(categoryMap).forEach(catData => {
      catData.totals.stockCost = catData.items.reduce((sum, item) => sum + item.stockCost, 0);
    });

    const result: Array<{
      productDetail: string;
      unit: string;
      importQty: number;
      exportQty: number;
      consumeQty: number;
      importCost: number;
      exportCost: number;
      consumeCost: number;
      stockCost: number;
      startingQty?: number;
      isCategoryHeader?: boolean;
      isTotal?: boolean;
      category?: string;
    }> = [];

    Object.values(categoryMap).forEach(catData => {
      result.push({
        productDetail: `📁 ${catData.category}`,
        unit: "",
        importQty: 0,
        exportQty: 0,
        consumeQty: 0,
        importCost: 0,
        exportCost: 0,
        consumeCost: 0,
        stockCost: 0,
        isCategoryHeader: true,
        category: catData.category,
      });

      catData.items.forEach(item => {
        result.push(item);
      });

      result.push({
        productDetail: `Tổng ${catData.category}`,
        unit: "",
        importQty: catData.totals.importQty,
        exportQty: catData.totals.exportQty,
        consumeQty: catData.totals.consumeQty,
        importCost: catData.totals.importCost,
        exportCost: catData.totals.exportCost,
        consumeCost: catData.totals.consumeCost,
        stockCost: catData.totals.stockCost,
        isTotal: true,
        category: catData.category,
      });
    });

    return result;
  }, [filteredBatches, inventoryReport]);

  const handleExportExcel = () => {
    const headers = ["Danh mục", "Nguyên liệu", "Đơn vị", "Nhập Kho", "Tiền Nhập", "Xuất Kho", "Tiền Xuất", "Đã Bán", "Tiền Bán", "Tồn Kho", "Tiền Tồn"];

    const rows = [];
    let currentCategory = "";

    for (const item of ingredientSummaryData) {
      if (item.isCategoryHeader) {
        currentCategory = item.category || item.productDetail.replace("📁 ", "");
        continue;
      }

      if (item.isTotal) {
        rows.push([
          "TỔNG CỘNG", "", "", "", "", "", "", "", "", "", item.stockCost || 0
        ]);
        continue;
      }

      const resultQty = Number(item.importQty || 0) - Number(item.exportQty || 0) - Number(item.consumeQty || 0);

      rows.push([
        currentCategory,
        item.productDetail,
        item.unit,
        item.importQty || 0,
        item.importCost || 0,
        item.exportQty || 0,
        item.exportCost || 0,
        item.consumeQty || 0,
        item.consumeCost || 0,
        resultQty,
        item.stockCost || 0
      ]);
    }

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_Cao_Xuat_Nhap_Kho_${selectedMonth === "all" ? "Nam" : "Thang_" + selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTopSellingProducts = (
    orderList: DashboardOrder[],
    productList: Product[],
    month: number | "all",
    year: number,
    employeeId: string,
  ) => {
    const filteredOrders = orderList.filter((order) => {
      const orderDate = new Date(order.createdAt);

      let isTimeMatch = false;
      if (month === "all") {
        isTimeMatch = orderDate.getFullYear() === year;
      } else {
        const startDate = new Date(year, month - 1, 1, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        isTimeMatch = orderDate >= startDate && orderDate <= endDate;
      }

      const isUserMatch = employeeId === "all" || order.userId === employeeId;

      return isTimeMatch && isUserMatch;
    });

    let totalProductsSold = 0;
    const productSales: Record<string, { quantity: number; revenue: number }> = {};

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        const product = productList.find(p => p.name === item.productName);
        const price = product?.price || 0;
        const revenue = price * item.quantity;

        if (!productSales[item.productName]) {
          productSales[item.productName] = { quantity: 0, revenue: 0 };
        }

        productSales[item.productName].quantity += item.quantity;
        productSales[item.productName].revenue += revenue;
        totalProductsSold += item.quantity;
      });
    });

    const sortedProducts = Object.entries(productSales)
      .map(([productName, data]) => ({
        productName,
        quantity: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      topProducts:
        sortedProducts.length > 0
          ? sortedProducts
          : [{ productName: "Không có dữ liệu", quantity: 0, revenue: 0 }],
      totalProductsSold,
    };
  };

  const calculateRevenueForMonth = (
    orderList: DashboardOrder[],
    month: number,
    year: number,
    employeeId: string
  ) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const filteredOrders = orderList.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const isTimeMatch = orderDate >= startDate && orderDate <= endDate;
      const isUserMatch = employeeId === "all" || order.userId === employeeId;
      return isTimeMatch && isUserMatch;
    });

    const totalRevenue = filteredOrders.reduce(
      (acc, order) => acc + (Number(order.amount) || 0),
      0,
    );

    return {
      revenue: totalRevenue,
      totalOrders: filteredOrders.length,
    };
  };

  const { topProducts, totalProductsSold } = useMemo(
    () => getTopSellingProducts(orders, products, selectedMonth, selectedYear, selectedEmployee),
    [orders, products, selectedMonth, selectedYear, selectedEmployee],
  );

  const calculateWeeklyDataForMonth = (month: number, year: number, employeeId: string) => {
    const weeks: Array<{
      week: string;
      revenue: number;
      totalOrders: number;
      stockCost: number;
      totalSalary: number;
      profit: number;
    }> = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    // Define weeks: 1-7, 8-14, 15-21, 22-28, 29-end
    const weekRanges = [
      { start: 1, end: 7, label: 'Tuần 1' },
      { start: 8, end: 14, label: 'Tuần 2' },
      { start: 15, end: 21, label: 'Tuần 3' },
      { start: 22, end: 28, label: 'Tuần 4' },
    ];

    // Add week 5 if month has more than 28 days
    if (daysInMonth > 28) {
      weekRanges.push({ start: 29, end: daysInMonth, label: 'Tuần 5' });
    }

    weekRanges.forEach(week => {
      const startDate = new Date(year, month - 1, week.start, 0, 0, 0);
      const endDate = new Date(year, month - 1, week.end, 23, 59, 59);

      // Calculate revenue for this week
      const weekOrders: DashboardOrder[] = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        const isTimeMatch = orderDate >= startDate && orderDate <= endDate;
        const isUserMatch = employeeId === "all" || order.userId === employeeId;
        return isTimeMatch && isUserMatch;
      });
      const revenue = weekOrders.reduce((acc, order) => acc + (Number(order.amount) || 0), 0);
      const totalOrders = weekOrders.length;

      // Calculate salary for this week
      const weekSchedules = schedules.filter((s) => {
        const d = new Date(s.date);
        return (
          d >= startDate &&
          d <= endDate &&
          (employeeId === "all" || s.userId === employeeId)
        );
      });
      const salaryMap: Record<string, number> = {};
      weekSchedules.forEach((s) => {
        const user = employees.find((e) => e.id === s.userId);
        if (user && user.hourlyRate) {
          salaryMap[s.userId] = (salaryMap[s.userId] || 0) + s.hoursWorked * user.hourlyRate;
        }
      });
      const totalSalary = Object.values(salaryMap).reduce((acc, sal) => acc + sal, 0);

      // Calculate stock costs for this week
      const weekBatches = batches.filter((batch) => {
        const batchDate = new Date(batch.createdAt);
        return (
          batchDate >= startDate &&
          batchDate <= endDate &&
          (employeeId === "all" || batch.userId === employeeId || batch.user?.id === employeeId)
        );
      });
      const totalUsageCost = weekBatches.reduce((acc, batch) => {
        return acc + batch.entries.reduce((entryAcc, e) => {
          const type = (e.type || "").toUpperCase();
          if (type !== "EXPORT" && type !== "CONSUME") return entryAcc;

          const invItem = inventoryReport.find((i: any) => i.category === e.category && i.productDetail === e.productDetail && i.unit === e.unit);
          const avgPrice = invItem?.averagePrice || 0;
          const price = Number(e.price) || avgPrice;
          return entryAcc + price * Number(e.quantity);
        }, 0);
      }, 0);

      const stockCost = totalUsageCost;
      const profit = revenue - stockCost - totalSalary;

      weeks.push({
        week: week.label,
        revenue,
        totalOrders,
        stockCost,
        totalSalary,
        profit,
      });
    });

    return weeks;
  };

  const calculateMonthlyData = (month: number, year: number, employeeId: string) => {
    const { revenue, totalOrders } = calculateRevenueForMonth(orders, month, year, employeeId);

    const monthSchedules = schedules.filter((s) => {
      const d = new Date(s.date);
      return (
        d.getMonth() + 1 === month &&
        d.getFullYear() === year &&
        (employeeId === "all" || s.userId === employeeId)
      );
    });
    const salaryMap: Record<string, number> = {};
    monthSchedules.forEach((s) => {
      const user = employees.find((e) => e.id === s.userId);
      if (user && user.hourlyRate) {
        salaryMap[s.userId] = (salaryMap[s.userId] || 0) + s.hoursWorked * user.hourlyRate;
      }
    });
    const totalSalary = Object.values(salaryMap).reduce((acc, sal) => acc + sal, 0);

    const monthBatches = batches.filter((batch) => {
      const batchDate = new Date(batch.createdAt);
      const startDate = new Date(year, month - 1, 1, 0, 0, 0);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      return (
        batchDate >= startDate &&
        batchDate <= endDate &&
        (employeeId === "all" || batch.userId === employeeId || batch.user?.id === employeeId)
      );
    });
    const totalUsageCost = monthBatches.reduce((acc, batch) => {
      return acc + batch.entries.reduce((entryAcc, e) => {
        const type = (e.type || "").toUpperCase();
        if (type !== "EXPORT" && type !== "CONSUME") return entryAcc;

        const invItem = inventoryReport.find((i: any) => i.category === e.category && i.productDetail === e.productDetail && i.unit === e.unit);
        const avgPrice = invItem?.averagePrice || 0;
        const price = Number(e.price) || avgPrice;
        return entryAcc + price * Number(e.quantity);
      }, 0);
    }, 0);

    const stockCost = totalUsageCost;
    const profit = revenue - stockCost - totalSalary;

    return { revenue, totalOrders, stockCost, totalSalary, profit };
  };

  const buildYearChartData = (year: number) => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const { revenue, totalOrders, stockCost, totalSalary, profit } = calculateMonthlyData(month, year, selectedEmployee);
      return {
        month: `T${month}`,
        revenue,
        totalOrders,
        stockCost,
        totalSalary,
        profit,
      };
    });
  };

  const [selectedChartData, setSelectedChartData] = useState<any[]>([]);
  const [viewType, setViewType] = useState<"week" | "day">("week");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [forecastMethod, setForecastMethod] = useState("");
  const [forecastError, setForecastError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchForecastReport = async () => {
      try {
        setForecastError("");
        const params = new URLSearchParams({
          year: String(selectedYear),
          month: selectedMonth === "all" ? "all" : String(selectedMonth),
          employeeId: selectedEmployee,
          viewType: selectedMonth === "all" ? "month" : viewType,
        });
        const token = localStorage.getItem("authToken");
        const response = await fetch(`/api/reports/profit-forecast?${params.toString()}`, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          throw new Error(`Forecast report returned ${response.status}`);
        }

        const result = await response.json();
        setSelectedChartData(Array.isArray(result.data) ? result.data : []);
        setForecastMethod(result.forecast?.method || "ARIMA");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Lỗi khi tải báo cáo dự báo:", error);
        setForecastError("Không thể tải dữ liệu dự báo ARIMA.");
        setSelectedChartData([]);
        setForecastMethod("");
      }
    };

    void fetchForecastReport();

    return () => {
      controller.abort();
    };
  }, [selectedMonth, selectedYear, selectedEmployee, viewType]);

  const formatYAxisTick = (value: number) => {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const actualChartData = useMemo(
    () => selectedChartData.filter((item) => !item.isPrediction),
    [selectedChartData],
  );

  const { revenue: currentRevenue, totalOrders: currentTotalOrders, totalStockCost, totalSalary, profit: summaryProfit } = useMemo(() => {
    return actualChartData.reduce(
      (acc, curr) => {
        acc.revenue += Number(curr.revenue) || 0;
        acc.totalOrders += Number(curr.totalOrders) || 0;
        acc.totalStockCost += Number(curr.stockCost) || 0;
        acc.totalSalary += Number(curr.totalSalary) || 0;
        acc.profit += Number(curr.profit) || 0;
        return acc;
      },
      {
        revenue: 0,
        totalOrders: 0,
        totalStockCost: 0,
        totalSalary: 0,
        profit: 0,
      }
    );
  }, [actualChartData]);

  const summaryCards = [
    {
      icon: <Package className="h-5 w-5 text-sky-700" />,
      label: "Tổng sản phẩm",
      value: products.length,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      icon: <ReceiptText className="h-5 w-5 text-violet-700" />,
      label: "Đơn hàng",
      value: currentTotalOrders || 0,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-emerald-700" />,
      label: "Doanh thu",
      value: formatCurrency(currentRevenue),
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      icon: <Coffee className="h-5 w-5 text-amber-700" />,
      label: "Lợi nhuận",
      value: formatCurrency(summaryProfit),
      tone: "bg-amber-50 text-amber-700",
    },
    {
      icon: <Users className="h-5 w-5 text-rose-700" />,
      label: "Nhân viên",
      value: employees.length,
      tone: "bg-rose-50 text-rose-700",
    },
  ];

  const monthLabel = selectedMonth === "all" ? `Năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear} (theo tuần)`;

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <section className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex w-full flex-col gap-4">
          <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.18),_transparent_22%)]" />
            <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                  <Sparkles className="h-4 w-4" />
                  Quản trị kinh doanh
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Tổng quan vận hành
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur">
                  <Users className="h-4 w-4" />
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="bg-transparent text-sm text-white outline-none"
                  >
                    <option value="all" className="text-slate-900">Tất cả nhân viên</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id} className="text-slate-900">
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur">
                  <CalendarRange className="h-4 w-4" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="bg-transparent text-sm text-white outline-none"
                  >
                    <option value="all" className="text-slate-900">Tất cả các tháng</option>
                    {Array.from({ length: 12 }, (_, index) => (
                      <option
                        key={index + 1}
                        value={index + 1}
                        className="text-slate-900"
                      >
                        Tháng {index + 1}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
                  <BarChart3 className="h-4 w-4" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent text-sm text-slate-900 outline-none"
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <option key={currentYear - index} value={currentYear - index}>
                        Năm {currentYear - index}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/85 px-4 py-3.5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)] backdrop-blur"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}
                >
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Top sản phẩm bán chạy
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{monthLabel}</p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                    {totalProductsSold} sản phẩm đã bán
                  </div>
                  <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                    {formatCurrency(topProducts.reduce((acc, p) => acc + (p.revenue || 0), 0))} doanh thu
                  </div>
                </div>
              </div>

              <div className="mt-6 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    layout="horizontal"
                    margin={{ top: 20, right: 24, left: 24, bottom: 80 }}
                    barCategoryGap={8}
                  >
                    <defs>
                      {TOP_PRODUCT_GRADIENTS.map(([from, to], index) => (
                        <linearGradient
                          key={`top-product-gradient-${index}`}
                          id={`topProductGradient-${index}`}
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor={from} />
                          <stop offset="100%" stopColor={to} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      type="category"
                      dataKey="productName"
                      tickLine={false}
                      axisLine={false}
                      width={200}
                      height={80}
                      tick={({ x, y, payload }: any) => (
                        <text
                          x={x}
                          y={y + 20}
                          textAnchor="end"
                          transform={`rotate(-45, ${x}, ${y + 20})`}
                          fontSize={11}
                          fill="#334155"
                          fontWeight={500}
                        >
                          {payload.value}
                        </text>
                      )}
                      interval={0}
                      orientation="bottom"
                    />
                    <YAxis
                      type="number"
                      tickFormatter={(value) => value.toLocaleString("vi-VN")}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.10)" }}
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 18px 40px -24px rgba(15,23,42,0.35)",
                      }}
                      formatter={(value, name, props) => {
                        if (name === 'quantity') {
                          return [
                            `${Number(value).toLocaleString("vi-VN")} sản phẩm`,
                            'Số lượng'
                          ];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          const data = payload[0].payload;
                          return `${label}\nDoanh thu: ${formatCurrency(data.revenue)}`;
                        }
                        return label;
                      }}
                    />
                    <Bar
                      dataKey="quantity"
                      radius={[4, 4, 4, 4]}
                      barSize={24}
                      background={{
                        fill: "rgba(226,232,240,0.75)",
                        radius: 4,
                      }}
                      label={{
                        position: 'top',
                        formatter: (value: number) => value.toLocaleString("vi-VN"),
                        fontSize: 12,
                        fill: '#334155',
                        fontWeight: 500
                      }}
                    >
                      {topProducts.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`url(#topProductGradient-${index % TOP_PRODUCT_GRADIENTS.length})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Báo cáo xuất nhập kho
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Thống kê nguyên liệu {monthLabel}</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 outline-none hover:bg-slate-200 cursor-pointer"
                  >
                    <option value="all">Tất cả tháng</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                    ))}
                  </select>
                  <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                    {ingredientSummaryData.filter(item => !item.isCategoryHeader && !item.isTotal).length} nguyên liệu
                  </div>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Xuất Excel
                  </button>
                </div>
              </div>

              <div className="mt-6">
                {ingredientSummaryData.length > 0 ? (
                  <div className="flex flex-col max-h-[400px] overflow-hidden">
                    <div className="flex-1 overflow-auto">
                      <Table
                        columns={[
                          {
                            title: "Nguyên liệu",
                            dataIndex: "productDetail",
                            key: "productDetail",
                            className: "font-medium text-slate-800",
                            render: (text, record) => {
                              if (record.isCategoryHeader) {
                                return <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{text}</span>;
                              }
                              if (record.isTotal) {
                                return <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">{text}</span>;
                              }
                              return text;
                            }
                          },
                          {
                            title: "Đơn vị",
                            dataIndex: "unit",
                            key: "unit",
                            align: "center" as const,
                            render: (text, record) => {
                              if (record.isCategoryHeader || record.isTotal) return "";
                              return text;
                            }
                          },
                          {
                            title: "Tồn Đầu Kỳ",
                            key: "starting",
                            align: "right" as const,
                            render: (_, r) => {
                              if (r.isCategoryHeader || r.isTotal) return "";
                              return <div className="text-slate-500 font-medium">{Number(r.startingQty || 0)} {r.unit}</div>;
                            }
                          },
                          {
                            title: "Nhập Kho",
                            key: "import",
                            align: "right" as const,
                            render: (_, r) => {
                              if (r.isCategoryHeader) return "";
                              return <div><div className="text-emerald-600 font-semibold">{r.importQty} {r.unit}</div><div className="text-[11px] text-slate-500">{formatCurrency(r.importCost)}</div></div>;
                            }
                          },
                          {
                            title: "Xuất Kho",
                            key: "export",
                            align: "right" as const,
                            render: (_, r) => {
                              if (r.isCategoryHeader) return "";
                              return <div><div className="text-rose-500 font-semibold">{r.exportQty} {r.unit}</div><div className="text-[11px] text-slate-500">{formatCurrency(r.exportCost)}</div></div>;
                            }
                          },
                          {
                            title: "Đã Bán (PBH)",
                            key: "consume",
                            align: "right" as const,
                            render: (_, r) => {
                              if (r.isCategoryHeader) return "";
                              return <div><div className="text-amber-600 font-semibold">{r.consumeQty} {r.unit}</div><div className="text-[11px] text-slate-500">{formatCurrency(r.consumeCost)}</div></div>;
                            }
                          },
                          {
                            title: "Chi phí tồn kho",
                            key: "totalQty",
                            align: "right" as const,
                            render: (_, r) => {
                              if (r.isCategoryHeader) return "";
                              if (r.isTotal) {
                                return <div className="font-bold text-sky-700">{formatCurrency(r.stockCost)}</div>;
                              }
                              const resultQty = Number(r.importQty || 0) - Number(r.exportQty || 0) - Number(r.consumeQty || 0);
                              const resultCost = Number(r.stockCost || 0);
                              return <div><span className={`font-semibold ${resultQty < 0 ? "text-rose-600" : "text-sky-600"}`}>{resultQty} {r.unit}</span><div className="text-[11px] font-medium text-slate-500">{formatCurrency(resultCost)}</div></div>;
                            }
                          },
                        ]}
                        dataSource={ingredientSummaryData}
                        rowKey={(r, index) => `${r.productDetail}-${r.unit}-${index}`}
                        pagination={false}
                        size="small"
                        bordered
                        className="modern-inventory-table rounded-2xl overflow-hidden"
                      />
                    </div>
                    <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-5 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                          <span className="text-sm font-semibold text-slate-700">Tổng chi phí nguyên liệu (Đồng bộ biểu đồ: Tổng xuất + Tổng bán)</span>
                        </div>
                        <span className="text-lg font-bold text-amber-600">
                          {formatCurrency(ingredientSummaryData.filter(item => item.isTotal).reduce((acc, r) => acc + (Number(r.exportCost || 0) + Number(r.consumeCost || 0)), 0))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-sky-500"></div>
                          <span className="text-sm font-semibold text-slate-700">Giá trị tồn kho hiện tại (Tồn kho * Đơn giá bình quân)</span>
                        </div>
                        <span className="text-lg font-bold text-sky-700">
                          {formatCurrency(ingredientSummaryData.filter(item => item.isTotal).reduce((acc, r) => acc + (r.stockCost || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                    <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                        <Warehouse className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-900">
                        Không có báo cáo xuất nhập
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Chưa có dữ liệu nguyên liệu trong thời gian được chọn.
                      </p>
                    </div>
                )}
                  </div>
            </div>
              <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6 xl:col-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Biểu đồ lợi nhuận và chi phí
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedMonth === "all"
                        ? `So sánh dữ liệu theo từng tháng trong năm ${selectedYear}.`
                        : `So sánh dữ liệu theo từng ${viewType === "week" ? "tuần" : "ngày"} trong ${monthLabel}.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Chọn tháng */}
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-200 cursor-pointer"
                    >
                      <option value="all">Tất cả các tháng</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                      ))}
                    </select>

                    {/* Chọn danh mục */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 outline-none hover:bg-slate-200 cursor-pointer"
                    >
                      <option value="all">Tất cả danh mục</option>
                      <option value="revenue">Doanh thu</option>
                      <option value="profit">Lợi nhuận</option>
                      <option value="totalSalary">Lương nhân viên</option>
                      <option value="stockCost">Chi phí nguyên liệu</option>
                    </select>

                    {/* Chọn xem theo Tuần/Ngày */}
                    {selectedMonth !== "all" && (
                      <select
                        value={viewType}
                        onChange={(e) => setViewType(e.target.value as "week" | "day")}
                        className="rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700 outline-none hover:bg-sky-200 cursor-pointer"
                      >
                        <option value="week">Xem theo tuần</option>
                        <option value="day">Xem theo ngày</option>
                      </select>
                    )}

                    <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                      {formatCurrency(currentRevenue)}
                    </div>
                  </div>
                </div>
                {forecastError && (
                  <p className="mt-3 text-sm font-medium text-rose-600">
                    {forecastError}
                  </p>
                )}

                <div className="mt-6 h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={selectedChartData}
                      margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey={selectedMonth === "all" ? "month" : (selectedChartData[0]?.day ? "day" : (selectedChartData[0]?.week ? "week" : "label"))}
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                      />
                      <YAxis
                        tickFormatter={formatYAxisTick}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 18,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 18px 40px -24px rgba(15,23,42,0.35)",
                          fontSize: "13px",
                        }}
                        formatter={(value, name) => {
                          if (name === 'revenue') return [formatCurrency(value as number), 'Doanh thu'];
                          if (name === 'stockCost') return [formatCurrency(value as number), 'Chi phí nguyên liệu'];
                          if (name === 'totalSalary') return [formatCurrency(value as number), 'Lương nhân viên'];
                          if (name === 'profit') return [formatCurrency(value as number), 'Lợi nhuận'];
                          return [value, name];
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0] && payload[0].payload.isPrediction) {
                            return `${label} (Dự báo ARIMA)`;
                          }
                          return label;
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />

                      {(selectedCategory === "all" || selectedCategory === "revenue") && (
                        <Bar dataKey="revenue" fill="#3b82f6" name="Doanh thu" barSize={viewType === "day" ? 12 : 32}>
                          {selectedChartData.map((entry, index) => (
                            <Cell key={`cell-rev-${index}`} fill={entry.isPrediction ? '#93c5fd' : '#3b82f6'} fillOpacity={entry.isPrediction ? 0.6 : 1} />
                          ))}
                        </Bar>
                      )}

                      {(selectedCategory === "all" || selectedCategory === "stockCost") && (
                        <Bar dataKey="stockCost" fill="#f59e0b" name="Chi phí nguyên liệu" barSize={viewType === "day" ? 12 : 32}>
                          {selectedChartData.map((entry, index) => (
                            <Cell key={`cell-stock-${index}`} fill={entry.isPrediction ? '#fcd34d' : '#f59e0b'} fillOpacity={entry.isPrediction ? 0.6 : 1} />
                          ))}
                        </Bar>
                      )}

                      {(selectedCategory === "all" || selectedCategory === "totalSalary") && (
                        <Bar dataKey="totalSalary" fill="#ef4444" name="Lương nhân viên" barSize={viewType === "day" ? 12 : 32}>
                          {selectedChartData.map((entry, index) => (
                            <Cell key={`cell-salary-${index}`} fill={entry.isPrediction ? '#fca5a5' : '#ef4444'} fillOpacity={entry.isPrediction ? 0.6 : 1} />
                          ))}
                        </Bar>
                      )}

                      {(selectedCategory === "all" || selectedCategory === "profit") && (
                        <Line
                          type="monotone"
                          dataKey="profit"
                          stroke="#10b981"
                          strokeWidth={3}
                          name="Lợi nhuận"
                          dot={viewType === "day" ? false : { r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
          </section>
        </ProtectedRoute>
        );
};

        export default Page;
