"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { SlSocialFoursqare } from "react-icons/sl";

const Navbar = () => {
  const router = useRouter();

  const handleHome = () => {
    router.replace("/home");
  };

  return (
    <div className="container mx-auto mt-2">
      <SlSocialFoursqare
        className="text-5xl p-1 text-white rounded-xl bg-blue-400 cursor-pointer"
        onClick={handleHome}
      />
    </div>
  );
};

export default Navbar;
