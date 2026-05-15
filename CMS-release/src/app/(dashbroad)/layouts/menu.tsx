import React from "react";
import { Menu, MenuProps } from "antd";
import {
  AppstoreOutlined,
  SettingOutlined,
  DollarOutlined,
  OrderedListOutlined,
  AppstoreAddOutlined,
  TeamOutlined,
  CommentOutlined,
  RobotOutlined,
  BellOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarMenuProps {
  onMenuClick?: () => void;
  role: string;
  collapsed?: boolean;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  onMenuClick,
  role,
  collapsed = false,
}) => {
  const pathname = usePathname();
  const iconStyle = { fontSize: "18px" };

  const salesRoutes: MenuProps["items"] = [
    {
      key: "/orders",
      label: <Link href="/orders">Tạo đơn hàng</Link>,
      icon: <OrderedListOutlined style={iconStyle} />,
    },
    {
      key: "/messages",
      label: <Link href="/messages">Tin nhắn</Link>,
      icon: <CommentOutlined style={iconStyle} />,
    },
  ];

  const managementRoutes: MenuProps["items"] = [
    {
      key: "/home",
      label: <Link href="/home">Quản lý kinh doanh</Link>,
      icon: <AppstoreOutlined style={iconStyle} />,
    },
    {
      key: "/notifications",
      label: <Link href="/notifications">Quản lý thông báo</Link>,
      icon: <BellOutlined style={iconStyle} />,
    },
    {
      key: "/staff",
      label: <Link href="/staff">Quản lý nhân viên</Link>,
      icon: <TeamOutlined style={iconStyle} />,
    },
    {
      key: "/products",
      label: <Link href="/products">Quản lý sản phẩm</Link>,
      icon: <AppstoreAddOutlined style={iconStyle} />,
    },
    {
      key: "/salarys",
      label: <Link href="/salarys">Quản lý lương</Link>,
      icon: <DollarOutlined style={iconStyle} />,
    },
    {
      key: "/inventory",
      label: <Link href="/inventory">Quản lý kho</Link>,
      icon: <DollarOutlined style={iconStyle} />,
    },
    {
      key: "/ai-chat",
      label: <Link href="/ai-chat">Chat AI</Link>,
      icon: <RobotOutlined style={iconStyle} />,
    },
  ];

  const scheduleRoutes: MenuProps["items"] = [
    {
      key: "/workschedules",
      label: <Link href="/workschedules">Lịch làm việc</Link>,
      icon: <DollarOutlined style={iconStyle} />,
    },
  ];

  const expandedItems: MenuProps["items"] = [
    {
      key: "sales",
      label: "Trang chủ",
      icon: <AppstoreOutlined style={iconStyle} />,
      children: salesRoutes,
    },
    ...(role === "ADMIN"
      ? [
          {
            key: "management",
            label: "Quản lý cửa hàng",
            icon: <SettingOutlined style={iconStyle} />,
            children: managementRoutes,
          },
        ]
      : []),
    {
      key: "schedule",
      label: "Lịch trình",
      icon: <DollarOutlined style={iconStyle} />,
      children: scheduleRoutes,
    },
  ];

  const collapsedItems: MenuProps["items"] = [
    ...salesRoutes,
    ...(role === "ADMIN" ? managementRoutes : []),
    ...scheduleRoutes,
  ];

  const items = collapsed ? collapsedItems : expandedItems;
  const routeItems = [
    ...salesRoutes,
    ...(role === "ADMIN" ? managementRoutes : []),
    ...scheduleRoutes,
  ];

  const selectedKey =
    routeItems.find((item) => pathname.startsWith(String(item?.key)))?.key ||
    "/orders";

  const defaultOpenKeys = ["sales", "management", "schedule"].filter(
    (key) => key !== "management" || role === "ADMIN",
  );

  return (
    <Menu
      onClick={() => {
        if (onMenuClick) onMenuClick();
      }}
      mode="inline"
      inlineCollapsed={collapsed}
      selectedKeys={[String(selectedKey)]}
      defaultOpenKeys={defaultOpenKeys}
      items={items}
      className="modern-sidebar-menu border-none bg-transparent text-[15px]"
    />
  );
};

export default SidebarMenu;
