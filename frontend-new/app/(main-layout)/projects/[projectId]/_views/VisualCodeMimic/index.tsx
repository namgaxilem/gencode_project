"use client";

import { FolderOutlined } from "@ant-design/icons";
import {
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import { Button, Dropdown, Input, message, Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import type { DirectoryTreeProps } from "antd/es/tree/DirectoryTree";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFileIcon, guessLang } from "./_views/MonacoEditor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type WSAny = Record<string, any>;
type Item = {
  name: string;
  path: string;
  type: "dir" | "file";
  size?: number;
  mtime?: number;
};

const { DirectoryTree } = Tree;

/** ---------- Config ---------- */
const DEFAULT_EMAIL = "namgaxilem@gmail.com";

function computeWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8000/ws";
  const env = (process as any)?.env?.NEXT_PUBLIC_WS_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://localhost:8000/ws`;
}

/** ---------- Types & helpers ---------- */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type TreeNode = DataNode & {
  key: string;
  title: string;
  /** full path relative to workspace, e.g. "src/index.tsx", empty for root */
  path: string;
  dataType: "dir" | "file";
  isLeaf?: boolean;
  children?: TreeNode[];
};

const ROOT_KEY = "/";

/** Convert a flat list (immediate children) to DirectoryTree nodes */
function itemsToChildNodes(items: Item[]): TreeNode[] {
  return items.map((it) => {
    if (it.type === "dir") {
      return {
        key: `/${it.path}`,
        title: it.name,
        path: it.path,
        dataType: "dir",
        isLeaf: false,
        icon: <FolderOutlined />,
        selectable: false,
      } as TreeNode;
    }
    return {
      key: `/${it.path}`,
      title: it.name,
      path: it.path,
      dataType: "file",
      isLeaf: true,
      icon: getFileIcon(it.path), // ← here
      selectable: true,
    } as TreeNode;
  });
}
/** Immutable helper: replace children of a directory node by key */
function setChildrenForKey(
  tree: TreeNode[],
  key: string,
  children: TreeNode[]
): TreeNode[] {
  const walk = (nodes: TreeNode[]): TreeNode[] =>
    nodes.map((n) => {
      if (n.key === key) {
        return { ...n, children };
      }
      if (n.children?.length) {
        return { ...n, children: walk(n.children) };
      }
      return n;
    });
  return walk(tree);
}

