"use client";

import React, { useMemo, useState } from "react";
import { Tree, Tabs, Input, Button, Tooltip, Dropdown, MenuProps, Tag } from "antd";
import type { DataNode } from "antd/es/tree";
import {
  MagnifyingGlassIcon,
  GearIcon,
  ChevronDownIcon,
  FileTextIcon,
  CodeIcon,
  GitHubLogoIcon,
  PlayIcon,
  PlusCircledIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

// --- Fake file system & content ---
const FILES: Record<string, string> = {
  "/README.md": `# Fake VS Code\n\nThis is a **fake** VS Code UI built with React, Tailwind, Radix Icons, and Ant Design.\n\n- Left: File Explorer (AntD Tree)\n- Center: Editor tabs with file content\n- Bottom: Terminal\n`,
  "/src/App.tsx": `import React from 'react'\n\nexport default function App(){\n  return <div className=\"p-6 text-sky-500\">Hello from App.tsx</div>\n}`,
  "/src/index.tsx": `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\n\ncreateRoot(document.getElementById('root')!).render(<App />)`,
  "/package.json": `{
  \"name\": \"fake-vscode\",\n  \"private\": true,\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"tsc && vite build\",\n    \"preview\": \"vite preview\"\n  }\n}`,
  "/tailwind.config.ts": `export default { content: [\"./index.html\", \"./src/**/*.{ts,tsx}\"], theme: { extend: {} }, plugins: [] }`,
};

const TREE: DataNode[] = [
  {
    title: "fake-vscode",
    key: "/",
    icon: <CodeIcon className="text-neutral-500" />,
    selectable: false,
    children: [
      { title: "README.md", key: "/README.md", icon: <FileTextIcon /> },
      { title: "package.json", key: "/package.json", icon: <FileTextIcon /> },
      {
        title: "src",
        key: "/src",
        icon: <CodeIcon className="text-neutral-500" />,
        selectable: false,
        children: [
          { title: "App.tsx", key: "/src/App.tsx", icon: <FileTextIcon /> },
          { title: "index.tsx", key: "/src/index.tsx", icon: <FileTextIcon /> },
        ],
      },
      { title: "tailwind.config.ts", key: "/tailwind.config.ts", icon: <FileTextIcon /> },
    ],
  },
];

// A tiny terminal parser for fake output
const runFakeCommand = (cmd: string): string => {
  if (!cmd.trim()) return "";
  switch (true) {
    case /^help$/.test(cmd):
      return "Available: help, ls, cat <file>, clear, build, dev, git status";
    case /^ls$/.test(cmd):
      return Object.keys(FILES).map((f) => f.slice(1)).join("\n");
    case /^cat\s+/.test(cmd): {
      const f = cmd.replace(/^cat\s+/, "").trim();
      return FILES["/" + f] ?? `cat: ${f}: No such file`;
    }
    case /^build$/.test(cmd):
      return "vite v5.0.0 building...\n✓ built in 456ms";
    case /^dev$/.test(cmd):
      return "Starting dev server on http://localhost:5173 ...";
    case /^git status$/.test(cmd):
      return "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean";
    case /^clear$/.test(cmd):
      return "__CLEAR__";
    default:
      return `command not found: ${cmd}`;
  }
};

export default function FakeVSCode() {
  const [openFiles, setOpenFiles] = useState<string[]>(["/README.md"]);
  const [activeFile, setActiveFile] = useState<string>("/README.md");
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "Welcome to Fake Terminal. Type 'help' to start.",
  ]);
  const [cmd, setCmd] = useState("");
  const [termHeight, setTermHeight] = useState(220);

  const items: MenuProps["items"] = [
    { key: "new", label: "New File" },
    { key: "folder", label: "New Folder" },
    { key: "sep", type: "divider" },
    { key: "rename", label: "Rename" },
  ];

  const tabItems = useMemo(
    () =>
      openFiles.map((path) => ({
        key: path,
        label: (
          <div className="flex items-center gap-2">
            <FileTextIcon />
            <span className="font-medium text-[13px]">{path.split("/").pop()}</span>
          </div>
        ),
        children: (
          <div className="h-full w-full overflow-auto">
            <pre className="min-h-[420px] whitespace-pre text-[13px] leading-6 p-5 font-mono bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-800 rounded-xl">
{FILES[path]}
            </pre>
          </div>
        ),
      })),
    [openFiles]
  );

  const onSelectFile = (keys: React.Key[]) => {
    const k = String(keys[0] ?? "");
    if (!k || !(k in FILES)) return;
    if (!openFiles.includes(k)) setOpenFiles((s) => [...s, k]);
    setActiveFile(k);
  };

  const onEditTab = (targetKey: any, action: "add" | "remove") => {
    if (action === "remove") {
      const next = openFiles.filter((k) => k !== targetKey);
      setOpenFiles(next);
      if (activeFile === targetKey) setActiveFile(next[0] ?? "");
    }
  };

  const runCommand = () => {
    const out = runFakeCommand(cmd);
    if (out === "__CLEAR__") {
      setTerminalLines([]);
    } else {
      setTerminalLines((prev) => [...prev, `> ${cmd}`, out]);
    }
    setCmd("");
  };

  return (
    <div className="w-full h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Tag color="blue" className="hidden sm:inline-flex">FAKE</Tag>
          <span className="font-semibold">Visual Code</span>
          <ChevronRightIcon className="opacity-50" />
          <span className="text-neutral-500">{activeFile || "No file"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              size="small"
              prefix={<MagnifyingGlassIcon />}
              placeholder="Search files..."
              className="w-[200px] md:w-[280px]"
            />
          </div>
          <Tooltip title="Run">
            <Button size="small" icon={<PlayIcon />}>Run</Button>
          </Tooltip>
          <Tooltip title="GitHub">
            <Button size="small" icon={<GitHubLogoIcon />} />
          </Tooltip>
          <Tooltip title="Settings">
            <Button size="small" icon={<GearIcon />} />
          </Tooltip>
        </div>
      </div>

      {/* Main area: 2 columns (Explorer | Right Pane) */}
      <div className="flex-1 grid" style={{ gridTemplateColumns: "280px 1fr", minHeight: 0 }}>
        {/* Explorer (full height) */}
        <div className="border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-2 sm:p-3 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-neutral-500">
              <CodeIcon /> Explorer
            </div>
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button size="small" icon={<PlusCircledIcon />}>New</Button>
            </Dropdown>
          </div>

          <Tree
            showIcon
            defaultExpandAll
            treeData={TREE}
            onSelect={onSelectFile}
            className="[&_.ant-tree-node-content-wrapper]:rounded-md"
          />
        </div>

        {/* Right Pane: Editor (top) + Terminal (bottom) */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          {/* Editor */}
          <div className="flex-1 p-2 sm:p-3 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="h-full w-full border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 flex flex-col min-h-0">
              {openFiles.length === 0 ? (
                <div className="flex-1 grid place-items-center text-neutral-500 text-sm">
                  Select a file from the left to open it.
                </div>
              ) : (
                <Tabs
                  type="editable-card"
                  hideAdd
                  size="small"
                  className="px-2 pt-2 min-h-0 flex-1"
                  items={tabItems}
                  onChange={(k) => setActiveFile(k)}
                  activeKey={activeFile}
                  onEdit={onEditTab as any}
                />
              )}
            </div>
          </div>

          {/* Drag handle to resize terminal */}
          <div
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={(e) => {
              const startY = e.clientY;
              const startH = termHeight;
              const onMove = (ev: MouseEvent) => {
                const dy = startY - ev.clientY;
                const next = Math.min(480, Math.max(140, startH + dy));
                setTermHeight(next);
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            className="h-2 cursor-row-resize bg-gradient-to-b from-transparent via-neutral-300/40 to-transparent dark:via-neutral-700/40"
          />

          {/* Terminal (fixed height at bottom) */}
          <div
            className="border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/60 overflow-hidden flex flex-col"
            style={{ height: termHeight }}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-neutral-500">
                <ChevronDownIcon /> Terminal
              </div>
              <div className="flex items-center gap-2">
                <Tag className="m-0" color="green">bash</Tag>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-3 pb-2">
              <pre className="whitespace-pre-wrap text-[13px] leading-6 font-mono text-neutral-800 dark:text-neutral-200">
                {terminalLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </pre>
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 p-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono text-neutral-500">user@web</span>
                <span className="text-[12px] font-mono text-neutral-500">$</span>
                <Input
                  value={cmd}
                  onChange={(e) => setCmd(e.target.value)}
                  onPressEnter={runCommand}
                  placeholder="Type a command (help, ls, cat README.md, clear, build, dev, git status)"
                  className="flex-1"
                />
                <Button onClick={runCommand} icon={<PlayIcon />}>Run</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
