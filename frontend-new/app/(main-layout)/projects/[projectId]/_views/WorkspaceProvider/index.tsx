"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { message } from "antd";
import type { DataNode } from "antd/es/tree";
import { getFileIcon } from "../VisualCodeMimic/utils";
import { useParams } from "next/navigation";

type WSAny = Record<string, any>;
type Item = {
  name: string;
  path: string;
  type: "dir" | "file";
  size?: number;
  mtime?: number;
};

type TreeNode = DataNode & {
  key: string;
  title: string;
  path: string; // path relative to workspace, e.g. "src/index.tsx"
  dataType: "dir" | "file";
  isLeaf?: boolean;
  children?: TreeNode[];
};

const ROOT_KEY = "/";
const DEFAULT_EMAIL = "namgaxilem@gmail.com";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeHost(url: string) {
  try {
    const u = new URL(url);
    // Replace 127.0.0.1/localhost with current page hostname
    if (
      u.hostname === "127.0.0.1" ||
      u.hostname === "localhost" ||
      u.hostname === "::1"
    ) {
      u.hostname = window.location.hostname;
    }
    return u.toString();
  } catch {
    return url;
  }
}

function computeWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8000/ws";
  const env = (process as any)?.env?.NEXT_PUBLIC_WS_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://localhost:8000/ws`;
}

export function guessLang(path: string) {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    vue: "vue",
    py: "python",
    java: "java",
    kt: "kotlin",
    go: "go",
    rs: "rust",
    yml: "yaml",
    yaml: "yaml",
  };
  return map[ext ?? ""] ?? "plaintext";
}

function itemsToChildNodes(items: Item[]): TreeNode[] {
  return items.map((it) =>
    it.type === "dir"
      ? ({
          key: `/${it.path}`,
          title: it.name,
          path: it.path,
          dataType: "dir",
          isLeaf: false,
          selectable: false,
          icon: null,
        } as TreeNode)
      : ({
          key: `/${it.path}`,
          title: it.name,
          path: it.path,
          dataType: "file",
          isLeaf: true,
          icon: getFileIcon(it.path),
          selectable: true,
        } as TreeNode)
  );
}

function setChildrenForKey(
  tree: TreeNode[],
  key: string,
  freshChildren: TreeNode[]
): TreeNode[] {
  const walk = (nodes: TreeNode[]): TreeNode[] =>
    nodes.map((n) => {
      if (n.key === key) {
        const prevKids: TreeNode[] = Array.isArray(n.children)
          ? (n.children as TreeNode[])
          : [];
        const prevByKey = new Map(prevKids.map((c) => [c.key, c]));

        const merged: TreeNode[] = freshChildren.map((child) => {
          const prev = prevByKey.get(child.key);
          // If this child is a directory and we had its subtree loaded, keep it
          if (
            prev &&
            prev.dataType === "dir" &&
            Array.isArray(prev.children) &&
            prev.children.length > 0
          ) {
            return { ...child, children: prev.children };
          }
          return child;
        });

        return { ...n, children: merged };
      }
      if (Array.isArray(n.children) && n.children.length > 0) {
        return { ...n, children: walk(n.children as TreeNode[]) };
      }
      return n;
    });

  return walk(tree);
}

/* ---------------------------------------- */
/*               CONTEXT API                */
/* ---------------------------------------- */

type DevStatus = "idle" | "starting" | "running";

type WorkspaceContextType = {
  // connection/session
  email: string;
  setEmail: (v: string) => void;
  connected: boolean;
  sessionId: string | null;

  // preview
  previewUrl: string | null;

  // tree + file editor
  treeData: TreeNode[];
  setExpandedKeys: (keys: React.Key[]) => void;
  expandedKeys: React.Key[];
  loadChildren: (parentPath: string) => Promise<void>;
  readFile: (path: string) => Promise<void>;
  writeFile: () => Promise<void>;
  activePath: string;
  setActivePath: (p: string) => void;
  fileContent: string;
  setFileContent: (s: string) => void;
  isDirty: boolean;
  setIsDirty: (s: boolean) => void;

  // dev/logs
  startDev: () => Promise<void>;
  stopDev: () => Promise<void>;
  devStatus: DevStatus;
  logs: string[];
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used within <WorkspaceProvider>");
  return ctx;
};

