import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface OrderItem {
  productName: string;
  quantity: number;
}

interface Order {
  createdAt: string;
  amount?: number;
  items?: OrderItem[];
  userId?: string;
}

interface StockEntry {
  productDetail?: string;
  ingredient?: string;
  category?: string;
  quantity?: string | number;
  unit?: string;
  type?: string;
  price?: string | number;
}

interface StockBatch {
  createdAt: string;
  entries?: StockEntry[];
  userId?: string;
  user?: { id?: string };
}

interface InventoryItem {
  productDetail?: string;
  category?: string;
  unit?: string;
  currentStock?: number;
  averagePrice?: string | number;
}

interface Employee {
  id?: string;
  name?: string;
  hourlyRate?: number;
}

interface Schedule {
  date: string;
  userId?: string;
  hoursWorked?: number;
}

interface ForecastData {
  data?: Array<{
    month?: string;
    week?: string;
    revenue: number;
    totalOrders: number;
    stockCost: number;
    totalSalary: number;
    profit: number;
    isPrediction: boolean;
  }>;
  forecast?: {
    method: string;
  };
}

const toNum = (v: unknown) => Number(v) || 0;

// ─── Intent detection ──────────────────────────────────────────────────────────

type Intent =
  | "revenue_summary"
  | "profit_summary"
  | "top_products"
  | "low_stock"
  | "forecast_next"
  | "salary_summary"
  | "stock_cost"
  | "loss_products"
  | "order_count"
  | "best_day"
  | "worst_day"
  | "import_suggest"
  | "general_summary"
  | "unknown";

function detectIntent(question: string): Intent {
  const q = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // revenue
  if (/doanh thu|revenue|ban duoc bao nhieu|thu bao nhieu/.test(q))
    return "revenue_summary";
  // profit
  if (/loi nhuan|profit|lai bao nhieu|loi bao nhieu/.test(q))
    return "profit_summary";
  // top products
  if (
    /ban chay|ban nhieu|san pham nao|top san|mon nao ban|top mon|thanh pham/.test(
      q
    )
  )
    return "top_products";
  // low stock / out of stock
  if (/het hang|sap het|ton kho|nhap them|nhap bao nhieu|nguyen lieu|con bao nhieu/.test(q))
    return "low_stock";
  // forecast / prediction
  if (
    /du bao|toi nay|tuan toi|thang toi|ngay mai|sap toi|uoc tinh|arima|predict/.test(
      q
    )
  )
    return "forecast_next";
  // salary
  if (/luong|salary|chi phi nhan vien|thu lao/.test(q)) return "salary_summary";
  // stock cost
  if (/chi phi kho|chi phi nguyen lieu|nhap kho|xuat kho|cost kho/.test(q))
    return "stock_cost";
  // loss / losing money
  if (/lo|thua lo|dang lo|lo von|lo tien|kem hieu qua/.test(q))
    return "loss_products";
  // order count
  if (/so don|don hang|bao nhieu don|luong don/.test(q)) return "order_count";
  // best day
  if (/ngay nao|hieu qua nhat|tot nhat|dinh cao|cao nhat/.test(q))
    return "best_day";
  // worst day
  if (/thap nhat|kem nhat|bay nhat/.test(q)) return "worst_day";
  // import suggestion
  if (/nen nhap|nhap gi|can nhap|nhap them gi|nhap hang/.test(q))
    return "import_suggest";
  // general
  if (/tong quan|bao cao|overview|tim hieu|xem thu|phan tich/.test(q))
    return "general_summary";

  return "unknown";
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount
  );

