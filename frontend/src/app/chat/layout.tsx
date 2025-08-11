"use client";

import Link from "next/link";
import { FaBook, FaComments, FaGlobe } from "react-icons/fa";

export default function Layout({ children }: any) {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
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
      {/* <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-lg font-medium">How can I help today?</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`self-${msg.role === 'user' ? 'end' : 'start'} max-w-[70%] px-4 py-2 rounded-lg ${
                    msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Message EKB..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              ⬆
            </button>
          </div>
        </div>
        
      </div> */}
    </div>
  );
}
