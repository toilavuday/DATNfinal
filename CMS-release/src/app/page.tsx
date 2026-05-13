"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingPage from "@/components/loading";
import { isTokenExpired } from "@/shared/utils/tokenExpired";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (token && !isTokenExpired(token)) {
      router.replace("/orders");
      return;
    }

    localStorage.removeItem("authToken");
    router.replace("/login");
  }, [router]);

  return <LoadingPage />;
}
