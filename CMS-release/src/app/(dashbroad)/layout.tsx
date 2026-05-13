import "@/styles/globals.css";
import HomeLayout from "./layouts/home-layout";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <HomeLayout>{children}</HomeLayout>;
}
