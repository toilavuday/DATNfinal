"use client";
import React, { useState, useEffect } from "react";
import { Layout, Button, Drawer } from "antd";
import {
  MenuOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
} from "@ant-design/icons";
import SidebarMenu from "./menu";
import logo from "@public/images/logo.png";
import supporter from "@public/supporter.svg";
import zalo from "@public/zalo.svg";
import Image from "next/image";
import Profile from "@/components/profile";
import Link from "next/link";
import { useRecoilValue } from "recoil";
import { authState } from "@/shared/store/Atoms/auth";

const { Header, Sider, Content, Footer } = Layout;

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const auth = useRecoilValue(authState);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const role = auth.user?.role || "STAFF";

  if (isMobile) {
    return (
      <Layout>
        <Header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            width: "100%",
            height: "74px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 36px",
            color: "white",
            backgroundColor: "#97c4ff",
          }}
        >
          <Button
            icon={<MenuOutlined style={{ fontSize: "36px" }} />}
            onClick={() => setDrawerVisible(true)}
            type="text"
          />

          <div className="">
            <Image src={logo} alt="Logo" height={80} />
          </div>

          <Profile />
        </Header>

        <Drawer
          title={
            <Image
              src={logo}
              alt="Logo"
              style={{
                display: "flex",
                alignItems: "center",
                textAlign: "center",
                justifyContent: "center",
              }}
            />
          }
          placement="left"
          closeIcon={null}
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={300}
          style={{
            background: "linear-gradient(to right, #f3e8ff, #bfdbfe)",
            position: "relative",
          }}
          styles={{
            body: {
              padding: 0,
            },
          }}
        >
          <SidebarMenu
            role={role}
            onMenuClick={() => setDrawerVisible(false)}
          />
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
              display: collapsed ? "none" : "block",
              transition: "display 0.3s ease-in-out",
            }}
          >
            <Image
              src={supporter}
              alt="supporter"
              style={{
                marginBottom: "16px",
                width: "320px",
              }}
            />
            <Link
              href="https://zalo.me/0819599312"
              target="_blank"
              className="flex justify-center items-center flex-row !mx-[-25px] gap-4 bg-gray-600 px-2 py-2 rounded-lg"
            >
              <Image
                src={zalo}
                alt="zalo"
                width={40}
                height={30}
                style={{ objectFit: "contain" }}
              />
              <span className="text-white font-semibold text-lg  ">
                Liên hệ 0819599312
              </span>
            </Link>
          </div>
        </Drawer>

        <Content
          style={{
            padding: "16px 0",

            background: "linear-gradient(to right, #f3e8ff, #bfdbfe)",
          }}
        >
          <div
            style={{
              minHeight: 380,
              background: "linear-gradient(to right, #f3e8ff, #bfdbfe)",
            }}
          >
            {children}
          </div>
        </Content>

        <Footer style={{ textAlign: "center" }}>
          Coffee Management Store
        </Footer>
      </Layout>
    );
  }

  return (
    <Layout className="relative">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={300}
        className="bg-gradient-to-r from-purple-100 to-blue-200"
        style={{ position: "fixed", height: "100vh" }}
      >
        <div className="flex items-center justify-center mt-4 bg-gradient-to-r from-purple-100 to-blue-200">
          <Image src={logo} alt="Logo" />
        </div>
        <Button
          type="text"
          icon={
            collapsed ? (
              <DoubleRightOutlined style={{ fontSize: "22px" }} />
            ) : (
              <DoubleLeftOutlined style={{ fontSize: "22px" }} />
            )
          }
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-5 right-[-30px] !text-blue-600"
        />
        <SidebarMenu role={role} />
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            display: collapsed ? "none" : "block",
            transition: "display 0.3s ease-in-out",
          }}
        >
          <Image
            src={supporter}
            alt="supporter"
            style={{
              marginBottom: "16px",
              width: "320px",
            }}
          />
          <Link
            href="https://zalo.me/0819599312"
            target="_blank"
            className="flex justify-center items-center flex-row !mx-[-25px] gap-4 bg-gray-600 px-2 py-2 rounded-lg"
          >
            <Image
              src={zalo}
              alt="zalo"
              width={40}
              height={30}
              style={{ objectFit: "contain" }}
            />
            <span className="text-white font-semibold text-lg  ">
              Liên hệ 0819599312
            </span>
          </Link>
        </div>
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 300 }}>
        <Content
          className="!bg-transparent p-5 bg-gradient-to-r from-blue-200 to-purple-300"
          style={{
            height: "100vh",
            overflowY: "auto",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default Sidebar;
