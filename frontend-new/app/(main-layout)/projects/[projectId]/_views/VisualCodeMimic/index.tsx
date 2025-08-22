"use client";

import {
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import { Button, Dropdown, Input, Tree } from "antd";
import type { DataNode, TreeProps } from "antd/es/tree";
import { useState } from "react";

// --- Fake file system & content ---
const FILES: Record<string, string> = {
  "/README.md": `# Fake VS Code\n\nThis is a **fake** VS Code UI built with React, Tailwind, Radix Icons, and Ant Design.\n\n- Left: File Explorer (AntD Tree)\n- Center: Editor area shows ONE file\n- Bottom: Terminal\n`,
  "/src/App.tsx": `import React from 'react'\n\nexport default function App(){\n  return <div className=\"p-6 text-sky-500\">Hello from App.tsx</div>\n}`,
  "/src/index.tsx": `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App'\n\ncreateRoot(document.getElementById('root')!).render(<App />)`,
  "/package.json": `{
  \"name\": \"your-project\",\n  \"private\": true,\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"tsc && vite build\",\n    \"preview\": \"vite preview\"\n  }\n}`,
  "/tailwind.config.ts": `export default { content: [\"./index.html\", \"./src/**/*.{ts,tsx}\"], theme: { extend: {} }, plugins: [] }`,
};

const TREE: DataNode[] = [
  {
    title: "your-project",
    key: "/",
    // icon: <CodeIcon className="text-neutral-500" />,
    selectable: false,
    children: [
      { title: "README.md", key: "/README.md", icon: <FileTextIcon /> },
      { title: "package.json", key: "/package.json", icon: <FileTextIcon /> },
      {
        title: "src",
        key: "/src",
        // icon: <CodeIcon className="text-neutral-500" />,
        selectable: false,
        children: [
          { title: "App.tsx", key: "/src/App.tsx", icon: <FileTextIcon /> },
          { title: "index.tsx", key: "/src/index.tsx", icon: <FileTextIcon /> },
        ],
      },
      {
        title: "tailwind.config.ts",
        key: "/tailwind.config.ts",
        icon: <FileTextIcon />,
      },
    ],
  },
];

export default function FakeVSCodeSingleFile() {
  const [activeFile, setActiveFile] = useState<string>("/README.md");
  const [termHeight, setTermHeight] = useState(220);

  const items = [
    { key: "new", label: "New File" },
    { key: "folder", label: "New Folder" },
    { type: "divider" as const },
    { key: "rename", label: "Rename" },
  ];

  const onSelectFile: TreeProps["onSelect"] = (keys) => {
    const k = String(keys[0] ?? "");
    if (!k || !(k in FILES)) return;
    setActiveFile(k);
  };

  return (
    <div className="w-full h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Code Editor</span>
          {/* <ChevronRightIcon className="opacity-50" /> */}
          {/* <span className="text-neutral-500">{activeFile || "No file"}</span> */}
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
          {/* <Tooltip title="Run"><Button size="small" icon={<PlayIcon />}>Run</Button></Tooltip> */}
          {/* <Tooltip title="GitHub"><Button size="small" icon={<GitHubLogoIcon />} /></Tooltip> */}
          {/* <Tooltip title="Settings"><Button size="small" icon={<GearIcon />} /></Tooltip> */}
        </div>
      </div>

      {/* Main area: 2 columns (Explorer | Right Pane) */}
      <div
        className="flex-1 grid"
        style={{ gridTemplateColumns: "280px 1fr", minHeight: 0 }}
      >
        {/* Explorer (full height) */}
        <div className="border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-2 sm:p-3 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-neutral-500">
              Explorer
            </div>
            <Dropdown menu={{ items }} trigger={["click"]}>
              <Button size="small" icon={<PlusCircledIcon />}>
                New
              </Button>
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

        {/* Right Pane: Editor (single file) + Terminal */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          {/* Editor */}
          <div className="flex-1 p-0 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="h-full w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col min-h-0">
              {!activeFile ? (
                <div className="flex-1 grid place-items-center text-neutral-500 text-sm">
                  Select a file from the left to open it.
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 text-[13px]">
                    <div className="flex items-center gap-2">
                      <FileTextIcon />
                      <span className="font-medium">
                        {activeFile.split("/").pop()}
                      </span>
                      <span className="text-neutral-500">{activeFile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="small">Save</Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <pre className="min-h-[420px] h-full whitespace-pre text-[13px] leading-6 p-5 font-mono bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100">
                      {FILES[activeFile]}
                    </pre>
                  </div>
                </div>
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
        </div>
      </div>
    </div>
  );
}
