"use client";

import { SnackbarProvider } from "notistack";
import { ReactNode } from "react";

const NotificationProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      {children}
    </SnackbarProvider>
  );
};

export default NotificationProvider;
