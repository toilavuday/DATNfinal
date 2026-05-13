import { NextRequest, NextResponse } from "next/server";
import { forecastArima } from "@/lib/reports/arima";

export const dynamic = "force-dynamic";

interface DashboardOrder {
  createdAt: Date | string;
  items?: { productName: string; quantity: number }[];
  userId?: string;
  amount?: number;
}

interface Employee {
  id?: string;
  hourlyRate?: number;
}

interface Schedule {
  date: Date | string;
  userId?: string;
  hoursWorked?: number;
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

interface StockEntryBatch {
  createdAt: Date | string;
  entries?: StockEntry[];
  userId?: string;
  user?: { id?: string };
}

interface InventoryItem {
  productDetail?: string;
  category?: string;
  unit?: string;
  averagePrice?: string | number;
}

interface PeriodRange {
  startDate: Date;
  endDate: Date;
  label: string;
  key: string;
}

interface ReportPoint {
  month?: string;
  week?: string;
  revenue: number;
  totalOrders: number;
  stockCost: number;
  totalSalary: number;
  profit: number;
  isPrediction: boolean;
}

const toNumber = (value: unknown) => Number(value) || 0;

const parseDate = (value: Date | string | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isWithinRange = (date: Date | null, startDate: Date, endDate: Date) =>
  Boolean(date && date >= startDate && date <= endDate);

const isEmployeeMatch = (
  selectedEmployee: string,
  userId?: string,
  nestedUserId?: string,
) =>
  selectedEmployee === "all" ||
  userId === selectedEmployee ||
  nestedUserId === selectedEmployee;

const getAveragePrice = (entry: StockEntry, inventoryReport: InventoryItem[]) => {
  const productDetail = entry.productDetail || entry.ingredient || "";
  const inventoryItem = inventoryReport.find(
    (item) =>
      item.category === entry.category &&
      item.productDetail === productDetail &&
      item.unit === entry.unit,
  );

  return toNumber(inventoryItem?.averagePrice) || toNumber(entry.price);
};

const calculatePeriodMetrics = (
  range: PeriodRange,
  employeeId: string,
  orders: DashboardOrder[],
  schedules: Schedule[],
  batches: StockEntryBatch[],
  inventoryReport: InventoryItem[],
  employees: Employee[],
) => {
  const periodOrders = orders.filter((order) => {
    const orderDate = parseDate(order.createdAt);
    return (
      isWithinRange(orderDate, range.startDate, range.endDate) &&
      isEmployeeMatch(employeeId, order.userId)
    );
  });

  const revenue = periodOrders.reduce(
    (sum, order) => sum + toNumber(order.amount),
    0,
  );

  const periodSchedules = schedules.filter((schedule) => {
    const scheduleDate = parseDate(schedule.date);
    return (
      isWithinRange(scheduleDate, range.startDate, range.endDate) &&
      isEmployeeMatch(employeeId, schedule.userId)
    );
  });

  const salaryMap: Record<string, number> = {};
  periodSchedules.forEach((schedule) => {
    if (!schedule.userId) return;
    const employee = employees.find((item) => item.id === schedule.userId);
    const hourlyRate = toNumber(employee?.hourlyRate);
    if (!hourlyRate) return;

    salaryMap[schedule.userId] =
      (salaryMap[schedule.userId] || 0) + toNumber(schedule.hoursWorked) * hourlyRate;
  });

  const totalSalary = Object.values(salaryMap).reduce(
    (sum, salary) => sum + salary,
    0,
  );

  const periodBatches = batches.filter((batch) => {
    const batchDate = parseDate(batch.createdAt);
    return (
      isWithinRange(batchDate, range.startDate, range.endDate) &&
      isEmployeeMatch(employeeId, batch.userId, batch.user?.id)
    );
  });

  const stockCost = periodBatches.reduce((batchSum, batch) => {
    return (
      batchSum +
      (batch.entries || []).reduce((entrySum, entry) => {
        const type = (entry.type || "").toUpperCase();
        if (type !== "EXPORT" && type !== "CONSUME") return entrySum;

        const price = getAveragePrice(entry, inventoryReport);
        return entrySum + price * toNumber(entry.quantity);
      }, 0)
    );
  }, 0);

  return {
    revenue,
    totalOrders: periodOrders.length,
    stockCost,
    totalSalary,
    profit: revenue - stockCost - totalSalary,
  };
};

const getWeekRangesForMonth = (month: number, year: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const ranges: PeriodRange[] = [
    { start: 1, end: 7, label: "Tuan 1" },
    { start: 8, end: 14, label: "Tuan 2" },
    { start: 15, end: 21, label: "Tuan 3" },
    { start: 22, end: 28, label: "Tuan 4" },
  ].map(({ start, end, label }, index) => ({
    startDate: new Date(year, month - 1, start, 0, 0, 0, 0),
    endDate: new Date(year, month - 1, end, 23, 59, 59, 999),
    label: label.replace("Tuan", "Tuần"),
    key: `${year}-${String(month).padStart(2, "0")}-w${index + 1}`,
  }));

  if (daysInMonth > 28) {
    ranges.push({
      startDate: new Date(year, month - 1, 29, 0, 0, 0, 0),
      endDate: new Date(year, month - 1, daysInMonth, 23, 59, 59, 999),
      label: "Tuần 5",
      key: `${year}-${String(month).padStart(2, "0")}-w5`,
    });
  }

  return ranges;
};

const getMonthRangesForYear = (year: number) =>
  Array.from({ length: 12 }, (_, index): PeriodRange => {
    const month = index + 1;
    return {
      startDate: new Date(year, index, 1, 0, 0, 0, 0),
      endDate: new Date(year, month, 0, 23, 59, 59, 999),
      label: `T${month}`,
      key: `${year}-${String(month).padStart(2, "0")}`,
    };
  });

const getActiveMonthForYear = (year: number, currentDate: Date) => {
  const currentYear = currentDate.getFullYear();
  if (year < currentYear) return 12;
  if (year > currentYear) return 1;
  return currentDate.getMonth() + 1;
};

const getActiveWeekIndexForMonth = (
  month: number,
  year: number,
  currentDate: Date,
  ranges: PeriodRange[],
) => {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return ranges.length - 1;
  }

  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return 0;
  }

