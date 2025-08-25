"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  LogOut,
  HelpCircle as HelpCircleIcon,
  FolderKanban,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";

type ChatItem = { id: string; title: string; href: string; date?: string };

type LayoutProps = {
  children: React.ReactNode;
  chats?: ChatItem[];
  user?: { name: string; plan?: string; avatarUrl?: string };
};

export default function AppLayout({
  children,
  chats = [],
  user = { name: "Nam Nguyen", plan: "Personal Plan" },
}: LayoutProps) {
  const [open, setOpen] = useState(false);
  const params = useParams(); // returns { projectId: "123" }
  const projectId = params?.projectId as string;
  const pathname = usePathname(); // e.g. "/projects/123"
  console.log(pathname);

  const grouped = useMemo(() => {
    const map = new Map<string, ChatItem[]>();
    for (const c of chats) {
      const k = c.date ?? "Recent";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return Array.from(map.entries());
  }, [chats]);

  return (
    <div className="min-h-[100dvh] bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex">
      {/* Sidebar (full height, collapsible) */}
      <aside
        className={[
          "sticky top-0 h-[100dvh] border-r transition-[width] duration-200 ease-in-out",
          "border-neutral-200 bg-neutral-50/95 dark:border-neutral-800 dark:bg-neutral-900/95",
          open ? "w-72" : "w-14",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          <Link href="/" className="flex items-center justify-center px-3 pt-4">
            {open ? (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg" // ← replace with your logo path
                  alt="Logo"
                  className="h-8 w-8"
                />
                <span className="text-lg font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
                  MyApp
                </span>
              </div>
            ) : (
              <img
                src="/logo.svg" // ← replace with your logo path
                alt="Logo"
                className="h-8 w-8"
              />
            )}
          </Link>

          {/* New project */}
          <Link href="/generate" className="px-3 pt-3">
            {open ? (
              <button className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-500 active:scale-[0.99]">
                <Plus className="size-4" />
                Start new project
              </button>
            ) : (
              <button
                className="mx-auto block rounded-xl p-2 text-blue-600 hover:bg-neutral-100 dark:text-blue-500 dark:hover:bg-neutral-800/70"
                aria-label="Start new project"
              >
                <Plus className="size-5" />
              </button>
            )}
          </Link>

          {/* Search (mobile) */}
          <div className="px-3 pt-3 pb-2 md:hidden">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
              <input
                placeholder="Search"
                className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200 dark:placeholder:text-neutral-500"
              />
            </label>
          </div>

          {/* Chats / projects */}
          <div className="mt-5 flex-1 overflow-y-auto px-2">
            <div className="mb-3 px-2">
              {open ? (
                <Link
                  className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
                  href={"/projects"}
                >
                  Your recent projects
                </Link>
              ) : null}

              <ul className="space-y-1">
                <li
                  className={`${
                    Number(projectId) === 1 && "bg-primary-500"
                  } rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/70`}
                >
                  <Link
                    href={"/projects/1"}
                    className={[
                      "group flex items-center gap-2 rounded-lg px-2 py-2",
                      open ? "" : "justify-center",
                    ].join(" ")}
                  >
                    <span className="rounded-md bg-neutral-200 p-1.5 dark:bg-neutral-800">
                      <FolderKanban className="size-4 text-neutral-700 dark:text-neutral-300" />
                    </span>
                    {open && (
                      <span className="line-clamp-2 text-base text-neutral-800 group-hover:text-neutral-900 dark:text-neutral-200 dark:group-hover:text-white">
                        title
                      </span>
                    )}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Utility links */}
          <div className="px-2">
            <nav className="space-y-1.5 py-2">
              <SidebarLink
                active={pathname.startsWith("/settings")}
                open={open}
                href="/settings"
                icon={
                  <Settings className="size-4 text-neutral-600 dark:text-neutral-300" />
                }
              >
                Settings
              </SidebarLink>

              {/* Example extra link (keep if needed) */}
              {/* <SidebarLink
                open={open}
                href="/help"
                icon={<HelpCircleIcon className="size-4 text-neutral-600 dark:text-neutral-300" />}
              >
                Help Center
              </SidebarLink> */}

              <button
                className={[
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800/70",
                  open ? "text-neutral-700" : "justify-center text-neutral-700",
                ].join(" ")}
                onClick={() => {}}
              >
                <LogOut className="size-4 text-neutral-600 dark:text-neutral-300" />
                {open && "Sign Out"}
              </button>
            </nav>
          </div>

          {/* User + collapse toggle at bottom */}
          <div className="mt-auto border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
            <div
              className={[
                "flex items-center",
                open ? "justify-between gap-3" : "flex-col gap-2",
              ].join(" ")}
            >
              <div
                className={[
                  "flex items-center gap-3",
                  open ? "" : "justify-center",
                ].join(" ")}
              >
                <div className="h-9 w-9 overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      {initials(user.name)}
                    </div>
                  )}
                </div>
                {open && (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {user.name}
                    </div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {user.plan ?? "—"}
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle button moved here */}
              <button
                onClick={() => setOpen((s) => !s)}
                aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
                className={[
                  "rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/70",
                  open ? "" : "mt-1",
                ].join(" ")}
              >
                {open ? (
                  <PanelLeftClose className="size-5" />
                ) : (
                  <PanelLeftOpen className="size-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content (full height) */}
      <main className="h-[100dvh] flex-1 bg-white dark:bg-neutral-950 overflow-auto">
        {children}
      </main>
    </div>
  );
}

/* ---------- small helpers ---------- */

function SidebarLink({
  open,
  href,
  icon,
  children,
  active,
}: {
  open: boolean;
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        active ? "bg-primary-500" : "",
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
        "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800/70",
        open ? "" : "justify-center",
      ].join(" ")}
    >
      {icon}
      {open && children}
    </Link>
  );
}

function initials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
