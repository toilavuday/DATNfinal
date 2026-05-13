"use client";
import { emailAtom } from "@/shared/store/Atoms/auth";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { useRecoilState } from "recoil";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useRecoilState(emailAtom);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await axios(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          data: JSON.stringify({ email }),
        }
      );

      if (response.data.status === "faild") {
        setErrorMessage(
          response.data.message || "Đã xảy ra lỗi không xác định."
        );
      } else {
        setSuccessMessage(
          "Liên kết đặt lại mật khẩu đã gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến và đăng nhập lại."
        );
        router.replace("/reset-password");
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Đã xảy ra lỗi không xác định.");
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen bg-gradient-to-r from-purple-100 to-blue-200">
      <button
        className="absolute top-10 left-8 hidden md:block bg-gray-300 text-center w-36 rounded-2xl h-10  text-black text-xl font-semibold group"
        type="button"
        onClick={() => router.back()}
      >
        <div className="bg-green-400 rounded-xl h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[134px] z-10 duration-500">
          <AiOutlineArrowLeft />
        </div>
        <p className="translate-x-2">Quay lại</p>
      </button>
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-3xl font-bold mb-4 text-center">
          Đặt lại mật khẩu
        </h2>
        <p className="text-gray-600 mb-6 text-xl text-center">
          Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-lg font-medium  text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-lg  px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300"
              placeholder="Nhập email của bạn"
            />
          </div>

          {successMessage && (
            <p className="text-green-600 text-sm mb-4">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="w-full text-lg  bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
          >
            Gửi yêu cầu
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