  const currentWeekIndex = ranges.findIndex((range) =>
    isWithinRange(currentDate, range.startDate, range.endDate),
  );

  return currentWeekIndex >= 0 ? currentWeekIndex : ranges.length - 1;
};

const getNextMonthRange = (year: number, month: number): PeriodRange => {
  const nextMonthDate = new Date(year, month, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;

  return {
    startDate: new Date(nextYear, nextMonth - 1, 1, 0, 0, 0, 0),
    endDate: new Date(nextYear, nextMonth, 0, 23, 59, 59, 999),
    label: `Dự báo T${nextMonth}/${nextYear}`,
    key: `${nextYear}-${String(nextMonth).padStart(2, "0")}-prediction`,
  };
};

const getNextWeekRange = (
  month: number,
  year: number,
  currentRange: PeriodRange,
): PeriodRange => {
  const currentMonthWeeks = getWeekRangesForMonth(month, year);
  const currentWeekIndex = currentMonthWeeks.findIndex(
    (range) => range.key === currentRange.key,
  );
  const nextWeek =
    currentWeekIndex >= 0 ? currentMonthWeeks[currentWeekIndex + 1] : undefined;

  if (nextWeek) {
    return {
      ...nextWeek,
      label: `Dự báo ${nextWeek.label}`,
      key: `${nextWeek.key}-prediction`,
    };
  }

  const nextMonthDate = new Date(year, month, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;
  const firstNextMonthWeek = getWeekRangesForMonth(nextMonth, nextYear)[0];

  return {
    ...firstNextMonthWeek,
    label: `Dự báo ${firstNextMonthWeek.label} T${nextMonth}/${nextYear}`,
    key: `${firstNextMonthWeek.key}-prediction`,
  };
};

const getEarliestDate = (
  orders: DashboardOrder[],
  schedules: Schedule[],
  batches: StockEntryBatch[],
  fallbackYear: number,
) => {
  const dates = [
    ...orders.map((order) => parseDate(order.createdAt)),
    ...schedules.map((schedule) => parseDate(schedule.date)),
    ...batches.map((batch) => parseDate(batch.createdAt)),
  ].filter((date): date is Date => Boolean(date));

  if (!dates.length) return new Date(fallbackYear, 0, 1);

  return new Date(Math.min(...dates.map((date) => date.getTime())));
};

const buildMonthlyHistoryRanges = (startDate: Date, endDate: Date) => {
  const ranges: PeriodRange[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    ranges.push({
      startDate: new Date(year, month - 1, 1, 0, 0, 0, 0),
      endDate: new Date(year, month, 0, 23, 59, 59, 999),
      label: `T${month}/${year}`,
      key: `${year}-${String(month).padStart(2, "0")}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return ranges;
};

const buildWeeklyHistoryRanges = (startDate: Date, endDate: Date) => {
  const ranges: PeriodRange[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    ranges.push(...getWeekRangesForMonth(month, year));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return ranges.filter((range) => range.endDate <= endDate);
};

const createPoint = (
  range: PeriodRange,
  granularity: "month" | "week",
  metrics: Omit<ReportPoint, "month" | "week" | "isPrediction">,
  isPrediction = false,
) => ({
  [granularity]: range.label,
  ...metrics,
  isPrediction,
});

const fetchJson = async <T>(
  baseUrl: string,
  path: string,
  headers: HeadersInit,
) => {
  const response = await fetch(new URL(path, baseUrl).toString(), {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return (await response.json()) as T;
};

export async function GET(request: NextRequest) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_API_URL is not configured." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const selectedYear = Number(searchParams.get("year")) || new Date().getFullYear();
  const selectedMonthParam = searchParams.get("month") || "all";
  const parsedMonth = Number(selectedMonthParam);
  const selectedMonth =
    selectedMonthParam === "all" || Number.isNaN(parsedMonth)
      ? "all"
      : Math.max(1, Math.min(12, parsedMonth));
  const viewType = searchParams.get("viewType") || "auto"; // "auto", "month", "week", "day"
  const employeeId = searchParams.get("employeeId") || "all";

  const forwardedHeaders: Record<string, string> = {};
  const authorization = request.headers.get("authorization");
  if (authorization) forwardedHeaders.Authorization = authorization;

  try {
    const [orders, batches, inventoryReport, schedules, employees] =
      await Promise.all([
        fetchJson<DashboardOrder[]>(apiBaseUrl, "/order", forwardedHeaders),
        fetchJson<StockEntryBatch[]>(apiBaseUrl, "/stock/batches", forwardedHeaders),
        fetchJson<InventoryItem[]>(apiBaseUrl, "/stock/inventory", forwardedHeaders),
        fetchJson<Schedule[]>(apiBaseUrl, "/schedule", forwardedHeaders),
        fetchJson<Employee[]>(apiBaseUrl, "/user", forwardedHeaders),
      ]);

    const currentDate = new Date();
    const activeMonth = getActiveMonthForYear(selectedYear, currentDate);
    
    let granularity: "month" | "week" | "day" = "month";
    let displayRanges: PeriodRange[] = [];

    if (viewType === "day" && selectedMonth !== "all") {
      granularity = "day";
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      displayRanges = Array.from({ length: daysInMonth }, (_, i): PeriodRange => {
        const d = i + 1;
        return {
          startDate: new Date(selectedYear, selectedMonth - 1, d, 0, 0, 0, 0),
          endDate: new Date(selectedYear, selectedMonth - 1, d, 23, 59, 59, 999),
          label: `${d}/${selectedMonth}`,
          key: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        };
      });
      // Lọc bỏ những ngày trong tương lai nếu là tháng hiện tại
      if (selectedYear === currentDate.getFullYear() && selectedMonth === currentDate.getMonth() + 1) {
        displayRanges = displayRanges.filter(r => r.startDate <= currentDate);
      }
    } else if (selectedMonth === "all") {
      granularity = "month";
      displayRanges = getMonthRangesForYear(selectedYear).slice(0, activeMonth);
    } else {
      granularity = "week";
      const weekRanges = getWeekRangesForMonth(selectedMonth, selectedYear);
      const activeWeekIndex = getActiveWeekIndexForMonth(
        selectedMonth,
        selectedYear,
        currentDate,
        weekRanges,
      );
      displayRanges = weekRanges.slice(0, activeWeekIndex + 1);
    }
    const lastDisplayRange = displayRanges[displayRanges.length - 1];
    const displayEndDate = lastDisplayRange.endDate;
    const historyStartDate = getEarliestDate(orders, schedules, batches, selectedYear);
    const historyRanges =
      granularity === "month"
        ? buildMonthlyHistoryRanges(historyStartDate, displayEndDate)
        : buildWeeklyHistoryRanges(historyStartDate, displayEndDate);

    const history = historyRanges.map((range) =>
      calculatePeriodMetrics(
        range,
        employeeId,
        orders,
        schedules,
        batches,
        inventoryReport,
        employees,
      ),
    );

    const forecastRevenue = forecastArima(
      history.map((point) => point.revenue),
      { horizon: 1, differenceOrder: 1, clampMin: 0 },
    );
    const forecastOrders = forecastArima(
      history.map((point) => point.totalOrders),
      { horizon: 1, differenceOrder: 1, clampMin: 0 },
    );
    const forecastStockCost = forecastArima(
      history.map((point) => point.stockCost),
      { horizon: 1, differenceOrder: 1, clampMin: 0 },
    );
    const forecastSalary = forecastArima(
      history.map((point) => point.totalSalary),
      { horizon: 1, differenceOrder: 1, clampMin: 0 },
    );

    const actualData = displayRanges.map((range) => {
      const metrics = calculatePeriodMetrics(
        range,
        employeeId,
        orders,
        schedules,
        batches,
        inventoryReport,
        employees,
      );
      return createPoint(range, granularity, metrics, false);
    });

    const getNextDayRange = (date: Date): PeriodRange => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const d = nextDay.getDate();
      const m = nextDay.getMonth() + 1;
      return {
        startDate: new Date(nextDay.getFullYear(), nextDay.getMonth(), d, 0, 0, 0, 0),
        endDate: new Date(nextDay.getFullYear(), nextDay.getMonth(), d, 23, 59, 59, 999),
        label: `Dự báo ${d}/${m}`,
        key: `${nextDay.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}-prediction`,
      };
    };

    const predictionRange: PeriodRange = (() => {
      if (granularity === "day") {
        return getNextDayRange(lastDisplayRange.endDate);
      }
      if (selectedMonth === "all") {
        return getNextMonthRange(selectedYear, activeMonth);
      }
      return getNextWeekRange(selectedMonth, selectedYear, lastDisplayRange);
    })();

    const predictedMetrics = {
      revenue: forecastRevenue.values[0] || 0,
      totalOrders: Math.round(forecastOrders.values[0] || 0),
      stockCost: forecastStockCost.values[0] || 0,
      totalSalary: forecastSalary.values[0] || 0,
      profit:
        (forecastRevenue.values[0] || 0) -
        (forecastStockCost.values[0] || 0) -
        (forecastSalary.values[0] || 0),
    };

    return NextResponse.json({
      data: [...actualData, createPoint(predictionRange, granularity, predictedMetrics, true)],
      forecast: {
        method: "ARIMA",
        models: {
          revenue: forecastRevenue.model,
          totalOrders: forecastOrders.model,
          stockCost: forecastStockCost.model,
          totalSalary: forecastSalary.model,
        },
        usedFallback:
          forecastRevenue.usedFallback ||
          forecastOrders.usedFallback ||
          forecastStockCost.usedFallback ||
          forecastSalary.usedFallback,
        trainingPoints: history.length,
      },
    });
  } catch (error) {
    console.error("Failed to build profit forecast report:", error);
    return NextResponse.json(
      { message: "Khong the tao bao cao du bao." },
      { status: 500 },
    );
  }
}
