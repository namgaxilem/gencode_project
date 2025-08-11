"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { HTTP_API_BASE } from "@/app/config/constants";

export default function GeneratedProjects() {
  const [data, setData] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchData = async (signal) => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(`${HTTP_API_BASE}/projects`, {
        params: { limit: 200, q: q || undefined },
        signal,
      });
      setData(res.data || []);
    } catch (e) {
      setErr(e?.message || "Fetch error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // load lần đầu

  const filtered = useMemo(() => {
    if (!q) return data;
    const s = q.toLowerCase();
    return data.filter(
      (x) =>
        x.name?.toLowerCase().includes(s) ||
        x.resource_path?.toLowerCase().includes(s)
    );
  }, [data, q]);

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const handleRefresh = async () => {
    const controller = new AbortController();
    await fetchData(controller.signal);
  };

  const copyPath = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Đã copy resource_path");
    } catch {
      alert("Không copy được, vui lòng copy thủ công.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Generated Projects
          </h1>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên hoặc đường dẫn…"
              className="w-72 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-blue-400"
            />
            <button
              onClick={handleRefresh}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr className="text-gray-600">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Resource Path</th>
                  <th className="px-4 py-3 font-semibold">Created At</th>
                  <th className="px-4 py-3 font-semibold">Created By</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      Đang tải…
                    </td>
                  </tr>
                )}
                {!loading && err && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-red-600"
                    >
                      {err}
                    </td>
                  </tr>
                )}
                {!loading && !err && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-500"
                    >
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
                {!loading &&
                  !err &&
                  filtered.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{row.id}</td>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[380px]">
                            {row.resource_path}
                          </span>
                          <button
                            onClick={() => copyPath(row.resource_path)}
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-100"
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3">{row.created_by || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <a
                            target="_blank"
                            href={`${HTTP_API_BASE}/projects/${row.id}/download`}
                            className="rounded-lg border px-3 py-1 text-xs hover:bg-gray-100"
                          >
                            Download ZIP
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-500">
            Tổng: {filtered.length} item(s)
          </div>
        </div>
      </div>
    </div>
  );
}
