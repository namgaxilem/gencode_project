"use client";

import Link from "next/link";
import { FaBook, FaComments, FaGlobe } from "react-icons/fa";

export default function Layout({ children }: any) {
  return (
    <div className="flex h-screen bg-white">
      <div className="w-16 bg-green-700 flex flex-col items-center justify-between py-4 text-white">
        <div className="flex flex-col gap-6 items-center">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-full" />
          <Link href={"/chat"}>
            <FaComments className="text-xl cursor-pointer" />
          </Link>
          <Link href={"/chat/generated-projects"}>
            <FaBook className="text-xl cursor-pointer" />
          </Link>
        </div>
        <div className="flex flex-col items-center gap-4">
          <FaGlobe className="text-xl" />
          <div className="w-6 h-6 rounded-full bg-gray-300"></div>
        </div>
      </div>

      <div className="flex-1">{children}</div>
    </div>
  );
}