export default function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { projectId } = useParams<{
    projectId: string;
  }>();
  const wsUrl = useMemo(() => computeWsUrl(), []);
  const wsRef = useRef<WebSocket | null>(null);
  const pending = useRef(new Map<string, (msg: WSAny) => void>());

  // connection/session
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // tree
  const [treeData, setTreeData] = useState<TreeNode[]>([
    {
      key: ROOT_KEY,
      title: email || "workspace",
      path: "",
      dataType: "dir",
      isLeaf: false,
      selectable: false,
      icon: null,
      children: [],
    },
  ]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([ROOT_KEY]);
  const loadedPathsRef = useRef<Set<string>>(new Set());

  // editor
  const [activePath, setActivePath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // dev/logs
  const [devStatus, setDevStatus] = useState<DevStatus>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const activePathRef = useRef(activePath);
  useEffect(() => {
    activePathRef.current = activePath;
  }, [activePath]);

  /* ------------ ws send ------------ */
  const send = useCallback((payload: WSAny): Promise<WSAny> => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== ws.OPEN)
        return reject(new Error("WebSocket not connected"));
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
  }, []);

  /* ------------ ws lifecycle ------------ */
  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          type: "init",
          email,
          project_id: projectId,
          req_id: uid(),
        })
      );
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
          // refresh root
          loadedPathsRef.current.clear();
          setTreeData((prev) =>
            prev.map((n) =>
              n.key === ROOT_KEY
                ? { ...n, title: email || "workspace", children: [] }
                : n
            )
          );
          setExpandedKeys([ROOT_KEY]);
          loadChildren("");
          break;

        case "dev_log":
          setLogs((prev) => {
            const next = [...prev, String(msg.line ?? "")];
            return next.length > 500 ? next.slice(-500) : next;
          });
          break;

        case "dev_url":
          setPreviewUrl(normalizeHost(msg.url));
          break;

        case "start_dev_ok":
          // (Optional server-side event) — we still set preview in startDev()
          break;

        case "fs_batch": {
          const evs = (msg.events ?? []) as Array<{
            event: string;
            path: string;
            is_dir: boolean;
          }>;
          const parentsToRefresh = new Set<string>();
          for (const e of evs) {
            if (e.event === "created" || e.event === "deleted") {
              const parent = e.path.split("/").slice(0, -1).join("/");
              if (parent) {
                loadedPathsRef.current.delete(parent);
                parentsToRefresh.add(parent);
              }
            }
            if (
              (e.event === "modified" || e.event === "created") &&
              e.path === activePathRef.current
            ) {
              readFile(e.path);
            }
            if (e.event === "deleted" && e.path === activePathRef.current) {
              setActivePath("");
              setFileContent("");
              setIsDirty(false);
            }
          }
          parentsToRefresh.forEach((parent) => loadChildren(parent));
          break;
        }

        default:
          // console.debug("[ws] unhandled", msg);
          break;
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
  }, [wsUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ------------ API wrappers ------------ */
  const listImmediate = useCallback(
    async (path: string): Promise<Item[]> => {
      const res = await send({ type: "list_tree", path, max_depth: 0 });
      console.log(111, res);
      if (res.type !== "list_tree_ok")
        throw new Error(res.message || "list_tree error");
      return (res.items as Item[]) || [];
    },
    [send]
  );

  const loadChildren = useCallback(
    async (parentPath: string) => {
      // if (loadedPathsRef.current.has(parentPath)) {
      //   return;
      // }
      try {
        const items = await listImmediate(parentPath);
        const children = itemsToChildNodes(items);
        const parentKey = parentPath ? `/${parentPath}` : ROOT_KEY;
        setTreeData((prev) => setChildrenForKey(prev, parentKey, children));
        loadedPathsRef.current.add(parentPath);
      } catch (e: any) {
        message.error(e.message || "Load folder failed");
      }
    },
    [listImmediate]
  );

  const readFile = useCallback(
    async (path: string) => {
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
    },
    [send]
  );

  const writeFile = useCallback(async () => {
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
        const parent = activePath.split("/").slice(0, -1).join("/");
        if (parent !== undefined) {
          loadedPathsRef.current.delete(parent);
          await loadChildren(parent);
        }
      } else {
        message.error(res.message || "write_file error");
      }
    } catch (e: any) {
      message.error(e.message || "write_file failed");
    }
  }, [activePath, fileContent, loadChildren, send]);

  const startDev = useCallback(async () => {
    try {
      setDevStatus("starting");
      const res = await send({ type: "start_dev" });
      if (res.type === "start_dev_ok") {
        setDevStatus(res.ok ? "running" : "starting");
        // prefer server's dev_url if available
        const devUrl: string | undefined = res.dev_url || res.preview_base;
        if (devUrl) setPreviewUrl(normalizeHost(devUrl));
        if (devUrl?.startsWith("http")) {
          setPreviewUrl(devUrl);
        } else if (res.preview_base) {
          const apiOrigin = new URL(wsUrl.replace(/^ws/, "http")).origin;
          setPreviewUrl(`${apiOrigin}${res.preview_base}`);
        }
      } else {
        setDevStatus("idle");
        message.error(res.message || "start_dev error");
      }
    } catch (e: any) {
      setDevStatus("idle");
      message.error(e.message || "start_dev failed");
    }
  }, [send, wsUrl]);

  const stopDev = useCallback(async () => {
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
  }, [send]);

  const value: WorkspaceContextType = {
    // connection
    email,
    setEmail,
    connected,
    sessionId,
    // preview
    previewUrl,
    // tree + files
    treeData,
    setExpandedKeys,
    expandedKeys,
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
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
