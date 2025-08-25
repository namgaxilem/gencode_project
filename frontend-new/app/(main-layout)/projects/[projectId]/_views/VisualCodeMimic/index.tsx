"use client";

import { FileTextIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { Button, Dropdown, message, Tree } from "antd";
import type { DirectoryTreeProps } from "antd/es/tree/DirectoryTree";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { guessLang, useWorkspace } from "../WorkspaceProvider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});
const { DirectoryTree } = Tree;

export default function VisualCodeMimic() {
  const {
    // connection
    email,
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
    setIsDirty,
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

  // --- Monaco: Ctrl/Cmd + S → writeFile() ---
  const editorRef = useRef<any>(null);
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    saveRef.current = () => {
      if (activePath) writeFile();
    };
  }, [activePath, writeFile]);

  const onEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
      saveRef.current()
    );
    editor.addAction({
      id: "file-save",
      label: "Save",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => saveRef.current(),
    });
  };

  // optional: suppress browser "Save page" if Monaco focused
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        const node = editorRef.current?.getDomNode?.();
        if (node && node.contains(document.activeElement)) {
          e.preventDefault();
          saveRef.current();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // --- New File menu: create file by saving empty content, then open it
  const menuItems = [
    {
      key: "new",
      label: "New File",
      onClick: async () => {
        const relRaw = prompt("Path (relative to workspace), e.g. src/new.ts:");
        const rel = (relRaw || "").replace(/^\/+/, "").trim();
        if (!rel) return;
        try {
          // set active path, empty content, save -> creates file
          setActivePath(rel);
          setFileContent("");
          setIsDirty(true);
          await writeFile();

          // refresh parent & open file (read again to be safe)
          const parent = rel.split("/").slice(0, -1).join("/");
          if (parent) await loadChildren(parent);
          await readFile(rel);
          message.success("File created");
        } catch (e: any) {
          message.error(e.message || "Create failed");
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
    <div className="w-full h-full min-h-0 bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Code Editor</span>
        </div>
      </div>

      {/* Main area */}
      <div
        className="flex-1 grid min-h-0"
        style={{ gridTemplateColumns: "280px 1fr" }}
      >
        {/* Explorer */}
        <div className="min-w-0 overflow-hidden border-r border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 p-2 sm:p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-wide text-neutral-500">
              Explorer
            </div>

            <div>
              <Button onClick={() => loadChildren("")}>Refresh</Button>
              <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                <Button size="small" icon={<PlusCircledIcon />}>
                  New
                </Button>
              </Dropdown>
            </div>
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
        <div className="min-w-0 overflow-hidden flex flex-col min-h-0">
          {/* Editor */}
          <div className="flex-1 p-0 overflow-hidden min-h-0">
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

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <MonacoEditor
                      key={activePath}
                      path={activePath || "untitled"}
                      language={guessLang(activePath)}
                      value={fileContent}
                      onMount={onEditorMount}
                      onChange={(v) => {
                        setFileContent(v ?? "");
                        setIsDirty(true);
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
