"use client";

import { useState, useEffect, useRef } from "react";
import { FaPlus } from "react-icons/fa";
import { WS_API_BASE } from "../config/constants";

const sampleHistory = [
  "Configuring ACM for DDNS",
  "Adding ACM to Cluster",
  "Configuring Master and Backup ACMs",
  "DDNS for AirLink MG90 Routers testing",
];

export default function Chatbot() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  // Kết nối WebSocket khi load component
  useEffect(() => {
    const socket = new WebSocket(`${WS_API_BASE}/ws/chat`);
    wsRef.current = socket;

    socket.onmessage = (event) => {
      // Khi server gửi tin nhắn mới
      const text = event.data;
      setMessages((prev) => [...prev, { role: "bot", content: text }]);
    };

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.onclose = () => {
      console.log("❌ WebSocket disconnected");
    };

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current) return;

    // Hiển thị tin nhắn của user ngay lập tức
    setMessages((prev) => [...prev, { role: "user", content: input }]);

    // Gửi qua WebSocket
    wsRef.current.send(input);

    setInput("");
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel - Chat History */}
      <div className="w-72 shrink-0 border-r p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today</h2>
          <FaPlus className="cursor-pointer text-gray-500" />
        </div>
        <div className="mb-4">
          <input
            className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Search..."
          />
        </div>
        <div className="flex flex-col gap-2 text-sm overflow-y-auto">
          {sampleHistory.map((title, i) => (
            <button
              key={i}
              className="text-left hover:bg-gray-100 px-2 py-2 rounded-md text-gray-700"
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Display */}
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
                  className={`max-w-[70%] px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "self-end bg-green-500 text-white"
                      : "self-start bg-gray-200 text-black"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Message EKB..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              ⬆
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
