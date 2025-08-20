// components/TopHeader.tsx
"use client";

import { ReactNode } from "react";

type Props = {
  title?: string;
  className?: string;
  children?: ReactNode;
};

export default function TopHeader({ children }: Props) {
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 h-[48px]">
      {children}
    </header>
  );
}