function periodLabel(now: Date) {
  return `tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
}

// ─── Answer builders ──────────────────────────────────────────────────────────

function buildRevenueSummary(
  orders: Order[],
  now: Date
): { answer: string; highlights: string[] } {
  const monthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const revenue = monthOrders.reduce((s, o) => s + toNum(o.amount), 0);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getMonth() === prevMonth.getMonth() &&
      d.getFullYear() === prevMonth.getFullYear()
    );
  });
  const prevRevenue = prevOrders.reduce((s, o) => s + toNum(o.amount), 0);
  const diff = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const trend =
    diff > 5
      ? `📈 tăng ${diff.toFixed(1)}% so với tháng trước`
      : diff < -5
      ? `📉 giảm ${Math.abs(diff).toFixed(1)}% so với tháng trước`
      : "≈ xấp xỉ tháng trước";

  return {
    answer: `💰 Doanh thu ${periodLabel(now)} đạt **${fmt(revenue)}** (${trend}). Tổng ${monthOrders.length} đơn hàng.`,
    highlights: [
      `Doanh thu tháng này: ${fmt(revenue)}`,
      `Doanh thu tháng trước: ${fmt(prevRevenue)}`,
      `Số đơn: ${monthOrders.length}`,
    ],
  };
}

function buildProfitSummary(
  forecast: ForecastData,
  now: Date
): { answer: string; highlights: string[] } {
  const label = periodLabel(now);
  const actual = (forecast.data || []).filter((p) => !p.isPrediction);
  if (!actual.length) {
    return {
      answer: "Chưa có đủ dữ liệu để tính lợi nhuận.",
      highlights: [],
    };
  }
  const totalRevenue = actual.reduce((s, p) => s + p.revenue, 0);
  const totalCost = actual.reduce((s, p) => s + p.stockCost + p.totalSalary, 0);
  const totalProfit = actual.reduce((s, p) => s + p.profit, 0);
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const emoji = totalProfit >= 0 ? "✅" : "🔴";

  return {
    answer: `${emoji} Lợi nhuận ${label} ước tính **${fmt(totalProfit)}** — Biên lợi nhuận ${margin.toFixed(1)}%. Chi phí tổng ${fmt(totalCost)}.`,
    highlights: [
      `Doanh thu: ${fmt(totalRevenue)}`,
      `Chi phí kho: ${fmt(actual.reduce((s, p) => s + p.stockCost, 0))}`,
      `Chi phí lương: ${fmt(actual.reduce((s, p) => s + p.totalSalary, 0))}`,
      `Lợi nhuận ròng: ${fmt(totalProfit)}`,
    ],
  };
}

function buildTopProducts(
  orders: Order[],
  now: Date
): { answer: string; highlights: string[] } {
  const monthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const productMap: Record<string, number> = {};
  monthOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      productMap[item.productName] =
        (productMap[item.productName] || 0) + item.quantity;
    });
  });
  const sorted = Object.entries(productMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (!sorted.length) {
    return { answer: "Chưa có dữ liệu bán hàng tháng này.", highlights: [] };
  }

  const list = sorted
    .map(([name, qty], i) => `${i + 1}. **${name}** — ${qty} sản phẩm`)
    .join("\n");

  return {
    answer: `🏆 Top sản phẩm bán chạy ${periodLabel(now)}:\n${list}`,
    highlights: sorted.map(
      ([name, qty], i) => `#${i + 1} ${name}: ${qty} sp`
    ),
  };
}

function buildLowStock(
  inventory: InventoryItem[]
): { answer: string; highlights: string[] } {
  const lowItems = inventory
    .filter((item) => toNum(item.currentStock) <= 10)
    .sort((a, b) => toNum(a.currentStock) - toNum(b.currentStock))
    .slice(0, 8);

  if (!lowItems.length) {
    return {
      answer: "✅ Kho hàng hiện đang đủ nguyên liệu, không có mặt hàng nào sắp hết.",
      highlights: [],
    };
  }

  const list = lowItems
    .map(
      (item) =>
        `• **${item.productDetail || "?"}** (${item.category}): còn ${toNum(item.currentStock)} ${item.unit || ""}`
    )
    .join("\n");

  return {
    answer: `⚠️ Các nguyên liệu sắp hết cần nhập thêm:\n${list}`,
    highlights: lowItems.map(
      (item) =>
        `${item.productDetail}: còn ${toNum(item.currentStock)} ${item.unit}`
    ),
  };
}

