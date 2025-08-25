"use client";

import {
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import { Button, Dropdown, Input, message, Tree } from "antd";
import type { DirectoryTreeProps } from "antd/es/tree/DirectoryTree";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { guessLang, useWorkspace } from "../WorkspaceProvider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});
const { DirectoryTree } = Tree;

export default function VisualCodeMimic() {
  const {
    // connection
    email,
    setEmail,
    connected,
    // tree + files
    treeData,
    expandedKeys,
    setExpandedKeys,
    loadChildren,
    readFile,
    writeFile,
    activePath,
    setActivePath,
    fileContent,
    setFileContent,
    isDirty,
    // dev/logs
    startDev,
    stopDev,
    devStatus,
    logs,
  } = useWorkspace();

  // initial root fetch
  useEffect(() => {
    loadChildren("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const menuItems = [
    {
      key: "new",
      label: "New File",
      onClick: async () => {
        const rel = prompt("Path (relative to workspace), e.g. src/new.ts:");
        if (!rel) return;
        try {
          // quick create via write then refresh parent and open
          const res = await (async () => {
            // We’ll reuse write endpoint via read/write combo
            // Minimal inline call: you can also expose createFile() in the provider.
            try {
              const wsRes = await (window as any).noop; // placeholder to keep types happy
            } catch {}
          })();
          // Instead, better: expose a `send` helper in provider if needed.
          message.info(
            "Use provider.send({type:'write_file', ...}) or add createFile() to provider."
          );
        } catch (e: any) {
          message.error(e.message || "create failed");
        }
      },
    },
  ];

  const onSelect: DirectoryTreeProps["onSelect"] = (_keys, info) => {
    const node: any = info.node;
    if (node?.dataType === "file") readFile(node.path);
  };

  const onLoadData: DirectoryTreeProps["loadData"] = async (node) => {
    const n: any = node;
    if (n.dataType === "file") return;
    await loadChildren(n.path);
  };

  return (
    <div className="w-full h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Code Editor</span>
        </div>
        {/* <div className="flex items-center gap-2">
          <Input
            size="small"
            prefix={<MagnifyingGlassIcon />}
            placeholder="Email to bind workspace..."
            className="w-[220px] md:w-[280px]"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            onPressEnter={() => connected && loadChildren("")}
          />
          <Button size="small" onClick={() => connected && loadChildren("")}>
            Bind
          </Button>
        </div> */}
      </div>

      {/* Main area */}
      <div
        className="flex-1 grid"
        style={{ gridTemplateColumns: "280px 1fr", minHeight: 0 }}
      >
        {/* Explorer */}
        <div className="border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-2 sm:p-3 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-neutral-500">
              Explorer
            </div>
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Button size="small" icon={<PlusCircledIcon />}>
                New
              </Button>
            </Dropdown>
          </div>

          <DirectoryTree
            showIcon
            multiple={false}
            expandAction="doubleClick"
            treeData={treeData}
            onSelect={onSelect}
            loadData={onLoadData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            className="[&_.ant-tree-node-content-wrapper]:rounded-md"
          />
        </div>

        {/* Right Pane: Editor + Dev controls + Logs */}
        <div className="flex flex-col" style={{ minHeight: 0 }}>
          {/* Editor */}
          <div className="flex-1 p-0 overflow-hidden" style={{ minHeight: 0 }}>
            <div className="h-full w-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col min-h-0">
              {!activePath ? (
                <div className="flex-1 grid place-items-center text-neutral-500 text-sm px-6">
                  Select a file from the left to open it.
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 text-[13px]">
                    <div className="flex items-center gap-2">
                      <FileTextIcon />
                      <span className="font-medium">
                        {activePath.split("/").pop()}
                        {isDirty ? "*" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="small"
                        onClick={writeFile}
                        disabled={!activePath}
                      >
                        {isDirty ? "Save *" : "Save"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <MonacoEditor
                      key={activePath}
                      path={activePath || "untitled"}
                      language={guessLang(activePath)}
                      value={fileContent}
                      onChange={(v) => {
                        setFileContent(v ?? "");
                        // mark dirty (provider exposes setter)
                        // alternatively: expose setIsDirty in provider if you want fine control
                      }}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dev controls + Logs */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70">
            <div className="text-xs text-neutral-500">
              {connected ? "WS connected" : "WS disconnected"}{" "}
              {email ? ` · ${email}` : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                onClick={startDev}
                disabled={devStatus === "running"}
              >
                Start Dev
              </Button>
              <Button
                size="small"
                onClick={stopDev}
                disabled={devStatus === "idle"}
              >
                Stop Dev
              </Button>
            </div>
          </div>

          {/* Logs */}
          <div
            className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-auto"
            style={{ height: 220 }}
          >
            <pre className="text-[12px] leading-5 p-3 font-mono">
              {logs.length
                ? logs.join("\n")
                : "Logs will appear here (start_dev to stream) ..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
