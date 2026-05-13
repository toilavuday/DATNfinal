import Messenger from "@/components/messenger";
import NotificationSwitch from "@/components/notificationswitch";
import Profile from "@/components/profile";
import ThemeSwitch from "@/components/themeSwitch";
import { authState } from "@/shared/store/Atoms/auth";
import { QuestionCircleOutlined } from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useRecoilValue } from "recoil";

const HeaderTool = () => {
  const auth = useRecoilValue(authState);
  const pathname = usePathname();
  const isAdmin = auth?.user?.role === "ADMIN";
  const toolLinkClass = (active: boolean, tone: "emerald" | "sky") =>
    [
      "flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5",
      tone === "emerald" ? "hover:bg-emerald-50 hover:text-emerald-600" : "hover:bg-sky-50 hover:text-sky-600",
      active && tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "",
      active && tone === "sky" ? "bg-sky-50 text-sky-600" : "",
    ].join(" ");

  return (
    <div className="hidden md:flex items-center gap-1.5 rounded-[24px] border border-white/70 bg-white/72 px-2.5 py-1.5 shadow-[0_20px_48px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5">
        <div className="flex h-10 items-center rounded-xl border border-slate-200/80 bg-white/80 px-2.5 shadow-sm">
          <ThemeSwitch />
        </div>

        {isAdmin && (
          <Link
            href="/simulator"
            title="Tạo đơn giả lập"
            className={toolLinkClass(pathname.startsWith("/simulator"), "emerald")}
          >
            <QuestionCircleOutlined style={{ fontSize: "20px" }} />
          </Link>
        )}

        <Link
          href="/messages"
          title="Tin nhắn nhân viên"
          className={toolLinkClass(pathname.startsWith("/messages"), "sky")}
        >
          <Messenger />
        </Link>

        <div className="h-7 w-px bg-slate-200" />

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-600">
          <NotificationSwitch />
        </div>

        <div className="relative flex items-center rounded-xl border border-slate-200/80 bg-white/85 px-1 py-1 shadow-sm">
          <Profile size={40} />
          <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
        </div>
      </div>
    </div>
  );
};

export default HeaderTool;