/** ---------- Component ---------- */
export default function VisualCodeMimic({
  onPreviewUrl,
}: {
  onPreviewUrl?: (url: string) => void;
}) {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<number | null>(null);

  // DirectoryTree state
  const [treeData, setTreeData] = useState<TreeNode[]>([
    {
      key: ROOT_KEY,
      title: email || "workspace",
      path: "",
      dataType: "dir",
      isLeaf: false,
      selectable: false,
      icon: <FolderOutlined />,
      children: [], // lazy: load on expand
    },
  ]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([ROOT_KEY]);
  const loadedPathsRef = useRef<Set<string>>(new Set()); // tracks dirs already loaded

  // Editor
  const [activePath, setActivePath] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  // Dev/logs
  const [termHeight, setTermHeight] = useState(220);
  const [logs, setLogs] = useState<string[]>([]);
  const [devStatus, setDevStatus] = useState<"idle" | "starting" | "running">(
    "idle"
  );

  // WS plumbing
  const wsRef = useRef<WebSocket | null>(null);
  const pending = useRef(new Map<string, (msg: WSAny) => void>());
  const wsUrl = useMemo(() => computeWsUrl(), []);

  const editorRef = useRef<any>(null); // monaco editor instance
  const reloadTimersRef = useRef<Map<string, any>>(new Map()); // small debounce map

  function applyServerContent(next: string) {
    // Update React state
    setFileContent(next);
    setIsDirty(false);

    // Hard override Monaco model as well
    const editor = editorRef.current;
    const model = editor?.getModel?.();
    if (model) {
      const view = editor.saveViewState?.();
      model.setValue(next); // resets undo stack (true overwrite)
      if (view) editor.restoreViewState?.(view);
    }
  }

  function debounceKey(key: string, fn: () => void, ms = 120) {
    const m = reloadTimersRef.current;
    const t = m.get(key);
    if (t) clearTimeout(t);
    m.set(
      key,
      setTimeout(() => {
        m.delete(key);
        fn();
      }, ms)
    );
  }

  const activePathRef = useRef(activePath);
  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);

  /** ---- WS connect & handlers ---- */
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setConnected(true);
      if (email) {
        ws.send(JSON.stringify({ type: "init", email, req_id: uid() }));
      }
    });

    ws.addEventListener("message", (ev) => {
      let msg: WSAny;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }

      if (msg.req_id && pending.current.has(msg.req_id)) {
        const r = pending.current.get(msg.req_id)!;
        pending.current.delete(msg.req_id);
        r(msg);
      }

      switch (msg.type) {
        case "session_init":
          setSessionId(msg.session_id);
          break;

        case "init_ok":
          loadChildren(""); // initial tree
          break;

        case "dev_log":
          setLogs((prev) => {
            const next = [...prev, String(msg.line ?? "")];
            return next.length > 500 ? next.slice(-500) : next;
          });
          break;

        case "ping":
          setLastPing(Number(msg.ts) || Date.now());
          break;

        case "fs_batch": {
          const evs = (msg.events ?? []) as Array<{
            event: string;
            path: string;
            is_dir: boolean;
          }>;

          // optional: batch unique parents to avoid duplicate refresh work
          const parentsToRefresh = new Set<string>();

          for (const e of evs) {
            // collect parents for create/delete
            if (e.event === "created" || e.event === "deleted") {
              const parent = e.path.split("/").slice(0, -1).join("/");
              if (parent) {
                loadedPathsRef.current.delete(parent);
                parentsToRefresh.add(parent);
              }
            }

            // if the *currently open* file changed, reload it
            if (
              (e.event === "modified" || e.event === "created") &&
              e.path === activePathRef.current
            ) {
              debounceKey("file:" + e.path, () => readFile(e.path)); // ← pass e.path, not captured activePath
            }

            // if the active file was deleted, close it
            if (e.event === "deleted" && e.path === activePathRef.current) {
              setActivePath("");
              applyServerContent("");
            }
          }

          // do the parent refreshes once, debounced per parent
          parentsToRefresh.forEach((parent) => {
            debounceKey("tree:" + parent, () => loadChildren(parent));
          });

          break;
        }

        case "proxy_error":
          setLogs((p) => [...p, `proxy_error: ${msg.message}`]);
          break;

        default:
          // useful while wiring up new server events
          console.debug("[ws] unhandled message", msg);
      }
    });

    ws.addEventListener("close", () => {
      setConnected(false);
      setDevStatus("idle");
    });

    return () => {
      try {
        ws.close();
      } catch {}
      wsRef.current = null;
    };
  }, [wsUrl]);

  // re-bind when email changes
  useEffect(() => {
    if (connected && email) {
      send({ type: "init", email }).then(() => {
        // reset root title & clear cache
        setTreeData((prev) =>
          prev.map((n) =>
            n.key === ROOT_KEY
              ? { ...n, title: email || "workspace", children: [] }
              : n
          )
        );
        loadedPathsRef.current.clear();
        setExpandedKeys([ROOT_KEY]);
        loadChildren("");
      });
      localStorage.setItem("ws-email", email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, connected]);

  /** ---- WS request helper ---- */
  function send(payload: WSAny): Promise<WSAny> {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== ws.OPEN) {
        return reject(new Error("WebSocket not connected"));
      }
      const req_id = payload.req_id || uid();
      pending.current.set(req_id, resolve);
      ws.send(JSON.stringify({ ...payload, req_id }));
      setTimeout(() => {
        if (pending.current.has(req_id)) {
          pending.current.delete(req_id);
          reject(new Error("WS request timeout"));
        }
      }, 15000);
    });
  }

  /** ---- API wrappers ---- */
  async function listImmediate(path: string): Promise<Item[]> {
    // Use max_depth: 0 to fetch only immediate children of `path`
    const res = await send({ type: "list_tree", path, max_depth: 0 });
    if (res.type !== "list_tree_ok") {
      throw new Error(res.message || "list_tree error");
    }
    return (res.items as Item[]) || [];
  }

  async function loadChildren(parentPath: string) {
    if (loadedPathsRef.current.has(parentPath)) return;
    try {
      const items = await listImmediate(parentPath);
      const children = itemsToChildNodes(items);
      const parentKey = parentPath ? `/${parentPath}` : ROOT_KEY;
      setTreeData((prev) => setChildrenForKey(prev, parentKey, children));
      loadedPathsRef.current.add(parentPath);
    } catch (e: any) {
      message.error(e.message || "Load folder failed");
    }
  }

  async function readFile(path: string) {
    try {
      const res = await send({ type: "read_file", path });
      if (res.type === "read_file_ok") {
        setActivePath(path);
        setFileContent(String(res.content ?? ""));
        setIsDirty(false);
      } else {
        message.error(res.message || "read_file error");
      }
    } catch (e: any) {
      message.error(e.message || "read_file failed");
    }
  }

  async function writeFile() {
    if (!activePath) return;
    try {
      const res = await send({
        type: "write_file",
        path: activePath,
        content: fileContent,
        create_if_missing: true,
      });
      if (res.type === "write_file_ok") {
        setIsDirty(false);
        message.success("Saved");
        // refresh the parent folder of the saved file
        const parent = activePath.split("/").slice(0, -1).join("/");
        if (parent !== undefined) {
          // mark as not loaded to force refresh
          loadedPathsRef.current.delete(parent);
          await loadChildren(parent);
        }
      } else {
        message.error(res.message || "write_file error");
      }
    } catch (e: any) {
      message.error(e.message || "write_file failed");
    }
  }

  async function startDev() {
    try {
      setDevStatus("starting");
      const res = await send({ type: "start_dev" });
      if (res.type === "start_dev_ok") {
        setDevStatus(res.ok ? "running" : "starting");
        const base = res.preview_base || `/u/${res.session_id}/preview`; // server sends "/u/<sid>/preview"
        const apiOrigin = new URL(wsUrl.replace(/^ws/, "http")).origin; // "http://localhost:8000"
        onPreviewUrl?.(`${apiOrigin}${base}`);
      } else {
        setDevStatus("idle");
        message.error(res.message || "start_dev error");
      }
    } catch (e: any) {
      setDevStatus("idle");
      message.error(e.message || "start_dev failed");
    }
  }

  async function stopDev() {
    try {
      const res = await send({ type: "stop_dev" });
      if (res.type === "stop_dev_ok") {
        setDevStatus("idle");
        setLogs((p) => [...p, "— dev stopped —"]);
      } else {
        message.error(res.message || "stop_dev error");
      }
    } catch (e: any) {
      message.error(e.message || "stop_dev failed");
    }
  }

  /** ---- UI actions ---- */
  const menuItems = [
    {
      key: "new",
      label: "New File",
      onClick: async () => {
        const rel = prompt("Path (relative to workspace), e.g. src/new.ts:");
        if (!rel) return;
        try {
          const res = await send({
            type: "write_file",
            path: rel.replace(/^\/+/, ""),
            content: "",
            create_if_missing: true,
          });
          if (res.type === "write_file_ok") {
            // refresh parent folder and open file
            const parent = rel
              .replace(/^\/+/, "")
              .split("/")
              .slice(0, -1)
              .join("/");
            loadedPathsRef.current.delete(parent);
            await loadChildren(parent);
            await readFile(rel.replace(/^\/+/, ""));
          } else {
            message.error(res.message || "create failed");
          }
        } catch (e: any) {
          message.error(e.message || "create failed");
        }
      },
    },
  ];

  const onSelect: DirectoryTreeProps["onSelect"] = (_keys, info) => {
    const node = info.node as TreeNode;
    if (node?.dataType === "file") {
      readFile(node.path);
    }
  };

  const onLoadData: DirectoryTreeProps["loadData"] = async (node) => {
    const n = node as TreeNode;
    if (n.dataType === "file") return;
    await loadChildren(n.path); // loads immediate children
  };

  return (
    <div className="w-full h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Code Editor</span>
          {sessionId && (
            <span className="ml-2 text-xs text-neutral-500">
              session: {sessionId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            size="small"
            prefix={<MagnifyingGlassIcon />}
            placeholder="Email to bind workspace..."
            className="w-[220px] md:w-[280px]"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            onPressEnter={() => {
              if (!connected) return message.warning("WS not connected yet.");
              send({ type: "init", email }).then(() => {
                loadedPathsRef.current.clear();
                setExpandedKeys([ROOT_KEY]);
                loadChildren("");
              });
            }}
          />
          <Button
            size="small"
            onClick={() => {
              if (!connected) return message.warning("WS not connected yet.");
              send({ type: "init", email }).then(() => {
                loadedPathsRef.current.clear();
                setExpandedKeys([ROOT_KEY]);
                loadChildren("");
              });
            }}
          >
            Bind
          </Button>
        </div>
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
                      onMount={(editor, monaco) => {
                        editorRef.current = editor;
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
                          () => activePath && writeFile()
                        );
                      }}
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

          {/* Dev controls + Logs header */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70">
            <div className="text-xs text-neutral-500">
              {connected ? "WS connected" : "WS disconnected"}
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

          {/* Logs (resizable) */}
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
          <div
            className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 overflow-auto"
            style={{ height: termHeight }}
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
