"use client";

import { useMemo, useState } from "react";

// ---- Types ----
type Framework = "react" | "next" | "vue" | "svelte";

type Project = {
  id: string;
  name: string;
  framework: Framework;
  description?: string;
  createdAt: string; // ISO date
  updatedAt?: string; // ISO date
  status?: "ready" | "building" | "failed";
};

// ---- Mock data (replace with API call) ----
const MOCK_PROJECTS: Project[] = [
  {
    id: "p_001",
    name: "Customer Portal",
    framework: "next",
    description: "Next.js 15 + Tailwind + Auth.",
    createdAt: "2025-08-05T09:30:00.000Z",
    updatedAt: "2025-08-10T10:00:00.000Z",
    status: "ready",
  },
  {
    id: "p_002",
    name: "Marketing Site",
    framework: "react",
    description: "Vite + React + Tailwind landing page.",
    createdAt: "2025-08-07T12:10:00.000Z",
    updatedAt: "2025-08-09T08:00:00.000Z",
    status: "ready",
  },
  {
    id: "p_003",
    name: "Admin Dashboard",
    framework: "vue",
    description: "Vue 3 + Pinia + Tailwind.",
    createdAt: "2025-08-04T08:45:00.000Z",
    status: "building",
  },
  {
    id: "p_004",
    name: "Docs Site",
    framework: "svelte",
    description: "SvelteKit starter with Tailwind.",
    createdAt: "2025-08-01T14:20:00.000Z",
    status: "failed",
  },
];

// ---- Helpers ----
const fwLabel: Record<Framework, string> = {
  react: "React",
  next: "Next.js",
  vue: "Vue",
  svelte: "Svelte",
};

function classNames(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---- Component ----
export default function ProjectsPage() {
  // Replace with data from your API:
  // const { data: projects, isLoading } = useSWR("/api/projects", fetcher)
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState<Framework | "all">("all");
  const [sort, setSort] = useState<"newest" | "name">("newest");

  const projects = useMemo(() => {
    let list = [...MOCK_PROJECTS];
    if (framework !== "all") list = list.filter(p => p.framework === framework);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }
    if (sort === "newest") {
      list.sort((a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime()
      );
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [query, framework, sort]);

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Frontend Projects
            </h1>
            <p className="text-sm text-gray-500">
              Generated projects listed below. Use filters to find what you need.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50">
              New project
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="col-span-1 sm:col-span-1">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              >
                <path d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm8.32 12.9-2.84-2.84a8 8 0 1 0-1.41 1.41l2.84 2.84a1 1 0 0 0 1.41-1.41Z" />
              </svg>
            </div>
          </div>

          <div className="col-span-1">
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value as Framework | "all")}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="all">All frameworks</option>
              <option value="react">React</option>
              <option value="next">Next.js</option>
              <option value="vue">Vue</option>
              <option value="svelte">Svelte</option>
            </select>
          </div>

          <div className="col-span-1">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="newest">Sort by: Newest</option>
              <option value="name">Sort by: Name (A→Z)</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <article
              key={p.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={classNames(
                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                    p.framework === "next" && "bg-black text-white",
                    p.framework === "react" && "bg-sky-100 text-sky-700",
                    p.framework === "vue" && "bg-emerald-100 text-emerald-700",
                    p.framework === "svelte" && "bg-orange-100 text-orange-700"
                  )}
                >
                  {fwLabel[p.framework]}
                </span>
                {p.status && (
                  <span
                    className={classNames(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      p.status === "ready" && "bg-green-100 text-green-700",
                      p.status === "building" && "bg-amber-100 text-amber-700",
                      p.status === "failed" && "bg-rose-100 text-rose-700"
                    )}
                  >
                    {p.status}
                  </span>
                )}
              </div>

              <h3 className="line-clamp-1 text-base font-semibold text-gray-900">
                {p.name}
              </h3>
              {p.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.description}</p>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Created {timeAgo(p.createdAt)}</span>
                {p.updatedAt && <span>Updated {timeAgo(p.updatedAt)}</span>}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <a
                  href={`/projects/${p.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  View
                </a>
                <a
                  href={`/api/projects/${p.id}/download`}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                >
                  Download
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100"></div>
            <p className="font-medium text-gray-900">No projects found</p>
            <p className="text-sm text-gray-500">Try another keyword or filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
