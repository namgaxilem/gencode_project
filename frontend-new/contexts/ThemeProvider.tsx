// components/ThemeProvider.tsx
"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { ConfigProvider } from "antd";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const darkMode = useThemeStore((s) => s.darkMode);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "green",
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
