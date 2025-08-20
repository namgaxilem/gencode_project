import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import RootContext from "@/contexts";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Vercel v0 Inspired - Next.js 15",
  description:
    "A modern Next.js 15 application with Vercel v0 design aesthetic",
  keywords: ["Next.js", "React", "Tailwind CSS", "TypeScript"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        <RootContext>{children}</RootContext>
      </body>
    </html>
  );
}
