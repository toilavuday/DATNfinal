"use client";
import React from "react";

import HeaderTool from "./headerTool";
import { useRecoilValue } from "recoil";
import { authState } from "@/shared/store/Atoms/auth";
import Sidebar from "./sidebar";
import DateTime from "@/components/dateTime";

const HomeLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const auth = useRecoilValue(authState);
  console.log(auth);
  return (
    <Sidebar>
      <header className="  bg-opacity-45 !px-0 flex justify-between items-center mb-4">
        <h3 className=" flex flex-col text-[24px] font-extralight text-typography-100 ml-5">
          <span
            className="font-semibold text-gray-600 italic "
            style={{ fontFamily: "Georgia, serif" }}
          >
            Welcome {auth.user?.name} !
          </span>
          <span className="text-gray-500 ">
            <DateTime />
          </span>
        </h3>

        <HeaderTool />
      </header>
      {children}
    </Sidebar>
  );
};

export default HomeLayout;
