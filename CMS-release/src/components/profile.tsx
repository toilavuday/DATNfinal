"use client";
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Dropdown, Image, MenuProps, message } from "antd";
import React, { useEffect } from "react";
import { useLogout } from "@/shared/hooks/auth";
import { useRecoilValue } from "recoil";
import { authState } from "@/shared/store/Atoms/auth";
import { useGetMe } from "@/shared/hooks/user";
import { useRouter } from "next/navigation";

interface ProfileProps {
  size?: number;
}

const Profile: React.FC<ProfileProps> = ({ size = 50 }) => {
  const { logoutUser } = useLogout();
  const auth = useRecoilValue(authState);
  const { getMeData } = useGetMe();
  const router = useRouter();
  useEffect(() => {
    const loadUserData = async () => {
      await getMeData();
    };

    void loadUserData();
  }, [getMeData]);
  const items: MenuProps["items"] = [
    {
      label: "Xem hồ sơ",
      key: "1",
      icon: <UserOutlined />,
    },
    {
      label: "Cài đặt",
      key: "2",
      icon: <SettingOutlined />,
    },
    {
      label: "Đăng xuất",
      key: "3",
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    if (e.key === "3") {
      logoutUser();
      message.success("Đăng xuất thành công.");
    } else if (e.key === "1") {
      router.push(`/staff/${auth.user?.id}`);
    }
  };

  const menuProps = {
    items,
    onClick: handleMenuClick,
  };

  return (
    <Dropdown menu={menuProps} placement="bottom">
      <Image
        src={typeof auth.user?.image === "string" ? auth.user.image : ""}
        alt="Logo"
        className="rounded-full cursor-pointer  hover:scale-110 hover:shadow-lg"
        preview={false}
        style={{
          height: `${size}px`,
          width: `${size}px`,
          border: "2px solid #e5e5e9",
        }}
      />
    </Dropdown>
  );
};

export default Profile;
