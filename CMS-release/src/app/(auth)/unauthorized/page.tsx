"use client";
import React from "react";
import Unauthorized from "@public/images/Unauthorized.png";
import Image from "next/image";
import { Button } from "antd";
import { useRouter } from "next/navigation";

const BlockPage = () => {
  const router = useRouter();

  const handleClickOut = () => {
    router.replace("/");
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-blue-100">
      <p className="mb-4 text-3xl font-semibold text-gray-700">
        Bạn không có quyền truy cập
      </p>
      <Image src={Unauthorized} alt="Unauthorized Access" />

      <Button onClick={handleClickOut} type="primary" className="mt-4">
        Quay lại trang chủ
      </Button>
    </div>
  );
};

export default BlockPage;
