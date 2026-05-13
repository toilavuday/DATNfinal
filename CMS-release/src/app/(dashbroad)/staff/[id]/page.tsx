"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Landmark,
  LockKeyhole,
  Mail,
  PencilLine,
  Save,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Image } from "antd";
import { enqueueSnackbar } from "notistack";
import { useGetById, useUpdateUser } from "@/shared/hooks/user";
import { Employees } from "@/shared/types/user";

const bankList = [
  "Vietcombank",
  "Techcombank",
  "BIDV",
  "Sacombank",
  "VietinBank",
  "ACB",
  "MB Bank",
  "SHB",
  "Eximbank",
  "VPBank",
  "Timo",
];

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100";

const formatDateTime = (value?: Date | string) => {
  if (!value) return "Chưa cập nhật";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Chưa cập nhật";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const getRoleLabel = (role?: string) =>
  role === "ADMIN" ? "Quản lý" : "Nhân viên";

const getStatusLabel = (isLocked?: boolean) =>
  isLocked ? "Đã khóa" : "Đang hoạt động";

const StaffDetail = () => {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { getUserById } = useGetById();
  const { updateUser } = useUpdateUser();

  const [employees, setEmployees] = useState<Employees | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "staff",
    bankCode: null as number | null,
    bank: "",
    hourlyRate: 0,
    isLocked: false,
    createdAt: "",
    updatedAt: "",
    image: null as string | File | null,
  });

  const fetchUser = useCallback(async () => {
    if (!id) return;

    const user = await getUserById(id);
    setEmployees(user);
    setPreviewImage(typeof user?.image === "string" ? user.image : null);
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      role: user?.role || "",
      bankCode: user?.bankCode || null,
      bank: user?.bank || "",
      hourlyRate: user?.hourlyRate || 0,
      isLocked: user?.isLocked || false,
      createdAt: user?.createdAt ? new Date(user.createdAt).toISOString() : "",
      updatedAt: user?.updatedAt ? new Date(user.updatedAt).toISOString() : "",
      image: user?.image || null,
    });
  }, [getUserById, id]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "bankCode") {
      setFormData((prev) => ({
        ...prev,
        bankCode: value ? Number(value) : null,
      }));
      return;
    }

    if (name === "hourlyRate") {
      setFormData((prev) => ({
        ...prev,
        hourlyRate: value ? Number(value) : 0,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, bank: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData((prev) => ({ ...prev, image: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setPreviewImage(
        typeof employees?.image === "string" ? employees.image : null,
      );
      setFormData({
        name: employees?.name || "",
        email: employees?.email || "",
        role: employees?.role || "staff",
        bankCode: employees?.bankCode || null,
        bank: employees?.bank || "",
        hourlyRate: employees?.hourlyRate || 0,
        isLocked: employees?.isLocked || false,
        createdAt: employees?.createdAt
          ? new Date(employees.createdAt).toISOString()
          : "",
        updatedAt: employees?.updatedAt
          ? new Date(employees.updatedAt).toISOString()
          : "",
        image: employees?.image || null,
      });
    }

    setIsEditing((prev) => !prev);
  };

  const handleSubmit = async () => {
    if (!employees) {
      enqueueSnackbar("Không có dữ liệu nào cần cập nhật!", {
        variant: "info",
        autoHideDuration: 1500,
      });
      return;
    }

    try {
      setIsSaving(true);

      const updatedUser: Employees = {
        ...employees,
        ...formData,
        image: formData.image || employees.image,
      };

      await updateUser(updatedUser);
      setEmployees(updatedUser);
      await fetchUser();
      setIsEditing(false);
      enqueueSnackbar("Cập nhật hồ sơ thành công!", {
        variant: "success",
        autoHideDuration: 1500,
      });
    } catch (error: any) {
      const responseMessage =
        error.response?.data?.message ||
        "Xảy ra lỗi khi cập nhật!";
      enqueueSnackbar(responseMessage, {
        variant: "error",
        autoHideDuration: 1500,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const profileImage =
    previewImage ||
    (typeof formData.image === "string" ? formData.image : null) ||
    "https://png.pngtree.com/png-vector/20190710/ourmid/pngtree-user-vector-avatar-png-image_1541962.jpg";

  const infoCards = [
    {
      icon: <ShieldCheck className="h-5 w-5 text-sky-600" />,
      label: "Vai trò",
      value: getRoleLabel(formData.role),
    },
    {
      icon: <LockKeyhole className="h-5 w-5 text-emerald-600" />,
      label: "Trạng thái",
      value: getStatusLabel(formData.isLocked),
    },
    {
      icon: <Wallet className="h-5 w-5 text-violet-600" />,
      label: "Lương theo giờ",
      value: formatCurrency(formData.hourlyRate),
    },
    {
      icon: <CalendarDays className="h-5 w-5 text-amber-600" />,
      label: "Ngày tham gia",
      value: formatDateTime(formData.createdAt),
    },
  ];

  if (!employees) {
    return (
      <section className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[32px] bg-white p-8 shadow-xl">
          <div className="space-y-4 animate-pulse">
            <div className="h-10 w-40 rounded-full bg-slate-200" />
            <div className="h-40 rounded-[28px] bg-slate-100" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-64 rounded-[28px] bg-slate-100" />
              <div className="h-64 rounded-[28px] bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-r from-blue-200 to-purple-300 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="relative overflow-hidden rounded-[32px] bg-slate-900 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] sm:p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.26),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_20%)]" />
          <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-200">
                  <BadgeCheck className="h-4 w-4" />
                  Hồ sơ nhân sự
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {employees.name}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${
                  formData.isLocked
                    ? "bg-rose-400/15 text-rose-100"
                    : "bg-emerald-400/15 text-emerald-100"
                }`}
              >
                {getStatusLabel(formData.isLocked)}
              </span>
              <button
                type="button"
                onClick={handleEditToggle}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  isEditing
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-white text-slate-900 hover:bg-slate-100"
                }`}
              >
                <PencilLine className="h-4 w-4" />
                {isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa hồ sơ"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-sky-200 blur-2xl" />
                  <Image
                    src={profileImage}
                    alt={employees.name}
                    preview={false}
                    style={{ width: "132px", height: "132px" }}
                    className="relative rounded-full border-[6px] border-white object-cover shadow-xl"
                  />
                </div>

                <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                  {formData.name}
                </h2>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                  <Mail className="h-4 w-4" />
                  {formData.email}
                </div>

                <div className="mt-6 grid w-full grid-cols-2 gap-3">
                  {infoCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left"
                    >
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                        {item.icon}
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {isEditing && (
                  <label className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100">
                    <UserRound className="h-4 w-4" />
                    Cập nhật ảnh đại diện
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)]">
              <h3 className="text-lg font-semibold text-slate-900">
                Tóm tắt hồ sơ
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Thông tin quan trọng được gom lại để kiểm tra nhanh trạng thái
                tài khoản, dữ liệu ngân hàng và thời gian cập nhật gần nhất.
              </p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-500">Ngân hàng</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formData.bank || "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-500">Số tài khoản</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formData.bankCode || "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-500">
                    Cập nhật lần cuối
                  </span>
                  <span className="text-right text-sm font-semibold text-slate-900">
                    {formatDateTime(formData.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    Thông tin cá nhân
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Chỉnh sửa các trường cơ bản của nhân viên trong một bố cục
                    rõ ràng và dễ quét.
                  </p>
                </div>
                {isEditing && (
                  <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                    Đang ở chế độ chỉnh sửa
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Họ và tên
                  </label>
                  {isEditing ? (
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={inputClassName}
                    />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900">
                      {formData.name || "Chưa cập nhật"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={inputClassName}
                    />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900">
                      {formData.email || "Chưa cập nhật"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Số tài khoản ngân hàng
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="bankCode"
                      value={formData.bankCode ?? ""}
                      onChange={handleInputChange}
                      className={inputClassName}
                    />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900">
                      {formData.bankCode || "Chưa cập nhật"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Ngân hàng
                  </label>
                  {isEditing ? (
                    <select
                      name="bank"
                      value={formData.bank}
                      onChange={handleSelectChange}
                      className={inputClassName}
                    >
                      <option value="">Chọn ngân hàng</option>
                      {bankList.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900">
                      {formData.bank || "Chưa cập nhật"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-[30px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] sm:p-8">
                <h3 className="text-xl font-semibold text-slate-900">
                  Công việc và tài chính
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Theo dõi vai trò, mức lương và trạng thái truy cập của nhân
                  viên.
                </p>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Mức lương theo giờ
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleInputChange}
                        className={inputClassName}
                      />
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
                        {formatCurrency(formData.hourlyRate)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Chức vụ
                    </label>
                    {isEditing ? (
                      <select
                        name="role"
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        className={inputClassName}
                      >
                        <option value="ADMIN">Quản lý</option>
                        <option value="STAFF">Nhân viên</option>
                      </select>
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
                        {getRoleLabel(formData.role)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Trạng thái tài khoản
                    </label>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
                      {getStatusLabel(formData.isLocked)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">
                      Thời gian tham gia
                    </label>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">
                      {formatDateTime(formData.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.55)] sm:p-8">
                <h3 className="text-xl font-semibold text-slate-900">
                  Điểm nhấn hồ sơ
                </h3>
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-4 rounded-2xl bg-white/80 p-4 shadow-sm">
                    <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Liên hệ
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Số điện thoại liên hệ: 0819599312.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl bg-white/80 p-4 shadow-sm">
                    <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Thanh toán lương
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formData.bank
                          ? `Lương hiện được cấu hình với ngân hàng ${formData.bank}.`
                          : "Chưa có thông tin ngân hàng để đối soát lương."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl bg-white/80 p-4 shadow-sm">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Trạng thái hồ sơ
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Hồ sơ hiện{" "}
                        {getStatusLabel(formData.isLocked).toLowerCase()}, cập
                        nhật lần gần nhất vào{" "}
                        {formatDateTime(formData.updatedAt)}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StaffDetail;
