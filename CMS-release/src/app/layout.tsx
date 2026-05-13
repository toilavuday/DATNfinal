import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";

import AppProviders from "@/shared/providers/app.provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Hệ thống quản lý cửa hàng cà phê",
  description: "Hệ thống quản lý cửa hàng cà phê",
  icons: "/images/logo.png",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="mdl-js antialiased">
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
