"use client";

import React from "react";
import ToastProvider from "./ui/ToastProvider";

// AppShell: providers wrapper (toasts, future role-gating, etc.)
export default function AppShell({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

