"use client";
import React, { useState, useEffect } from "react";
import { Switch } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";

const ThemeSwitch = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Kiểm tra nếu người dùng đã chọn chế độ tối trước đó
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      setIsDarkMode(true);
      document.body.classList.add("dark");
    }
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="flex items-center">
      <Switch
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        checked={isDarkMode}
        onChange={toggleTheme}
        className="theme-switch"
      />
    </div>
  );
};

export default ThemeSwitch;
