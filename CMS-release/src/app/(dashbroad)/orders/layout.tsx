"use client";
import { useRouter } from "next/navigation";
import React, { ReactNode } from "react";
import { AiOutlineArrowLeft } from "react-icons/ai";

interface BlogLayoutProps {
  children: ReactNode;
}

const BlogLayout: React.FC<BlogLayoutProps> = ({ children }) => {
  const router = useRouter();
  return (
    <div>
      <nav>
        <button
          className="hidden md:block bg-gray-300 text-center w-36 rounded-2xl h-10 relative text-black text-xl font-semibold group"
          type="button"
          onClick={() => router.back()}
        >
          <div className="bg-green-400 rounded-xl h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[134px] z-10 duration-500">
            <AiOutlineArrowLeft />
          </div>
          <p className="translate-x-2">Quay lại</p>
        </button>
      </nav>
      <main>{children}</main>
    </div>
  );
};

export default BlogLayout;
