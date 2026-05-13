"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Select } from "antd";

const LanguageSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = useState<string>("en");

  useEffect(() => {
    const savedLocale = localStorage.getItem("language") || "en";
    setCurrentLocale(savedLocale);
    document.cookie = `language=${savedLocale}; path=/`;
  }, []);

  const handleLocaleChange = (locale: string) => {
    localStorage.setItem("language", locale);
    document.cookie = `language=${locale}; path=/`;
    const newPathname = pathname.replace(`/${currentLocale}`, `/${locale}`);

    setCurrentLocale(locale);
    router.replace(newPathname);
  };

  return (
    <div className="flex items-center space-x-4">
      <Select
        value={currentLocale}
        onChange={handleLocaleChange}
        variant="borderless"
        style={{
          width: 80,
          backgroundColor: "transparent",
          border: "none",
        }}
        className="w-16 focus:ring-0 focus:outline-none font-semibold text-xl custom-select"
        placeholder="Select language"
      >
        <Select.Option value="en">EN</Select.Option>
        <Select.Option value="vi">VI</Select.Option>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
