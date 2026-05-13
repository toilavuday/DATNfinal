"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRecoilValue } from "recoil";
import RecoilContextProvider from "./recoil-context.provider";
import NotificationCenterProvider from "./notification-center.provider";
import NotificationProvider from "./notification-stack.provider";
import ProgressBarProvider from "./progress-bar.provider";
import LoadingPage from "@/components/loading";
import { authState } from "../store/Atoms/auth";
import { isTokenExpired } from "../utils/tokenExpired";

const RootGuard = ({ children }: { children: ReactNode }) => {
  const auth = useRecoilValue(authState);
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const guestPaths = ["/login", "/forgot-password", "/reset-password"];
    const token = auth?.accessToken || localStorage.getItem("authToken");

    const checkToken = async () => {
      if (pathname === "/") {
        router.replace(token && !isTokenExpired(token) ? "/orders" : "/login");
        return;
      }

      if (token && !isTokenExpired(token) && guestPaths.includes(pathname)) {
        router.replace("/orders");
        return;
      }

      if ((!token || isTokenExpired(token)) && !guestPaths.includes(pathname)) {
        localStorage.removeItem("authToken");
        router.replace("/login");
      }
    };

    void checkToken().finally(() => setIsChecking(false));
  }, [auth, pathname, router]);

  return isChecking ? <LoadingPage /> : <>{children}</>;
};

const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <RecoilContextProvider>
      <NotificationProvider>
        <ProgressBarProvider>
          <RootGuard>
            <NotificationCenterProvider>{children}</NotificationCenterProvider>
          </RootGuard>
        </ProgressBarProvider>
      </NotificationProvider>
    </RecoilContextProvider>
  );
};
export default AppProviders;