function buildForecast(
  forecast: ForecastData
): { answer: string; highlights: string[] } {
  const prediction = (forecast.data || []).find((p) => p.isPrediction);
  if (!prediction) {
    return {
      answer: "Chưa đủ dữ liệu lịch sử để tạo dự báo ARIMA.",
      highlights: [],
    };
  }
  const label = prediction.month || prediction.week || "kỳ tới";
  const profit = prediction.profit;
  const emoji = profit >= 0 ? "📈" : "📉";

  return {
    answer: `${emoji} Dự báo ARIMA cho **${label}**:\n• Doanh thu dự kiến: **${fmt(prediction.revenue)}**\n• Số đơn dự báo: **${prediction.totalOrders} đơn**\n• Chi phí kho dự báo: ${fmt(prediction.stockCost)}\n• Lợi nhuận dự báo: **${fmt(profit)}**`,
    highlights: [
      `Doanh thu dự báo: ${fmt(prediction.revenue)}`,
      `Đơn hàng dự báo: ${prediction.totalOrders}`,
      `Lợi nhuận dự báo: ${fmt(profit)}`,
    ],
  };
}

function buildSalarySummary(
  schedules: Schedule[],
  employees: Employee[],
  now: Date
): { answer: string; highlights: string[] } {
  const monthSchedules = schedules.filter((s) => {
    const d = new Date(s.date);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const salaryMap: Record<string, { name: string; total: number }> = {};
  monthSchedules.forEach((s) => {
    if (!s.userId) return;
    const emp = employees.find((e) => e.id === s.userId);
    if (!emp) return;
    if (!salaryMap[s.userId]) {
      salaryMap[s.userId] = { name: emp.name || s.userId, total: 0 };
    }
    salaryMap[s.userId].total += toNum(s.hoursWorked) * toNum(emp.hourlyRate);
  });
  const entries = Object.values(salaryMap).sort((a, b) => b.total - a.total);
  const totalSalary = entries.reduce((s, e) => s + e.total, 0);

  if (!entries.length) {
    return { answer: "Chưa có dữ liệu lịch làm việc tháng này.", highlights: [] };
  }

  const top3 = entries
    .slice(0, 3)
    .map((e) => `• ${e.name}: ${fmt(e.total)}`)
    .join("\n");

  return {
    answer: `👥 Chi phí lương ${periodLabel(now)}: **${fmt(totalSalary)}**\nTop nhân viên:\n${top3}`,
    highlights: [
      `Tổng lương: ${fmt(totalSalary)}`,
      ...entries.slice(0, 3).map((e) => `${e.name}: ${fmt(e.total)}`),
    ],
  };
}

function buildImportSuggestion(
  inventory: InventoryItem[],
  forecast: ForecastData
): { answer: string; highlights: string[] } {
  const prediction = (forecast.data || []).find((p) => p.isPrediction);
  const growthFactor = prediction
    ? Math.max(
        1,
        prediction.revenue /
          Math.max(
            1,
            (forecast.data || [])
              .filter((p) => !p.isPrediction)
              .slice(-1)[0]?.revenue || 1
          )
      )
    : 1.1;

  const lowItems = inventory
    .filter((item) => toNum(item.currentStock) <= 20)
    .slice(0, 6);

  if (!lowItems.length) {
    return {
      answer: "✅ Tồn kho hiện tại đủ. Không cần nhập thêm nguyên liệu đặc biệt.",
      highlights: [],
    };
  }

  const list = lowItems
    .map((item) => {
      const current = toNum(item.currentStock);
      const suggested = Math.ceil(current * growthFactor * 2);
      return `• **${item.productDetail}** (${item.unit}): tồn ${current} → đề xuất nhập thêm ~${suggested}`;
    })
    .join("\n");

  return {
    answer: `📦 Đề xuất nhập hàng dựa trên dự báo (hệ số tăng trưởng ×${growthFactor.toFixed(2)}):\n${list}`,
    highlights: lowItems.map(
      (item) =>
        `${item.productDetail}: cần nhập thêm`
    ),
  };
}

function buildGeneralSummary(
  orders: Order[],
  inventory: InventoryItem[],
  forecast: ForecastData,
  now: Date
): { answer: string; highlights: string[] } {
  const { answer: rev } = buildRevenueSummary(orders, now);
  const { answer: prof } = buildProfitSummary(forecast, now);
  const lowCount = inventory.filter((i) => toNum(i.currentStock) <= 10).length;
  const pred = (forecast.data || []).find((p) => p.isPrediction);
  const forecastNote = pred
    ? `📊 Dự báo kỳ tới: doanh thu ${fmt(pred.revenue)}, lợi nhuận ${fmt(pred.profit)}.`
    : "";

  return {
    answer: `📋 **Tổng quan kinh doanh ${periodLabel(now)}**\n\n${rev}\n\n${prof}\n\n⚠️ Có ${lowCount} mặt hàng sắp hết kho cần chú ý.\n\n${forecastNote}`,
    highlights: [
      `Tháng: ${periodLabel(now)}`,
      `Nguyên liệu cần nhập: ${lowCount} loại`,
    ],
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    return NextResponse.json({ error: "API URL chưa được cấu hình." }, { status: 500 });
  }

  let question = "";
  try {
    const body = await request.json();
    question = String(body.question || "").trim();
  } catch {
    return NextResponse.json({ error: "Request không hợp lệ." }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "Câu hỏi không được để trống." }, { status: 400 });
  }

  const authorization = request.headers.get("authorization") || "";
  const headers: Record<string, string> = authorization
    ? { Authorization: authorization }
    : {};

  const fetchJson = async <T>(path: string): Promise<T> => {
    const res = await fetch(new URL(path, apiBaseUrl).toString(), {
      headers,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json() as Promise<T>;
  };

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Fetch all data in parallel
    const [orders, inventory, schedules, employees] = await Promise.all([
      fetchJson<Order[]>("/order"),
      fetchJson<InventoryItem[]>("/stock/inventory"),
      fetchJson<Schedule[]>("/schedule"),
      fetchJson<Employee[]>("/user"),
    ]);

    // Fetch ARIMA forecast
    const forecastParams = new URLSearchParams({
      year: String(currentYear),
      month: String(currentMonth),
      employeeId: "all",
    });
    const forecastRes = await fetch(
      new URL(
        `/api/reports/profit-forecast?${forecastParams}`,
        request.nextUrl.origin
      ).toString(),
      { headers: authorization ? { Authorization: authorization } : {}, cache: "no-store" }
    );
    const forecast: ForecastData = forecastRes.ok ? await forecastRes.json() : { data: [] };

    const intent = detectIntent(question);
    let result: { answer: string; highlights: string[] };

    switch (intent) {
      case "revenue_summary":
        result = buildRevenueSummary(orders, now);
        break;
      case "profit_summary":
        result = buildProfitSummary(forecast, now);
        break;
      case "top_products":
        result = buildTopProducts(orders, now);
        break;
      case "low_stock":
        result = buildLowStock(inventory);
        break;
      case "forecast_next":
        result = buildForecast(forecast);
        break;
      case "salary_summary":
        result = buildSalarySummary(schedules, employees, now);
        break;
      case "stock_cost":
        result = buildProfitSummary(forecast, now); // reuse
        break;
      case "import_suggest":
        result = buildImportSuggestion(inventory, forecast);
        break;
      case "general_summary":
        result = buildGeneralSummary(orders, inventory, forecast, now);
        break;
      default:
        result = buildGeneralSummary(orders, inventory, forecast, now);
        break;
    }

    return NextResponse.json({
      question,
      intent,
      answer: result.answer,
      highlights: result.highlights,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("[ai-chat] Error:", error);
    return NextResponse.json(
      { error: "Không thể phân tích dữ liệu. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
