"use client";
import {
  ArrowUpRight,
  ImageUp,
  KeyRound,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
  UserPlus2,
} from "lucide-react";
import { BsFillUnlockFill, BsFillLockFill } from "react-icons/bs";
import React, { useCallback, useEffect, useState } from "react";
import { Employees } from "@/shared/types/user";
import { Button, Image, message, Modal } from "antd";
import {
  useAddUser,
  useDelete,
  useGetUser,
  useLockUser,
  useUpdateUser,
} from "@/shared/hooks/user";
import ProtectedRoute from "@/shared/providers/auth.provider";
import Link from "next/link";
import { enqueueSnackbar } from "notistack";
import { useSetRecoilState } from "recoil";
import { usersState } from "@/shared/store/Atoms/user";
import { syncStaffChatRoster } from "@/shared/utils/staff-chat";

const AdminPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employees[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentStaff, setCurrentStaff] = useState<Employees | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    image: null as File | null,
    role: "STAFF" as "ADMIN" | "STAFF",
    hourlyRate: "50000",
  });
  const setUsers = useSetRecoilState(usersState);
  const { fetchUsers } = useGetUser();
  const { deleteUser } = useDelete();
  const { addUser } = useAddUser();
  const { updateUser } = useUpdateUser();
  const { lockUser } = useLockUser();

  const getUsers = useCallback(async () => {
    const users = await fetchUsers();
    setEmployees(users);
    setUsers(users);
    syncStaffChatRoster(users);
    const token = localStorage.getItem("authToken");
    void fetch("/api/staff-chat", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }).catch((error) => {
      console.error("Không thể đồng bộ nhóm chat nhân viên:", error);
    });
  }, [fetchUsers, setUsers]);

  useEffect(() => {
    void getUsers();
  }, [getUsers]);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setPreviewImage(null);
    setCurrentStaff(null);
    setFormData({
      email: "",
      password: "",
      name: "",
      image: null,
      role: "STAFF",
      hourlyRate: "50000",
    });
  };
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData({ ...formData, image: file });
      setPreviewImage(URL.createObjectURL(file));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHourlyRate = Number(formData.hourlyRate);
    if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
      enqueueSnackbar("Luong khong hop le!", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    if (formData.role !== "ADMIN" && formData.role !== "STAFF") {
      enqueueSnackbar("Chuc vu khong hop le!", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }
    if (!currentStaff && !formData.image) {
      enqueueSnackbar("Hồ sơ đang thiếu hình ảnh !", {
        variant: "warning",
        autoHideDuration: 1500,
      });
      return;
    }

    try {
      if (currentStaff) {
        const updatedUser: Employees = {
          ...currentStaff,
          ...formData,
          role: formData.role,
          hourlyRate: parsedHourlyRate,
          image: formData.image || currentStaff.image,
        };
        await updateUser(updatedUser);
        enqueueSnackbar("Cập nhật hồ sơ thành công !", {
          variant: "success",
          autoHideDuration: 1500,
        });
      } else {
        await addUser({
          ...formData,
          role: formData.role,
          hourlyRate: parsedHourlyRate,
        } as Employees);
        enqueueSnackbar("Thêm nhân viên thành công !", {
          variant: "success",
          autoHideDuration: 1500,
        });
      }

      await getUsers();
    } catch (error: any) {
      const responseMessage =
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi. Vui lòng thử lại.";
      enqueueSnackbar(responseMessage, {
        variant: "error",
        autoHideDuration: 1500,
      });
    }

    closeModal();
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) {
      message.error("ID không hợp lệ. Không thể xóa.");
      return;
    }

    const targetEmployee = employees.find((employee) => employee.id === id);
    const adminCount = employees.filter(
      (employee) => employee.role === "ADMIN",
    ).length;

    if (targetEmployee?.role === "ADMIN" && adminCount <= 1) {
      enqueueSnackbar("Khong the xoa khi he thong chi con 1 quan ly.", {
        variant: "warning",
        autoHideDuration: 1800,
      });
      return;
    }

    try {
      await deleteUser(id);
      await getUsers();
    } catch {}
  };

  const handLockUser = async (id: string) => {
    await lockUser(id);
    await getUsers();
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <section className="rounded-xl px-3 py-4 sm:px-4 lg:px-6">
        <div className="rounded-[28px] bg-white/70 p-4 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
                Quản lý nhân viên
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Theo dõi hồ sơ, trạng thái tài khoản và truy cập nhanh vào trang
                chi tiết của từng nhân viên.
              </p>
            </div>
            <div className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
              {employees.length} nhân sự
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <Button
              color="primary"
              variant="filled"
              onClick={openModal}
              className="group flex h-full min-h-[250px] w-full items-center justify-center rounded-[28px] border border-dashed border-sky-300 bg-[linear-gradient(180deg,_#f3f9ff_0%,_#e0f2fe_100%)] text-sky-700 shadow-sm transition-all hover:-translate-y-1 hover:border-sky-500 hover:shadow-xl sm:min-h-[270px]"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white text-sky-700 shadow-lg transition-transform group-hover:scale-105">
                  <UserPlus2 className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-center">
                  <span className="block text-lg font-semibold sm:text-xl">
                    Thêm nhân viên
                  </span>
                  <span className="block text-sm text-sky-600">
                    Tạo hồ sơ mới trong vài bước
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm">
                  Bắt đầu
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </Button>
            {employees.map((employee) => (
              <article
                key={employee.id}
                className="group relative flex min-h-[250px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(241,245,249,0.98)_100%)] p-4 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.5)] transition-all hover:-translate-y-1 hover:shadow-xl sm:min-h-[270px]"
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_55%),linear-gradient(90deg,_rgba(14,165,233,0.12),_rgba(99,102,241,0.08))]" />

                <div className="relative flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      employee.isLocked
                        ? "bg-rose-50 text-rose-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {employee.isLocked ? "Đã khóa" : "Đang hoạt động"}
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-rose-600 shadow-sm transition hover:bg-rose-50"
                    onClick={() => {
                      if (employee.id) {
                        Modal.confirm({
                          title: "Xác nhận xóa nhân viên",
                          content: "Bạn có chắc chắn muốn xóa nhân viên này không?",
                          okText: "Xóa",
                          okType: "danger",
                          cancelText: "Hủy",
                          onOk: () => handleDelete(employee.id!),
                        });
                      } else {
                        console.error("Employee ID is undefined");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative mt-4 flex flex-1 flex-col">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-sky-200 blur-xl" />
                      <Image
                        src={
                          employee.image instanceof File
                            ? URL.createObjectURL(employee.image)
                            : employee.image || undefined
                        }
                        alt="Preview"
                        style={{ width: "82px", height: "82px" }}
                        className="relative rounded-full border-[5px] border-white object-cover shadow-lg"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 break-words text-lg font-bold text-slate-900 sm:text-xl">
                        {employee.name}
                      </h2>
                      <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Vai trò
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ShieldCheck className="h-4 w-4 text-sky-600" />
                        {employee.role === "ADMIN" ? "Quản lý" : "Nhân viên"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (employee.id) {
                          handLockUser(employee.id);
                        } else {
                          console.error("Employee ID is undefined");
                        }
                      }}
                      className={`rounded-2xl px-3 py-3 text-left transition ${
                        employee.isLocked
                          ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">
                        Trạng thái
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
                        {employee.isLocked ? (
                          <BsFillLockFill className="text-base" />
                        ) : (
                          <BsFillUnlockFill className="text-base" />
                        )}
                        {employee.isLocked ? "Mở khóa" : "Khóa tài khoản"}
                      </div>
                    </button>
                  </div>

                  <div className="mt-auto pt-5">
                    <Link
                      href={`/staff/${employee.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Xem chi tiết
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <Modal
          title={null}
          open={showModal}
          onCancel={closeModal}
          footer={null}
          destroyOnClose
          width={520}
          styles={{
            content: {
              borderRadius: 28,
              overflow: "hidden",
              padding: 0,
            },
            body: {
              padding: 0,
            },
          }}
        >
          <div className="overflow-hidden rounded-[28px] bg-white">
            <div className="relative overflow-hidden bg-slate-900 px-6 py-5 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.18),_transparent_24%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-sky-100">
                  <UserPlus2 className="h-4 w-4" />
                  {currentStaff ? "Chỉnh sửa hồ sơ" : "Nhân sự mới"}
                </div>
                <h2 className="mt-4 text-2xl font-semibold">
                  {currentStaff
                    ? "Cập nhật hồ sơ nhân viên"
                    : "Thêm nhân viên mới"}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Điền đầy đủ thông tin để tạo hồ sơ nhân sự rõ ràng và đồng bộ
                  trong hệ thống.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="flex flex-col items-center gap-4 rounded-[28px] bg-slate-50 p-5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-sky-200 blur-2xl" />
                  <Image
                    src={previewImage || undefined}
                    alt="Preview"
                    style={{ width: "112px", height: "112px" }}
                    className="relative rounded-full border-[5px] border-white object-cover shadow-lg"
                    fallback="https://png.pngtree.com/png-vector/20190710/ourmid/pngtree-user-vector-avatar-png-image_1541962.jpg"
                  />
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50">
                  <ImageUp className="h-4 w-4" />
                  Tải ảnh đại diện
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
                  Họ và tên
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    placeholder="Nhập họ và tên"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">
                  Email
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    placeholder="Nhập email đăng nhập"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">
                  Mật khẩu
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    placeholder="Nhập mật khẩu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Chuc vu
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                    >
                      <option value="ADMIN">Quan ly (ADMIN)</option>
                      <option value="STAFF">Nhan vien (STAFF)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">
                    Luong theo gio
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
                    <input
                      type="number"
                      min={1}
                      name="hourlyRate"
                      value={formData.hourlyRate}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                      placeholder="Nhap luong theo gio"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {currentStaff ? "Lưu cập nhật" : "Tạo nhân viên"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </section>
    </ProtectedRoute>
  );
};

export default AdminPage;
