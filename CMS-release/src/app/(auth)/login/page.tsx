"use client";
import React, { useState } from "react";
import { useLogin } from "@/shared/hooks/auth";
import Image from "next/image";
import Logo from "@public/images/logo.png";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AiFillEye,
  AiOutlineArrowRight,
  AiOutlineCheckCircle,
  AiOutlineEyeInvisible,
  AiOutlineLock,
  AiOutlineMail,
} from "react-icons/ai";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginUser } = useLogin();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await loginUser({ email, password });
    setIsSubmitting(false);

    if (result && result.success) {
      if (result.role === "STAFF") {
        router.replace("/orders");
      } else {
        router.replace("/home");
      }
    } else {
      router.replace("/login");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5efe6] px-4 py-8 sm:px-6 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(120,53,15,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(14,116,144,0.22),_transparent_30%),linear-gradient(135deg,_#f7f1e8_0%,_#f0e4d2_48%,_#dce8ea_100%)]" />
      <div className="absolute left-[-80px] top-20 h-56 w-56 rounded-full bg-[#b45309]/20 blur-3xl" />
      <div className="absolute bottom-10 right-[-60px] h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/60 bg-white/70 shadow-[0_24px_80px_rgba(73,48,24,0.18)] backdrop-blur xl:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden bg-[#26170f] px-10 py-12 text-white xl:flex xl:flex-col xl:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,_rgba(255,255,255,0.03),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.22),_transparent_26%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm tracking-[0.2em] text-amber-100 uppercase">
              Coffee Management System
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="rounded-3xl bg-white/10 p-3 shadow-lg ring-1 ring-white/10">
                <Image src={Logo} alt="CMS Logo" className="h-20 w-20 object-contain" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-amber-200/80">
                  Admin Portal
                </p>
                <h1 className="mt-2 max-w-md text-4xl font-semibold leading-tight">
                  Điều hành quán gọn hơn với một màn hình đăng nhập rõ ràng và tập trung.
                </h1>
              </div>
            </div>
            <p className="mt-8 max-w-xl text-lg leading-8 text-stone-300">
              Quản lý nhân sự, lịch làm việc, đơn hàng và sản phẩm trong một không gian trực quan, đủ sáng để đọc lâu và đủ gọn để thao tác nhanh.
            </p>
          </div>

          <div className="relative grid gap-4 md:grid-cols-3">
            {[
              "Theo dõi nhân viên và phân quyền rõ ràng",
              "Xử lý đơn hàng ngay tại quầy nhanh hơn",
              "Báo cáo doanh thu và lịch làm việc tập trung",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-stone-200"
              >
                <AiOutlineCheckCircle className="mb-3 text-2xl text-amber-300" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between xl:hidden">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#2f1b12] p-2 shadow-md">
                  <Image src={Logo} alt="CMS Logo" className="h-12 w-12 object-contain" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-stone-500">
                    Coffee CMS
                  </p>
                  <p className="text-lg font-semibold text-stone-800">
                    Đăng nhập hệ thống
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200/80 bg-white/90 p-6 shadow-[0_14px_40px_rgba(100,74,48,0.12)] sm:p-8">
              <div className="mb-8">
                <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-700">
                  Welcome Back
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-stone-900 sm:text-4xl">
                  Đăng nhập
                </h2>
                <p className="mt-3 text-base leading-7 text-stone-500">
                  Truy cập bảng điều khiển để quản lý cửa hàng cà phê nhanh và gọn hơn.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-stone-600"
                  >
                    Email
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition focus-within:border-cyan-600 focus-within:bg-white">
                    <AiOutlineMail className="shrink-0 text-xl text-stone-400" />
                    <input
                      type="email"
                      id="email"
                      className="w-full bg-transparent text-base text-stone-900 outline-none placeholder:text-stone-400"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold uppercase tracking-[0.18em] text-stone-600"
                  >
                    Mật khẩu
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition focus-within:border-cyan-600 focus-within:bg-white">
                    <AiOutlineLock className="shrink-0 text-xl text-stone-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="w-full bg-transparent text-base text-stone-900 outline-none placeholder:text-stone-400"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhap mat khau"
                      required
                    />
                    <button
                      type="button"
                      className="text-stone-500 transition hover:text-stone-700"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "An mat khau" : "Hien mat khau"}
                    >
                      {showPassword ? (
                        <AiOutlineEyeInvisible size={22} />
                      ) : (
                        <AiFillEye size={22} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Bao mat tai khoan noi bo</span>
                  <Link
                    href="/forgot-password"
                    className="font-semibold text-cyan-700 transition hover:text-cyan-800"
                  >
                    Quen mat khau?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:bg-[#0f766e]/70"
                >
                  {isSubmitting ? "Dang dang nhap..." : "Dang nhap"}
                  <AiOutlineArrowRight className="text-lg" />
                </button>
              </form>

              <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-500">
                Su dung email duoc cap de truy cap he thong quan ly cua cua hang.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
