"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useRecoilValue } from "recoil";
import { emailAtom } from "@/shared/store/Atoms/auth";
import { enqueueSnackbar } from "notistack";
import { ResetPasswordResponse } from "@/shared/types/auth";
import {
  AiFillEye,
  AiOutlineArrowLeft,
  AiOutlineEyeInvisible,
} from "react-icons/ai";

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const email = useRecoilValue(emailAtom);
  const [token, setToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token || !newPassword || !confirmPassword) {
      setError("Vui lòng điền đầy đủ các trường");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu không khớp.");
      return;
    }
    if (newPassword.length < 8) {
      setError(
        "Mật khẩu mới phải có ít nhất 8 ký tự,có chữ cái đầu in hoa , kí tự đặc biệt "
      );
      return;
    }

    try {
      const response = await axios.post<ResetPasswordResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`,
        { email, token, newPassword }
      );

      if (response.data.code === 200) {
        enqueueSnackbar("Thay đổi mật khẩu thành công", {
          variant: "success",
          autoHideDuration: 1500,
        });

        router.push("/login");
      } else {
        setError(response.data.message);
      }
    } catch {
      enqueueSnackbar("Đã xảy ra lỗi khi thay đổi mật khẩu.", {
        variant: "error",
        autoHideDuration: 1500,
      });
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen bg-gradient-to-r from-purple-100 to-blue-200">
      <button
        className=" absolute top-10 left-8 hidden md:block bg-gray-300 text-center w-36 rounded-2xl h-10  text-black text-xl font-semibold group"
        type="button"
        onClick={() => router.back()}
      >
        <div className="bg-green-400 rounded-xl h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[134px] z-10 duration-500">
          <AiOutlineArrowLeft />
        </div>
        <p className="translate-x-2">Quay lại</p>
      </button>
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-semibold text-center mb-6">
          Thay đổi mật khẩu
        </h1>

        <form onSubmit={handleSubmit} className="text-lg">
          <div className="mb-4">
            <label htmlFor="email" className="block  font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              readOnly
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="token" className="block  font-medium text-gray-700">
              Token (Kiểm tra email của bạn)
            </label>
            <input
              type="text"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="mb-4 relative">
            <label
              htmlFor="newPassword"
              className="block  font-medium text-gray-700"
            >
              Mật khẩu mới
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              className="absolute right-3 bottom-1 transform -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <AiOutlineEyeInvisible className="text-gray-500" size={20} />
              ) : (
                <AiFillEye className="text-gray-500" size={20} />
              )}
            </button>
          </div>

          <div className="mb-4 relative">
            <label
              htmlFor="confirmPassword"
              className="block  font-medium text-gray-700"
            >
              Lặp lại mật khẩu
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              className="absolute right-3 bottom-1 transform -translate-y-1/2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <AiOutlineEyeInvisible className="text-gray-500" size={20} />
              ) : (
                <AiFillEye className="text-gray-500" size={20} />
              )}
            </button>
            {error && <p className="text-red-500 text-sm my-4">{error}</p>}
            {success && (
              <p className="text-green-500 text-sm mb-4">{success}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none"
          >
            Cập nhật thay đổi
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
