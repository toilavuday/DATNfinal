"use client";

import { BellOutlined } from "@ant-design/icons";
import React from "react";
import { Badge, Popover } from "antd";
import NotificationCenterPanel from "@/components/notification-center-panel";
import { useNotificationCenter } from "@/shared/hooks/notification-center";

const NotificationSwitch = () => {
  const {
    isNotificationCenterOpen,
    setIsNotificationCenterOpen,
    unreadCount,
  } = useNotificationCenter();
  const popoverWidth = "33vw";
  const popoverHeight = "calc(100dvh - 80px)";

  const trigger = (
    <button
      type="button"
      className={`flex items-center justify-center text-current transition hover:opacity-80 ${
        isNotificationCenterOpen ? "text-sky-600" : ""
      }`}
    >
      <Badge count={unreadCount} size="small" offset={[2, -2]}>
        <BellOutlined style={{ fontSize: "20px" }} />
      </Badge>
    </button>
  );

  return (
    <Popover
      content={
        <div 
          className="w-full flex flex-col overflow-hidden" 
          style={{ maxHeight: "calc(100vh - 100px)" }}
        >
          <NotificationCenterPanel variant="compact" className="w-full flex-1 min-h-0" />
        </div>
      }
      trigger="click"
      placement="bottomRight"
      align={{ offset: [10, 26] }}
      open={isNotificationCenterOpen}
      onOpenChange={setIsNotificationCenterOpen}
      overlayClassName="notification-popover"
      overlayStyle={{
        zIndex: 9999,
        width: popoverWidth,
        minWidth: 320,
        maxWidth: 560,
      }}
      getPopupContainer={() => document.body}
    >
      {trigger}
    </Popover>
  );
};

export default NotificationSwitch;
