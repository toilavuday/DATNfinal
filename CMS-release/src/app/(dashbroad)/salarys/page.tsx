"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Image, Spin, Table } from "antd";
import {
  BarChart3,
  CalendarRange,
  Clock3,
  Download,
  Search,
  Sparkles,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import * as XLSX from "xlsx";
import ProtectedRoute from "@/shared/providers/auth.provider";
import { Employees } from "@/shared/types/user";
import { useGetUser } from "@/shared/hooks/user";
import { useSalaries } from "@/shared/hooks/salary";
import { Column } from "@/shared/types/table";
import { SalaryData } from "@/shared/types/salary";

type SalaryRow = SalaryData & {
  employee?: Employees;
};

const fallbackAvatar =
  "https://png.pngtree.com/png-vector/20190710/ourmid/pngtree-user-vector-avatar-png-image_1541962.jpg";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const SalaryComponent: React.FC = () => {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [userIds, setUserIds] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employees[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { salaries, loading, error } = useSalaries(month, userIds);
  const { fetchUsers } = useGetUser();

  const getUsers = useCallback(async () => {
    const users = await fetchUsers();
    setEmployees(users);

    const userIdsFromEmployees = users
      .map((employee) => employee.id)
      .filter((id): id is string => id !== undefined);

    setUserIds(userIdsFromEmployees);
  }, [fetchUsers]);

  useEffect(() => {
    dayjs.locale("vi");
    void getUsers();
  }, [getUsers]);

  const getEmployeeById = (id: string) =>
    employees.find((employee) => employee.id === id);

  const salaryRows: SalaryRow[] = salaries.map((salary) => ({
    ...salary,
    employee: getEmployeeById(salary.userId),
  }));

  const filteredSalaryRows = salaryRows.filter((row) => {
    const searchValue = searchTerm.trim().toLowerCase();
    if (!searchValue) return true;

    const employeeName = row.employee?.name?.toLowerCase() || "";
    const employeeEmail = row.employee?.email?.toLowerCase() || "";

    return (
      employeeName.includes(searchValue) || employeeEmail.includes(searchValue)
    );
  });

  const totalPayroll = salaryRows.reduce(
    (sum, row) => sum + Number(row.salary || 0),
    0,
  );
  const totalHours = salaryRows.reduce(
    (sum, row) => sum + Number(row.totalHoursWorked || 0),
    0,
  );
  const averageSalary = salaryRows.length
    ? Math.round(totalPayroll / salaryRows.length)
    : 0;
  const averageHours = salaryRows.length
    ? Math.round((totalHours / salaryRows.length) * 10) / 10
    : 0;

  const topEarners = [...salaryRows]
    .sort((a, b) => Number(b.salary) - Number(a.salary))
    .slice(0, 3);

  const formattedMonth = dayjs(month)
    .locale("vi")
    .format("[Tháng] M [năm] YYYY");
  const exportMonth = dayjs(month).format("MM_YYYY");

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredSalaryRows.map((row, index) => ({
        STT: index + 1,
        "Nhân viên": row.employee?.name || "Tên không có sẵn",
        Email: row.employee?.email || "Chưa có email",
        "Vai trò": row.employee?.role === "ADMIN" ? "Quản lý" : "Nhân viên",
        "Số giờ làm": row.totalHoursWorked,
        "Lương theo giờ": formatCurrency(Number(row.employee?.hourlyRate || 0)),
        "Lương thực nhận": formatCurrency(Number(row.salary || 0)),
      })),
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BangLuong");
    XLSX.writeFile(wb, `Bang_Luong_${exportMonth}.xlsx`);
  };

  const columns: Column[] = [
    {
      title: "Nhân viên",
      dataIndex: "userId",
      key: "userId",
      render: (_: string, record: SalaryRow) => (
        <div className="flex items-center gap-3">
          <Image
            src={
              typeof record.employee?.image === "string" &&
              record.employee.image
                ? record.employee.image
                : fallbackAvatar
            }
            alt={record.employee?.name || "Nhân viên"}
            preview={false}
            style={{ width: "52px", height: "52px" }}
            className="rounded-2xl object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {record.employee?.name || "Tên không có sẵn"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {record.employee?.email || "Chưa có email"}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      align: "center",
      render: (_: string, record: SalaryRow) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            record.employee?.role === "ADMIN"
              ? "bg-violet-50 text-violet-700"
              : "bg-sky-50 text-sky-700"
          }`}
        >
          {record.employee?.role === "ADMIN" ? "Quản lý" : "Nhân viên"}
        </span>
      ),
    },
    {
      title: "Số giờ làm",
      dataIndex: "totalHoursWorked",
      key: "totalHoursWorked",
      align: "center",
      render: (_: string, record: SalaryRow) => (
        <span className="text-sm font-semibold text-slate-900">
          {record.totalHoursWorked} giờ
        </span>
      ),
    },
    {
      title: "Lương/giờ",
      dataIndex: "hourlyRate",
      key: "hourlyRate",
      align: "center",
      responsive: ["lg"],
      render: (_: string, record: SalaryRow) => (
        <span className="text-sm text-slate-600">
          {formatCurrency(Number(record.employee?.hourlyRate || 0))}
        </span>
      ),
    },
    {
      title: "Lương thực nhận",
      dataIndex: "salary",
      key: "salary",
      align: "center",
      render: (_: string, record: SalaryRow) => (
        <span className="text-sm font-semibold text-emerald-600">
          {formatCurrency(Number(record.salary || 0))}
        </span>
      ),
    },
  ];

  const summaryCards = [
    {
      label: "Tổng quỹ lương",
      value: formatCurrency(totalPayroll),
      icon: <Wallet className="h-5 w-5 text-emerald-700" />,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Tổng giờ làm",
      value: `${totalHours} giờ`,
      icon: <Clock3 className="h-5 w-5 text-sky-700" />,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Nhân sự có lương",
      value: salaryRows.length,
      icon: <Users className="h-5 w-5 text-violet-700" />,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Lương trung bình",
      value: formatCurrency(averageSalary),
      icon: <BarChart3 className="h-5 w-5 text-amber-700" />,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <section className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.18),_transparent_22%)]" />
            <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                  <Sparkles className="h-4 w-4" />
                  Quản trị lương
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Quản lý lương
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur">
                  <CalendarRange className="h-4 w-4" />
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="bg-transparent text-sm text-white outline-none [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </label>
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <Download className="h-4 w-4" />
                  Xuất file Excel
                </button>
              </div>
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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Bảng lương {formattedMonth}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tìm kiếm nhân viên theo tên hoặc email để rà soát lương
                    nhanh hơn.
                  </p>
                </div>

                <div className="relative min-w-[260px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên hoặc email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-2">
                {loading ? (
                  <div className="flex min-h-[320px] items-center justify-center">
                    <Spin size="large" />
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    dataSource={filteredSalaryRows}
                    rowKey="userId"
                    pagination={{
                      pageSize: 8,
                      position: ["bottomCenter"],
                      showSizeChanger: false,
                    }}
                    locale={{
                      emptyText: "Không có dữ liệu lương cho bộ lọc hiện tại",
                    }}
                    className="modern-salary-table"
                  />
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
                <h3 className="text-xl font-semibold text-slate-900">
                  Tổng quan tháng
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Tóm tắt nhanh hiệu suất lương và giờ làm cho kỳ lương đang
                  chọn.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">Kỳ lương</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formattedMonth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">
                      Giờ làm trung bình
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {averageHours} giờ
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">
                      Nhân sự hiển thị
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {filteredSalaryRows.length}/{salaryRows.length}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      Thu nhập nổi bật
                    </h3>
                    <p className="text-sm text-slate-500">
                      Top nhân sự có mức lương cao nhất trong tháng.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {topEarners.length > 0 ? (
                    topEarners.map((row, index) => (
                      <div
                        key={row.userId}
                        className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700 shadow-sm">
                          #{index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {row.employee?.name || "Tên không có sẵn"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.totalHoursWorked} giờ làm
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatCurrency(Number(row.salary || 0))}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Chưa có dữ liệu lương trong tháng này.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </ProtectedRoute>
  );
};

export default SalaryComponent;
