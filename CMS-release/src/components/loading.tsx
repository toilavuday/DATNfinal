import React from "react";
import Image from "next/image";
import Loading from "@public/images/loading.gif";
const LoadingPage = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="flex flex-col items-center">
        <div className="loader mb-4"></div>
        <Image
          src={Loading}
          alt="Loading"
          priority
          width={370}
          height={370}
          unoptimized
        />
        <p className="text-lg text-gray-600">Đang tải, vui lòng đợi...</p>
      </div>
    </div>
  );
};

export default LoadingPage;
